#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execSync } from 'node:child_process';

const backendRoot = path.join(path.dirname(fileURLToPath(import.meta.url)), '../..');
const prismaRoot = path.join(backendRoot, 'prisma');
const schemaPath = path.join(prismaRoot, 'schema.prisma');
const lockPath = path.join(prismaRoot, 'migrations/migration_lock.toml');
const dbFile = `deploy-test-${Date.now()}.db`;
const dbPath = path.join(backendRoot, dbFile);
const prismaDirEnvPath = path.join(prismaRoot, '.env');

const schema = fs.readFileSync(schemaPath, 'utf8');
const lock = fs.readFileSync(lockPath, 'utf8');
const prismaDirEnvBackup = fs.existsSync(prismaDirEnvPath)
  ? fs.readFileSync(prismaDirEnvPath, 'utf8')
  : null;

try {
  if (fs.existsSync(prismaDirEnvPath)) fs.unlinkSync(prismaDirEnvPath);

  fs.writeFileSync(schemaPath, schema.replace('provider = "postgresql"', 'provider = "sqlite"'));
  fs.writeFileSync(lockPath, lock.replace('provider = "postgresql"', 'provider = "sqlite"'));

  execSync('npx prisma migrate deploy', {
    cwd: backendRoot,
    stdio: 'inherit',
    env: { ...process.env, DATABASE_URL: `file:./${dbFile}` },
  });
  console.log('SQLITE_MIGRATE: OK');
} finally {
  fs.writeFileSync(schemaPath, schema);
  fs.writeFileSync(lockPath, lock);
  if (fs.existsSync(dbPath)) fs.unlinkSync(dbPath);
  if (prismaDirEnvBackup != null) fs.writeFileSync(prismaDirEnvPath, prismaDirEnvBackup);
}
