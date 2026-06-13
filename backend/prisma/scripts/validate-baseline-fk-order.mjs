#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const migrationPath = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  '../migrations/20260613190000_v1_baseline/migration.sql',
);
const sql = fs.readFileSync(migrationPath, 'utf8');
const idx = sql.search(/\r?\n-- CreateIndex\r?\n/);
const body = sql.slice(0, idx);
const blocks = [...body.matchAll(/-- CreateTable\r?\nCREATE TABLE "([^"]+)" \([\s\S]*?\);\r?\n/g)];
const order = blocks.map((b) => b[1]);
const pos = new Map(order.map((name, i) => [name, i]));
const bad = [];
for (const block of blocks) {
  const name = block[1];
  const refs = [...block[0].matchAll(/REFERENCES "([^"]+)"/g)]
    .map((m) => m[1])
    .filter((ref) => ref !== name);
  for (const ref of refs) {
    if (pos.has(ref) && pos.get(ref) > pos.get(name)) {
      bad.push(`${name} -> ${ref}`);
    }
  }
}
if (bad.length) {
  console.error('Forward FK references:', bad.join('\n'));
  process.exit(1);
}
console.log('OK: no forward FK references in baseline migration');
