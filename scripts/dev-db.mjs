// Local development Postgres powered by PGlite (real Postgres compiled to
// WebAssembly) — no Docker or system Postgres required.
//
// Usage:
//   node scripts/dev-db.mjs           # starts a server on 127.0.0.1:5432
//
// Then in another terminal:
//   npm run db:push                   # create/update all tables
//   DATABASE_URL=postgresql://postgres:postgres@127.0.0.1:5432/app_db npm run dev
//
// Data persists in ./.pglite (git-ignored). Set PGHOST/PGPORT to customize.

import { PGlite } from "@electric-sql/pglite";
import { PGLiteSocketServer } from "@electric-sql/pglite-socket";

const HOST = process.env.PGHOST ?? "127.0.0.1";
const PORT = Number(process.env.PGPORT ?? 5432);
const DATA_DIR = process.env.PGDATA ?? ".pglite";

const db = new PGlite(DATA_DIR);
await db.waitReady;

// PGlite is single-database; make sure app_db exists so the default
// DATABASE_URL (`.../app_db`) resolves.
try {
  await db.exec("CREATE DATABASE app_db;");
} catch {
  /* already exists */
}

const server = new PGLiteSocketServer({
  db,
  port: PORT,
  host: HOST,
  database: "app_db",
});

await server.start();
console.log(`[dev-db] PGlite listening on postgresql://postgres:postgres@${HOST}:${PORT}/app_db`);
console.log(`[dev-db] Data directory: ${DATA_DIR}  (Ctrl+C to stop)`);

process.on("SIGINT", async () => {
  await server.stop();
  await db.close();
  process.exit(0);
});
