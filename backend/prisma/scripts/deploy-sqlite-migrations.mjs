#!/usr/bin/env node
/**
 * Apply Prisma migrations to SQLite with Postgres-normalized SQL patched for runtime.
 * Baseline migration uses TIMESTAMP(3) + JSONB for Postgres deploy; Prisma SQLite
 * client requires DATETIME + TEXT column declarations.
 */
import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const backendRoot = path.join(path.dirname(fileURLToPath(import.meta.url)), '../..');
const prismaRoot = path.join(backendRoot, 'prisma');
const migrationsRoot = path.join(prismaRoot, 'migrations');
const schemaPath = path.join(prismaRoot, 'schema.prisma');
const lockPath = path.join(migrationsRoot, 'migration_lock.toml');

export function normalizeMigrationSqlForSqlite(sql) {
  return sql.replaceAll('TIMESTAMP(3)', 'DATETIME').replaceAll('JSONB', 'TEXT');
}

function writeNormalizedMigrations(outDir) {
  fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(path.join(outDir, 'migration_lock.toml'), 'provider = "sqlite"\n');

  const dirs = fs
    .readdirSync(migrationsRoot, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => d.name)
    .sort();

  for (const dir of dirs) {
    const src = path.join(migrationsRoot, dir, 'migration.sql');
    const destDir = path.join(outDir, dir);
    fs.mkdirSync(destDir, { recursive: true });
    fs.writeFileSync(
      path.join(destDir, 'migration.sql'),
      normalizeMigrationSqlForSqlite(fs.readFileSync(src, 'utf8')),
    );
  }
}

function swapDir(from, to, backup) {
  if (fs.existsSync(backup)) fs.rmSync(backup, { recursive: true, force: true });
  if (fs.existsSync(to)) fs.renameSync(to, backup);
  fs.cpSync(from, to, { recursive: true });
}

function restoreDir(backup, to) {
  if (fs.existsSync(to)) fs.rmSync(to, { recursive: true, force: true });
  if (fs.existsSync(backup)) fs.renameSync(backup, to);
}

const reset = process.argv.includes('--reset') || process.env.SQLITE_DB_RESET === '1';
const dbUrl = process.env.DATABASE_URL ?? 'file:./dev.db';
const dbFile = dbUrl.replace(/^file:\.\//, '');
const dbPath = path.join(prismaRoot, dbFile);

const stagingRoot = path.join(backendRoot, '.sqlite-migrations-staging');
const migrationsBackup = path.join(backendRoot, '.sqlite-migrations-backup');

const schema = fs.readFileSync(schemaPath, 'utf8');
const lock = fs.readFileSync(lockPath, 'utf8');

try {
  if (reset && fs.existsSync(dbPath)) fs.unlinkSync(dbPath);
  if (fs.existsSync(stagingRoot)) fs.rmSync(stagingRoot, { recursive: true, force: true });

  writeNormalizedMigrations(stagingRoot);

  fs.writeFileSync(schemaPath, schema.replace('provider = "postgresql"', 'provider = "sqlite"'));
  swapDir(stagingRoot, migrationsRoot, migrationsBackup);

  execSync('npx prisma migrate deploy', {
    cwd: backendRoot,
    stdio: 'inherit',
    env: { ...process.env, DATABASE_URL: dbUrl },
  });

  console.log(`SQLite migrations applied to ${dbUrl}`);
} finally {
  fs.writeFileSync(schemaPath, schema);
  restoreDir(migrationsBackup, migrationsRoot);
  if (fs.existsSync(stagingRoot)) fs.rmSync(stagingRoot, { recursive: true, force: true });
  if (fs.existsSync(migrationsBackup)) fs.rmSync(migrationsBackup, { recursive: true, force: true });
}
