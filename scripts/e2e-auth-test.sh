#!/usr/bin/env bash
# E2E verification for P0 auth + point-economy hardening.
# Requires the dev server on :3000 with a seeded PGlite database.
set -u
BASE=${BASE:-http://127.0.0.1:3000}
J=/tmp/cookies
mkdir -p $J
PASS=0; FAIL=0

ok()   { PASS=$((PASS+1)); echo "  ✅ $1"; }
bad()  { FAIL=$((FAIL+1)); echo "  ❌ $1"; }
check(){ # description expected actual
  if [ "$2" == "$3" ]; then ok "$1"; else bad "$1 (expected=$2 got=$3)"; fi
}

echo "== 1. Bootstrap seeding =="
R=$(curl -s -X POST $BASE/api/bootstrap); S=$(echo "$R" | jq -r '.success')
check "fresh bootstrap seeds DB" "true" "$S"
sleep 2  # seeding continues in ensureNewFeaturesSeeded

R=$(curl -s -X POST $BASE/api/bootstrap); C=$(echo "$R" | jq -r '.error' )
check "second bootstrap blocked (not admin)" "Bootstrap is admin-only once the database is seeded." "$C"

echo "== 2. Login / session =="
curl -s -c $J/elena -X POST $BASE/api/auth/login -H 'Content-Type: application/json' \
  -d '{"username":"elena_tech","password":"password123"}' > /tmp/login_elena.json
N=$(jq -r '.user.name' /tmp/login_elena.json); check "elena login" "Elena Rostova" "$N"
H=$(jq -r '.cookie' /tmp/login_elena.json 2>/dev/null)
grep -q vp_session $J/elena && ok "session cookie set" || bad "session cookie set"

# Deterministic points math: disable any active flash-event multiplier for the
# duration of the test (the seed activates a 2X event). Restored at the end.
curl -s -c $J/admin -X POST $BASE/api/auth/login -H 'Content-Type: application/json' \
  -d '{"username":"admin_maya","password":"password123"}' > /dev/null
ACTIVE_EVENT_ID=$(curl -s $BASE/api/admin/events | jq -r '[.events[] | select(.isActive)][0].id // empty')
if [ -n "${ACTIVE_EVENT_ID:-}" ]; then
  curl -s -b $J/admin -X POST $BASE/api/admin/events -H 'Content-Type: application/json' \
    -d "{\"action\":\"toggle\",\"id\":$ACTIVE_EVENT_ID,\"isActive\":false}" > /dev/null
fi

curl -s -X POST $BASE/api/auth/login -H 'Content-Type: application/json' \
  -d '{"username":"elena_tech","password":"wrongpass"}' > /tmp/badlogin.json
check "wrong password -> generic 401 msg" "Invalid username or password." "$(jq -r '.error' /tmp/badlogin.json)"

R=$(curl -s -b $J/elena $BASE/api/auth/me); check "auth/me as elena" "elena_tech" "$(echo "$R" | jq -r '.user.username')"
R=$(curl -s $BASE/api/auth/me); check "auth/me anonymous -> 401" "Not signed in." "$(echo "$R" | jq -r '.error')"
R=$(curl -s $BASE/api/users); echo "$R" | jq -e '.users[0] | has("passwordHash")' >/dev/null && bad "users list leaks passwordHash" || ok "users list has no passwordHash"

echo "== 3. Spoofing defense =="
curl -s -c $J/marcus -X POST $BASE/api/auth/login -H 'Content-Type: application/json' \
  -d '{"username":"marcus_dev","password":"password123"}' > /dev/null
MARCUS_ID=$(curl -s -b $J/marcus $BASE/api/auth/me | jq '.user.id')
ELENA_ID=$(curl -s -b $J/elena $BASE/api/auth/me | jq '.user.id')
# Create a post as elena
curl -s -b $J/elena -X POST $BASE/api/posts -H 'Content-Type: application/json' \
  -d '{"title":"E2E hardening post","content":"Testing session auth & caps","category":"General"}' > /tmp/post.json
PT=$(jq -r '.post.title' /tmp/post.json); PA=$(jq -r '.post.authorUsername' /tmp/post.json)
check "post created via session" "E2E hardening post" "$PT"
check "post author = session user" "elena_tech" "$PA"
POST_ID=$(jq '.post.id' /tmp/post.json)
# Spoof attempt: marcus cookie but body claims userId = elena — server must ignore it
curl -s -b $J/marcus -X POST $BASE/api/interactions -H 'Content-Type: application/json' \
  -d "{\"action\":\"comment\",\"postId\":$POST_ID,\"userId\":$ELENA_ID,\"content\":\"spoof attempt\"}" > /tmp/spoof.json
check "body userId ignored (comment by session user)" "marcus_dev" "$(jq -r '.comment.authorUsername' /tmp/spoof.json)"

echo "== 4. Reaction rules =="
# marcus reacts to elena's post
curl -s -b $J/marcus -X POST $BASE/api/interactions -H 'Content-Type: application/json' \
  -d "{\"action\":\"react\",\"postId\":$POST_ID,\"reactionType\":\"fire\"}" > /tmp/r1.json
check "first reaction earns points" "10" "$(jq -r '.reward.pointsAwarded' /tmp/r1.json)"
# second reaction -> update only, no points
curl -s -b $J/marcus -X POST $BASE/api/interactions -H 'Content-Type: application/json' \
  -d "{\"action\":\"react\",\"postId\":$POST_ID,\"reactionType\":\"love\"}" > /tmp/r2.json
check "re-react -> update no points" "null" "$(jq -r '.reward' /tmp/r2.json)"
# elena self-reaction -> no points
curl -s -b $J/elena -X POST $BASE/api/interactions -H 'Content-Type: application/json' \
  -d "{\"action\":\"react\",\"postId\":$POST_ID,\"reactionType\":\"like\"}" > /tmp/r3.json
check "self-reaction earns nothing" "null" "$(jq -r '.reward' /tmp/r3.json)"

echo "== 5. Daily cap enforcement (comment cap=150, +25 each) =="
# devon comments on the post 8 times => 6x25=150 then cap
curl -s -c $J/devon -X POST $BASE/api/auth/login -H 'Content-Type: application/json' \
  -d '{"username":"devon_w","password":"password123"}' > /dev/null
CAP_HIT="no"
for i in 1 2 3 4 5 6 7 8; do
  curl -s -b $J/devon -X POST $BASE/api/interactions -H 'Content-Type: application/json' \
    -d "{\"action\":\"comment\",\"postId\":$POST_ID,\"content\":\"cap test comment $i\"}" > /tmp/cap_$i.json
done
SIX=$(jq -r '.reward.pointsAwarded' /tmp/cap_6.json)
SEVEN=$(jq -r '.reward.pointsAwarded' /tmp/cap_7.json)
SEVEN_MSG=$(jq -r '.reward.message' /tmp/cap_7.json)
check "6th comment still +25 (150 total)" "25" "$SIX"
check "7th comment capped at 0" "0" "$SEVEN"
echo "$SEVEN_MSG" | grep -q "Daily cap reached" && ok "cap message surfaced" || bad "cap message surfaced ($SEVEN_MSG)"

echo "== 6. Poll: one vote per user =="
curl -s -b $J/elena -X POST $BASE/api/posts -H 'Content-Type: application/json' \
  -d '{"title":"E2E poll","content":"best color?","category":"General","pollQuestion":"best color?","pollOptions":["red","blue"]}' > /tmp/poll.json
POLL_ID=$(jq '.post.id' /tmp/poll.json)
# marcus votes red
curl -s -b $J/marcus -X POST $BASE/api/interactions -H 'Content-Type: application/json' \
  -d "{\"action\":\"vote_poll\",\"postId\":$POLL_ID,\"option\":\"red\"}" > /tmp/v1.json
check "first poll vote ok" "1" "$(jq -r '.pollVotes.red' /tmp/v1.json)"
# marcus votes red again -> 400
C=$(curl -s -o /tmp/v2.json -w "%{http_code}" -b $J/marcus -X POST $BASE/api/interactions -H 'Content-Type: application/json' \
  -d "{\"action\":\"vote_poll\",\"postId\":$POLL_ID,\"option\":\"red\"}")
check "duplicate poll vote rejected (400)" "400" "$C"
# marcus switches to blue -> allowed, no points
curl -s -b $J/marcus -X POST $BASE/api/interactions -H 'Content-Type: application/json' \
  -d "{\"action\":\"vote_poll\",\"postId\":$POLL_ID,\"option\":\"blue\"}" > /tmp/v3.json
check "vote change ok, blue:1 red:0" "0 1" "$(jq -r '"\(.pollVotes.red) \(.pollVotes.blue)"' /tmp/v3.json)"
check "vote change no points" "null" "$(jq -r '.reward' /tmp/v3.json)"

echo "== 7. Admin protection =="
RULE_ID=$(curl -s $BASE/api/admin/rules | jq '.rules[0].id')
C=$(curl -s -X PUT $BASE/api/admin/rules -H 'Content-Type: application/json' -d "{\"id\":$RULE_ID,\"name\":\"x\",\"description\":\"y\",\"points\":1,\"isActive\":true}" -o /dev/null -w "%{http_code}")
check "rules PUT anonymous -> 401" "401" "$C"
C=$(curl -s -b $J/elena -X PUT $BASE/api/admin/rules -H 'Content-Type: application/json' -d "{\"id\":$RULE_ID,\"name\":\"x\",\"description\":\"y\",\"points\":1,\"isActive\":true}" -o /dev/null -w "%{http_code}")
check "rules PUT as non-admin -> 403" "403" "$C"
R=$(curl -s -b $J/admin -X POST $BASE/api/bootstrap)
check "admin can re-bootstrap" "true" "$(echo "$R" | jq -r '.success')"
C=$(curl -s -b $J/admin -X PUT $BASE/api/admin/rules -H 'Content-Type: application/json' \
  -d "{\"id\":$RULE_ID,\"name\":\"Publish Community Post\",\"description\":\"restored\",\"points\":50,\"isActive\":true,\"dailyCap\":250}" -o /dev/null -w "%{http_code}")
check "rules PUT as admin -> 200" "200" "$C"
C=$(curl -s -b $J/elena -X POST $BASE/api/admin/events -H 'Content-Type: application/json' -d '{"action":"toggle","id":1,"isActive":true}' -o /dev/null -w "%{http_code}")
check "events POST as non-admin -> 403" "403" "$C"

echo "== 8. Register + referral attribution =="
ELENA_BEFORE=$(curl -s -b $J/elena $BASE/api/auth/me | jq '.user.totalPoints')
curl -s -c $J/newbie -X POST $BASE/api/auth/register -H 'Content-Type: application/json' \
  -d '{"name":"E2E Newbie","username":"e2e_newbie","password":"newbiepass1","referralCode":"ELENA_PULSE_2026"}' > /tmp/reg.json
check "register returns user" "e2e_newbie" "$(jq -r '.user.username' /tmp/reg.json)"
check "register sets referral attribution flag" "true" "$(jq -r '.referralAttributed' /tmp/reg.json)"
NEWBIE_PTS=$(jq '.user.totalPoints' /tmp/reg.json)
check "newbie has 0 pts at register" "0" "$NEWBIE_PTS"
sleep 0.3
NEWBIE_AFTER=$(curl -s -b $J/newbie $BASE/api/auth/me | jq '.user.totalPoints')
check "welcome bonus +50 applied" "50" "$NEWBIE_AFTER"
ELENA_AFTER=$(curl -s -b $J/elena $BASE/api/auth/me | jq '.user.totalPoints')
EXPECTED=$((ELENA_BEFORE + 200))
check "referrer elena got +200" "$EXPECTED" "$ELENA_AFTER"
C=$(curl -s -o /tmp/dupreg.json -w "%{http_code}" -X POST $BASE/api/auth/register -H 'Content-Type: application/json' \
  -d '{"name":"Dupe","username":"e2e_newbie","password":"whateverpass"}')
check "duplicate username -> 409" "409" "$C"
C=$(curl -s -o /dev/null -w "%{http_code}" -X POST $BASE/api/auth/register -H 'Content-Type: application/json' \
  -d '{"name":"Short Pass","username":"shortp","password":"short"}')
check "short password rejected" "400" "$C"

echo "== 9. Streak check-in once per day =="
R1=$(curl -s -b $J/newbie -X POST $BASE/api/quests -H 'Content-Type: application/json' -d '{"action":"streak_checkin"}')
check "first check-in ok (streak 1)" "1" "$(echo "$R1" | jq -r '.newStreak')"
R2=$(curl -s -b $J/newbie -X POST $BASE/api/quests -H 'Content-Type: application/json' -d '{"action":"streak_checkin"}')
check "second check-in same day rejected" "false" "$(echo "$R2" | jq -r '.success')"

echo "== 10. Rewards: session-only redeem =="
NEWBIE_PTS_NOW=$(curl -s -b $J/newbie $BASE/api/auth/me | jq '.user.totalPoints')
NEWBIE_AFFORD=$(curl -s $BASE/api/rewards | jq "[.rewards[] | select(.costPoints <= $NEWBIE_PTS_NOW)] | length")
C=$(curl -s -o /dev/null -w "%{http_code}" -X POST $BASE/api/rewards -H 'Content-Type: application/json' \
  -d "{\"userId\":$MARCUS_ID,\"rewardId\":1}")
check "anonymous redeem (spoofed body) -> 401" "401" "$C"
if [ "$NEWBIE_AFFORD" == "0" ]; then
  R=$(curl -s -b $J/newbie -X POST $BASE/api/rewards -H 'Content-Type: application/json' -d "{\"rewardId\":1}")
  check "over-budget redeem blocked w/ balance msg" "false" "$(echo "$R" | jq -r '.success')"
else
  R=$(curl -s -b $J/newbie -X POST $BASE/api/rewards -H 'Content-Type: application/json' -d "{\"rewardId\":$(curl -s $BASE/api/rewards | jq "[.rewards[] | select(.costPoints <= $NEWBIE_PTS_NOW)][0].id")}")
  echo "$R" | jq -e '.success' >/dev/null && ok "newbie redeemed own points" || bad "newbie redeemed own points"
fi
ELENA_BEFORE_R=$(curl -s -b $J/elena $BASE/api/auth/me | jq '.user.totalPoints')
CHEAPEST=$(curl -s $BASE/api/rewards | jq '[.rewards | sort_by(.costPoints)[0]][0].id')
CHEAPEST_COST=$(curl -s $BASE/api/rewards | jq '[.rewards | sort_by(.costPoints)[0]][0].costPoints')
R=$(curl -s -b $J/elena -X POST $BASE/api/rewards -H 'Content-Type: application/json' -d "{\"rewardId\":$CHEAPEST}")
check "elena redeem ok" "$((ELENA_BEFORE_R - CHEAPEST_COST))" "$(echo "$R" | jq -r '.newTotalPoints')"

echo "== 11. Referrals: session-bound invite + ownership =="
R=$(curl -s -b $J/elena -X POST $BASE/api/referrals -H 'Content-Type: application/json' \
  -d '{"action":"invite","email":"friend@example.com","name":"Friend"}')
REF_ID=$(echo "$R" | jq '.referral.id')
check "invite created for session user" "$ELENA_ID" "$(echo "$R" | jq -r '.referral.referrerId')"
# ownership attack: marcus tries to simulate elena's pending invite
C=$(curl -s -o /tmp/steal.json -w "%{http_code}" -b $J/marcus -X POST $BASE/api/referrals -H 'Content-Type: application/json' \
  -d "{\"action\":\"simulate_signup\",\"referralId\":$REF_ID}")
check "cannot convert someone else's invite -> 403" "403" "$C"
R=$(curl -s -b $J/elena -X POST $BASE/api/referrals -H 'Content-Type: application/json' \
  -d "{\"action\":\"simulate_signup\",\"referralId\":$REF_ID}")
check "owner can convert own invite" "true" "$(echo "$R" | jq -r '.success')"
C=$(curl -s -o /dev/null -w "%{http_code}" -b $J/marcus -X POST $BASE/api/referrals -H 'Content-Type: application/json' \
  -d '{"action":"invite","email":"not-an-email"}')
check "invalid email rejected" "400" "$C"

echo "== 12. Rate limiting =="
TOO_MANY=0
for i in $(seq 1 95); do
  C=$(curl -s -o /dev/null -w "%{http_code}" -b $J/marcus -X POST $BASE/api/chat -H 'Content-Type: application/json' \
    -d '{"action":"send","groupId":1,"content":"rl"}')
  if [ "$C" == "429" ]; then TOO_MANY=1; break; fi
done
check "chat rate limit kicks in (429)" "1" "$TOO_MANY"

# Restore the flash event we disabled at the start
if [ -n "${ACTIVE_EVENT_ID:-}" ]; then
  curl -s -b $J/admin -X POST $BASE/api/admin/events -H 'Content-Type: application/json' \
    -d "{\"action\":\"toggle\",\"id\":$ACTIVE_EVENT_ID,\"isActive\":true}" > /dev/null
fi

echo ""
echo "==================================="
echo "RESULT: $PASS passed, $FAIL failed"
exit $([ $FAIL -eq 0 ] && echo 0 || echo 1)
