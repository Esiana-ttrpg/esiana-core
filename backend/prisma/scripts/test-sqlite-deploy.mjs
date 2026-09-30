#!/usr/bin/env node
/**
 * Smoke-test SQLite migration deploy with the Postgres→SQLite normalizer.
 * Asserts that tsvector / GIN statements are stripped and deploy succeeds.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execSync } from 'node:child_process';
import {
  normalizeMigrationSqlForSqlite,
  normalizeSchemaPrismaForSqlite,
} from './sqliteSchema.mjs';

const backendRoot = path.join(path.dirname(fileURLToPath(import.meta.url)), '../..');
const prismaRoot = path.join(backendRoot, 'prisma');
const migrationsRoot = path.join(prismaRoot, 'migrations');
const searchMigration = path.join(
  migrationsRoot,
  '20260930140000_search_index_document',
  'migration.sql',
);

const raw = fs.readFileSync(searchMigration, 'utf8');
if (!/\btsvector\b/.test(raw)) {
  console.error('Expected tsvector in search index migration.sql');
  process.exit(1);
}
if (!/\bUSING\s+GIN\b/i.test(raw)) {
  console.error('Expected GIN indexes in search index migration.sql');
  process.exit(1);
}

const normalized = normalizeMigrationSqlForSqlite(raw);
if (/\btsvector\b/.test(normalized)) {
  console.error('normalizeMigrationSqlForSqlite failed to rewrite tsvector');
  process.exit(1);
}
if (/\bUSING\s+GIN\b/i.test(normalized)) {
  console.error('normalizeMigrationSqlForSqlite failed to strip GIN indexes');
  process.exit(1);
}
if (!/"partyVector" TEXT/.test(normalized) && !/"partyVector"\s+TEXT/.test(normalized)) {
  console.error('Expected partyVector TEXT after normalization');
  process.exit(1);
}

const schema = fs.readFileSync(path.join(prismaRoot, 'schema.prisma'), 'utf8');
const sqliteSchema = normalizeSchemaPrismaForSqlite(schema);
if (!sqliteSchema.includes('provider = "sqlite"')) {
  console.error('Schema normalizer did not swap provider');
  process.exit(1);
}
if (/Unsupported\("tsvector"\)/.test(sqliteSchema)) {
  console.error('Schema normalizer left Unsupported(tsvector)');
  process.exit(1);
}
if (/type:\s*Gin/.test(sqliteSchema)) {
  console.error('Schema normalizer left type: Gin');
  process.exit(1);
}

const dbFile = `deploy-test-${Date.now()}.db`;
const dbPath = path.join(prismaRoot, dbFile);
const prismaDirEnvPath = path.join(prismaRoot, '.env');
const prismaDirEnvBackup = fs.existsSync(prismaDirEnvPath)
  ? fs.readFileSync(prismaDirEnvPath, 'utf8')
  : null;

try {
  if (fs.existsSync(prismaDirEnvPath)) fs.unlinkSync(prismaDirEnvPath);

  execSync(
    `node prisma/scripts/deploy-sqlite-migrations.mjs --reset`,
    {
      cwd: backendRoot,
      stdio: 'inherit',
      env: { ...process.env, DATABASE_URL: `file:./${dbFile}` },
    },
  );
  console.log('SQLITE_MIGRATE: OK');
  console.log('SQLITE_NORMALIZER: OK');
} finally {
  if (fs.existsSync(dbPath)) fs.unlinkSync(dbPath);
  // deploy script writes under prisma/; also clean if created there
  const alt = path.join(backendRoot, dbFile);
  if (fs.existsSync(alt)) fs.unlinkSync(alt);
  if (prismaDirEnvBackup != null) fs.writeFileSync(prismaDirEnvPath, prismaDirEnvBackup);
}
