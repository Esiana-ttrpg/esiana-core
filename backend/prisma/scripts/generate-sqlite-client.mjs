#!/usr/bin/env node
/**
 * Generate Prisma Client for SQLite local dev without committing provider = "sqlite".
 */
import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const backendRoot = path.join(path.dirname(fileURLToPath(import.meta.url)), '../..');
const schemaPath = path.join(backendRoot, 'prisma', 'schema.prisma');

const envDbUrl = process.env.DATABASE_URL ?? 'file:./dev.db';
const dbUrl = envDbUrl.startsWith('file:') ? envDbUrl : 'file:./dev.db';
if (dbUrl !== envDbUrl) {
  console.warn(
    `SQLite generate: ignoring non-file DATABASE_URL (${envDbUrl}); using ${dbUrl}`,
  );
}

const schema = fs.readFileSync(schemaPath, 'utf8');
if (!schema.includes('provider = "postgresql"')) {
  execSync('npx prisma generate', {
    cwd: backendRoot,
    stdio: 'inherit',
    env: { ...process.env, DATABASE_URL: dbUrl },
  });
  process.exit(0);
}

try {
  fs.writeFileSync(schemaPath, schema.replace('provider = "postgresql"', 'provider = "sqlite"'));
  execSync('npx prisma generate', {
    cwd: backendRoot,
    stdio: 'inherit',
    env: { ...process.env, DATABASE_URL: dbUrl },
  });
  console.log('Prisma Client generated for SQLite (schema.prisma restored to postgresql).');
} finally {
  fs.writeFileSync(schemaPath, schema);
}
