/**
 * Prebuild script — SAFE BY DEFAULT (Phase 1.2 — Finding 6)
 *
 * Default behaviour: NON-MUTATING. The build pipeline must NEVER perform
 * database mutation (`prisma db push`, `prisma migrate dev`, seed). The
 * only allowed operations are:
 *   1. Swap Prisma schema file (SQLite ↔ PostgreSQL) — file copy only.
 *   2. `prisma generate` — generates the client; touches no database.
 *   3. (Optional) `prisma migrate deploy` — but ONLY when explicitly
 *      requested via the separate `db:migrate:deploy` script. This prebuild
 *      script does NOT run it.
 *
 * Database mutation commands are intentionally separated:
 *   - `bun run db:push`        — dev only, mutates dev DB
 *   - `bun run db:migrate:deploy` — production, applies pending migrations
 *   - `bun run db:seed:dev`    — dev only, inserts seed data
 *
 * Removed: silent try/catch around `prisma db push` and `prisma/seed.ts`
 *          that previously masked failures and made the build non-fail-closed.
 *
 * Removed: `prisma/seed.ts` invocation entirely. The file did not exist,
 *          causing every previous build to fail at this step (silently
 *          swallowed by try/catch). Seed is now `db:seed:dev`.
 *
 * Removed: dev-credentials log on every build. Credentials are never
 *          printed by `build`.
 *
 * Usage: `bun run build` → calls this script via `prebuild` script.
 */

import { execSync } from 'child_process';
import { existsSync, copyFileSync } from 'fs';
import { join } from 'path';

const ROOT_DIR = process.cwd();
const SCHEMA_PATH = join(ROOT_DIR, 'prisma', 'schema.prisma');
const SQLITE_SCHEMA = join(ROOT_DIR, 'prisma', 'schema.sqlite.prisma');
const POSTGRES_SCHEMA = join(ROOT_DIR, 'prisma', 'schema.postgres.prisma');

function log(msg: string) {
  console.log(`\x1b[36m[prebuild]\x1b[0m ${msg}`);
}

function logSuccess(msg: string) {
  console.log(`\x1b[32m[prebuild]\x1b[0m ${msg}`);
}

function logError(msg: string) {
  console.error(`\x1b[31m[prebuild]\x1b[0m ${msg}`);
}

function run(cmd: string) {
  log(`Running: ${cmd}`);
  execSync(cmd, { stdio: 'inherit', cwd: ROOT_DIR });
}

function isProductionPostgres(): boolean {
  const dbUrl = process.env.DATABASE_URL || '';
  return (
    dbUrl.startsWith('postgresql://') ||
    dbUrl.startsWith('postgres://') ||
    process.env.VERCEL === '1'
  );
}

async function main() {
  log('Starting prebuild (NON-MUTATING by default)...');

  const usePostgres = isProductionPostgres();
  log(`Environment detected: ${usePostgres ? 'PostgreSQL (production/Vercel)' : 'SQLite (development)'}`);

  // Backup current schema
  if (existsSync(SCHEMA_PATH)) {
    copyFileSync(SCHEMA_PATH, SCHEMA_PATH + '.bak');
    log('Backed up current schema.prisma');
  }

  // Swap schema file (file copy only — no DB mutation)
  if (usePostgres) {
    if (!existsSync(POSTGRES_SCHEMA)) {
      logError('PostgreSQL schema not found at prisma/schema.postgres.prisma');
      process.exit(1);
    }
    copyFileSync(POSTGRES_SCHEMA, SCHEMA_PATH);
    logSuccess('Swapped to PostgreSQL schema');
  } else {
    if (!existsSync(SQLITE_SCHEMA)) {
      logError('SQLite schema not found at prisma/schema.sqlite.prisma');
      process.exit(1);
    }
    copyFileSync(SQLITE_SCHEMA, SCHEMA_PATH);
    logSuccess('Swapped to SQLite schema');
  }

  // Generate Prisma client (no DB mutation)
  log('Generating Prisma client...');
  run('npx prisma generate');
  logSuccess('Prisma client generated');

  // NOTE: NO `prisma db push`, NO `prisma migrate dev`, NO seed.
  // Those are intentionally NOT part of the build pipeline.
  //
  //   Database deployment is a separate, explicit operation:
  //     - dev:       `bun run db:push`
  //     - prod:      `bun run db:migrate:deploy`
  //     - dev seed:  `bun run db:seed:dev`
  //
  // Do not add SKIP_DB_MUTATION as a guard — the default is already
  // non-mutating, which is the correct production posture.

  logSuccess('Prebuild completed (no database mutation performed).');
}

main().catch((error) => {
  logError(`Prebuild failed: ${error}`);
  process.exit(1);
});
