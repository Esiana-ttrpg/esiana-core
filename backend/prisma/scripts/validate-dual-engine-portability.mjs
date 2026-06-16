#!/usr/bin/env node
/**
 * Guard dual-engine contract: schema.prisma must not declare Postgres-only Prisma
 * features that the SQLite-diff baseline migration does not create.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const schemaPath = path.join(root, 'schema.prisma');
const migrationPath = path.join(
  root,
  'migrations/20260613190000_v1_baseline/migration.sql',
);

const schema = fs.readFileSync(schemaPath, 'utf8');
const migration = fs.readFileSync(migrationPath, 'utf8');

const errors = [];

const enumBlocks = [...schema.matchAll(/^enum\s+(\w+)\s*\{/gm)];
if (enumBlocks.length > 0) {
  errors.push(
    `schema.prisma declares Prisma enums (use String + shared constants): ${enumBlocks.map((m) => m[1]).join(', ')}`,
  );
}

const dbAnnotations = [...schema.matchAll(/@db\.(\w+)/g)];
if (dbAnnotations.length > 0) {
  const unique = [...new Set(dbAnnotations.map((m) => `@db.${m[1]}`))];
  errors.push(`schema.prisma uses native @db annotations: ${unique.join(', ')}`);
}

if (schema.includes('dbgenerated(')) {
  errors.push('schema.prisma uses dbgenerated() — not portable across engines');
}

if (/\bString\[\]/.test(schema)) {
  errors.push('schema.prisma uses String[] — use Json for portable arrays');
}

if (/\bCREATE\s+TYPE\b/i.test(migration)) {
  errors.push('baseline migration.sql contains CREATE TYPE');
}

if (/\bCREATE\s+EXTENSION\b/i.test(migration)) {
  errors.push('baseline migration.sql contains CREATE EXTENSION');
}

if (/gen_random_uuid\s*\(|uuid_generate/i.test(migration)) {
  errors.push('baseline migration.sql uses Postgres-only UUID defaults');
}

if (errors.length > 0) {
  console.error('Dual-engine portability validation failed:\n');
  for (const err of errors) console.error(`  - ${err}`);
  process.exit(1);
}

console.log('OK: schema + baseline migration satisfy dual-engine portability rules');
