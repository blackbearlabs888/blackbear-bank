#!/usr/bin/env tsx
import { execSync } from 'child_process';
import { existsSync, copyFileSync } from 'fs';
import { resolve } from 'path';

const isProduction = process.env.NODE_ENV === 'production' || process.env.VERCEL === '1';

console.log('🔧 Running prebuild script...');
console.log(`Environment: ${isProduction ? 'Production' : 'Development'}`);

// Get project root directory
const projectRoot = resolve(__dirname, '..');

if (isProduction) {
  // Check if DATABASE_URL is PostgreSQL
  const dbUrl = process.env.DATABASE_URL || '';
  const isPostgres = dbUrl.includes('postgresql://') || dbUrl.includes('postgres://');
  
  if (isPostgres) {
    console.log('📦 PostgreSQL database detected, switching schema...');
    
    const postgresSchema = resolve(projectRoot, 'prisma/schema.postgres.prisma');
    const mainSchema = resolve(projectRoot, 'prisma/schema.prisma');
    const sqliteBackup = resolve(projectRoot, 'prisma/schema.sqlite.prisma');
    
    if (existsSync(postgresSchema)) {
      // Backup SQLite schema
      if (existsSync(mainSchema)) {
        copyFileSync(mainSchema, sqliteBackup);
        console.log('💾 SQLite schema backed up');
      }
      // Use PostgreSQL schema
      copyFileSync(postgresSchema, mainSchema);
      console.log('✅ Schema switched to PostgreSQL');
    }
  }
}

// Generate Prisma Client
console.log('🔄 Generating Prisma Client...');
try {
  execSync('npx prisma generate', { stdio: 'inherit', cwd: projectRoot });
  console.log('✅ Prisma Client generated');
} catch (error) {
  console.error('❌ Failed to generate Prisma Client');
  process.exit(1);
}

// Push schema and seed in production
if (isProduction) {
  // Push schema to database
  console.log('🔄 Pushing schema to database...');
  try {
    execSync('npx prisma db push --accept-data-loss --skip-generate', { 
      stdio: 'inherit', 
      cwd: projectRoot 
    });
    console.log('✅ Schema pushed to database');
  } catch (error) {
    console.error('⚠️ Failed to push schema, continuing anyway...');
  }
  
  // Run seed to create default data
  console.log('🌱 Running database seed...');
  try {
    execSync('npx tsx prisma/seed.ts', { 
      stdio: 'inherit', 
      cwd: projectRoot 
    });
    console.log('✅ Database seeded successfully');
  } catch (error) {
    console.log('ℹ️ Seed completed (data may already exist)');
  }
}

console.log('✅ Prebuild completed!');
