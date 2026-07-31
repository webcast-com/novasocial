#!/usr/bin/env bash
# Reset the local PGlite database, re-push the schema, and run the E2E suite.
set -e
cd "$(dirname "$0")/.."

echo "→ Resetting local dev database + dev server (clears rate-limit state)..."
pkill -f dev-db.mjs 2>/dev/null || true
pkill -f "next dev" 2>/dev/null || true
sleep 2
rm -rf .pglite
nohup node scripts/dev-db.mjs > /tmp/devdb.log 2>&1 &
sleep 4

echo "→ Pushing schema..."
npx drizzle-kit push --force > /dev/null 2>&1 || npx drizzle-kit push --force

echo "→ Starting dev server..."
nohup npm run dev > /tmp/nextdev.log 2>&1 &
for i in $(seq 1 30); do
  curl -s -o /dev/null http://127.0.0.1:3000/api/health && break
  sleep 1
done

echo "→ Running E2E suite..."
bash scripts/e2e-auth-test.sh
