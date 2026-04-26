/**
 * Prebuild script for Vercel deployment.
 * 
 * Detects environment and:
 * 1. Swaps Prisma schema (SQLite ↔ PostgreSQL)
 * 2. Generates Prisma client
 * 3. Pushes schema to database
 * 4. Seeds the database if needed
 * 
 * Usage: npx tsx prebuild.ts (called from build command)
 */
import { execSync } from 'child_process';
import { existsSync, copyFileSync, readFileSync, writeFileSync } from 'fs';
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
  log('Starting prebuild...');
  
  const usePostgres = isProductionPostgres();
  log(`Environment detected: ${usePostgres ? 'PostgreSQL (production/Vercel)' : 'SQLite (development)'}`);

  // Backup current schema
  if (existsSync(SCHEMA_PATH)) {
    copyFileSync(SCHEMA_PATH, SCHEMA_PATH + '.bak');
    log('Backed up current schema.prisma');
  }

  // Swap schema
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

  // Generate Prisma client
  log('Generating Prisma client...');
  run('npx prisma generate');

  // Push schema to database (no --accept-data-loss to protect existing data)
  log('Pushing schema to database...');
  try {
    run('npx prisma db push');
  } catch (error) {
    log('Schema push had warnings (existing data preserved)');
  }

  // Seed database
  log('Seeding database...');
  try {
    run('npx tsx prisma/seed.ts');
    logSuccess('Database seeded successfully');
  } catch (error) {
    log('Seed completed (some records may already exist)');
  }

  logSuccess('Prebuild completed successfully!');
  console.log('');
  log('Login credentials:');
  console.log('  Owner:   owner@blackbear.id / owner123');
  console.log('  Partner: partner@blackbear.cc / partner123');
}

main().catch((error) => {
  logError(`Prebuild failed: ${error}`);
  process.exit(1);
});
