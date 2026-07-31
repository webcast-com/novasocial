# VibePulse (NovaSocial)

A realtime, gamified community loyalty platform built with **Next.js 16 (App Router)**, **React 19**, **Drizzle ORM + PostgreSQL**, **Tailwind CSS 4**, and server-sent events (SSE) for realtime updates.

Members earn points for posts, comments, reactions, shares, referrals, daily streaks, quests, and well-framed product ideas; climb five tiers from 🌱 Novice to 👑 Pulse Grandmaster; and redeem points in the rewards store. Admins control the points economy live through the Rule Engine and Flash Events (2X/3X multipliers).

## Professional product-feedback upgrade: Ideas Hub

The **Ideas Hub & Public Roadmap** turns community feedback into a structured delivery pipeline:

- Members can submit concise improvement proposals with a category and expected impact.
- One member, one vote per idea — a database unique index protects the signal from duplicate voting.
- Search, category/status filtering, and popular/newest sorting make larger backlogs manageable.
- Ideas visibly move through **Open → Planned → In progress → Shipped** (or *Not planned*), with admin-only status control.
- Authors receive a private notification when an administrator advances their idea, and live clients refresh through SSE.
- Submissions earn a capped, configurable `idea_submitted` reward rule, available in the admin Rule Engine.

## Social platform expansion: creator connections and sharing

The community feed now behaves more like a complete social product:

- Follow or unfollow creators from their profile; their posts appear in a personalized **Following** feed.
- Save useful posts into a private **Saved** reading list. Saves are never exposed to other members.
- Use platform-native sharing intents for **WhatsApp, Telegram, X, LinkedIn, Facebook, email**, device share sheets, or a direct-copy link.
- Shares remain an earned activity through the existing capped `post_shared` rule; follows and saves deliberately earn no points, preventing social-graph farming.

Run `npm run db:push` after pulling these upgrades so PostgreSQL creates the `ideas`, `idea_votes`, `user_follows`, and `saved_posts` tables.

---

## Quick start

```bash
npm install

# 1. Start a local Postgres (zero-install, PGlite WASM server on :5432)
npm run db:dev

# 2. In another terminal — create the tables
npm run db:push

# 3. Start the app (loads DATABASE_URL from .env.local automatically)
npm run dev
```

Open http://localhost:3000 — the first load seeds the demo database. You'll land on the **sign-in / join screen** (the app is members-only).

### Demo accounts (seeded)

| Username | Role | Points | Password |
|---|---|---|---|
| `elena_tech` | user | 1,680 | `password123` |
| `marcus_dev` | user | 920 | `password123` |
| `priya_pulse` | user | 460 | `password123` |
| `devon_w` | user | 190 | `password123` |
| `admin_maya` | **admin** | 3,450 | `password123` |

> ⚠️ The demo password exists for local development only. Change it in any real deployment.

### Environment

Copy `.env.example` to `.env.local` and adjust:

```
DATABASE_URL=postgresql://postgres:postgres@127.0.0.1:5432/app_db
```

`npm run db:dev` starts a matching throwaway Postgres (data in `./.pglite`, git-ignored). To use a real Postgres (Docker, RDS, Neon…), just change `DATABASE_URL` and run `npm run db:push`.

### Useful scripts

| Command | Purpose |
|---|---|
| `npm run dev` | Next.js dev server |
| `npm run build` / `start` | Production build / serve |
| `npm run db:dev` | Local PGlite Postgres on :5432 |
| `npm run db:push` | Push Drizzle schema to the database |
| `npm run typecheck` / `lint` | Static checks |
| `bash scripts/e2e-reset-and-test.sh` | Reset DB, restart dev server, run the 43-check auth & economy E2E suite |

---

## Security model (added in the P0 hardening)

### Authentication
- Accounts have salted **scrypt password hashes** (`scrypt:<salt>:<hash>`, constant-time verification via `node:crypto`).
- Sessions are opaque bearer tokens in **httpOnly, SameSite=Lax cookies** (`vp_session`, 30-day expiry, `Secure` in production). Only the **SHA-256 hash** of the token is stored — a DB leak doesn't expose usable tokens.
- `POST /api/auth/register | /login | /logout`, `GET /api/auth/me`.
- Login uses a **generic error message** (no user enumeration) and is rate-limited per IP+username; registration is rate-limited per IP.

### Authorization — the session is the only source of identity
Every mutation reads the acting user from the session. Client-supplied `userId` fields are ignored (previously every action could be performed as any user):

- Posts, comments, reactions, shares, poll votes, chat → session author/sender
- Rewards redemption → session user only, with atomic balance/stock deduction (no double-spend races)
- Quest claims & streak check-ins → session user
- Referral invites/conversions → always attributed to the session user; converting someone else's invite → 403
- Profile edits → self or admin only
- Notifications & redemption history → private to the session user
- **Admin endpoints** (`/api/admin/rules`, `/api/admin/events`) → require the `admin` role
- **Bootstrap seeding** → open on an empty database, admin-only afterwards
- **SSE realtime** → streams bind to the session user, so `?userId=` can no longer be used to eavesdrop on another user's targeted events
- Password hashes are stripped from every API response.

### Point-economy integrity
- **Daily caps enforced** — each activity rule's `dailyCap` is now actually checked inside `awardPoints()` (previously stored but ignored → unlimited farming). Once the cap is hit, awards clamp to 0 and users get a "daily cap reached" message.
- **Quests only progress on paid actions** — zero-point spam no longer advances quest counters.
- **One poll vote per user** — enforced by a `poll_votes` table with a unique `(postId, userId)` index. Changing your vote is allowed but never re-awards points.
- **One reaction per user per post** — unique DB index + graceful update path (no duplicate points, race-safe).
- **Self-appreciation pays nothing** — reacting to your own post earns 0 points and sends no notification.
- **Flash events multiply only rule-based activity points** — fixed-value bonuses (quests, streaks, welcome bonus) are never inflated by multipliers.
- **Streaks reset after a missed day** — previously streaks could only grow.
- **Chat farming closed** — chat messages now earn through the standard `comment_created` rule (shared daily cap) instead of an uncapped flat +15.
- **Referral farming capped** — the referral rule has a 1,000 pts/day cap; real signups attribute referrals server-side during `/api/auth/register`.
- **Rate limiting** — sliding-window in-memory limiter on login, register, posts, comments/reactions, chat and referrals (429 + `Retry-After`).

---

## Architecture notes

- `src/lib/auth.ts` — hashing, sessions, cookies, `requireUser` / `requireAdmin`, `toPublicUser`
- `src/lib/gamification.ts` — tiers, `awardPoints()` (daily caps, flash multipliers, quest progress, realtime publish)
- `src/lib/realtime.ts` — in-memory pub/sub behind SSE (`/api/stream`); single-process by design — swap for Redis pub/sub when scaling horizontally (same assumption applies to the rate limiter)
- `src/lib/seed.ts` — idempotent demo seed (runs via `/api/bootstrap` on an empty DB)
- `scripts/dev-db.mjs` — PGlite Postgres wire server for local dev
- `scripts/e2e-auth-test.sh` — 43-check E2E suite covering auth, spoofing, caps, polls, admin RBAC, referrals, rewards and rate limiting

## Roadmap (post-P0)

Near-term (from the upgrade review): pagination + DB indexes, `jsonb` for JSON columns, input validation schemas (zod), migrations instead of `db:push`, tests in CI (Vitest/Playwright), TanStack Query data layer, media uploads, search, mentions, Web Push notifications, moderation queue.
