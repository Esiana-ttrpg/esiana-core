#!/usr/bin/env node
/**
 * Topologically sort CREATE TABLE blocks in a Prisma baseline migration
 * so PostgreSQL can apply inline FOREIGN KEY constraints (SQLite is lenient).
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const migrationPath =
  process.argv[2] ??
  path.join(__dirname, '../migrations/20260613190000_v1_baseline/migration.sql');

const sql = fs.readFileSync(migrationPath, 'utf8');
const indexMatch = sql.match(/\r?\n-- CreateIndex\r?\n/);
if (!indexMatch) throw new Error('Could not find -- CreateIndex section');
const indexPos = indexMatch.index;
const indexMarker = indexMatch[0];

const header = sql.slice(0, sql.indexOf('-- CreateTable'));
const body = sql.slice(sql.indexOf('-- CreateTable'), indexPos);
const indexes = sql.slice(indexPos + indexMarker.length);

const blockRe = /-- CreateTable\r?\nCREATE TABLE "([^"]+)" \([\s\S]*?\);\r?\n/g;
const blocks = [];
let match;
while ((match = blockRe.exec(body)) !== null) {
  blocks.push({ name: match[1], sql: match[0] });
}

const fkRe = /REFERENCES "([^"]+)"/g;
const depsOf = new Map();
for (const block of blocks) {
  const deps = new Set();
  let fk;
  while ((fk = fkRe.exec(block.sql)) !== null) {
    if (fk[1] !== block.name) deps.add(fk[1]);
  }
  depsOf.set(block.name, deps);
}

const names = blocks.map((b) => b.name);
const byName = new Map(blocks.map((b) => [b.name, b]));
const sorted = [];
const visiting = new Set();
const visited = new Set();

function visit(name) {
  if (visited.has(name)) return;
  if (visiting.has(name)) {
    throw new Error(`Cycle detected at table ${name}`);
  }
  visiting.add(name);
  for (const dep of depsOf.get(name) ?? []) {
    if (byName.has(dep)) visit(dep);
  }
  visiting.delete(name);
  visited.add(name);
  sorted.push(byName.get(name));
}

for (const name of names) visit(name);

const out =
  header +
  sorted.map((b) => b.sql).join('\n') +
  indexMarker +
  indexes;

fs.writeFileSync(migrationPath, out);
console.log(`Reordered ${sorted.length} tables in ${migrationPath}`);
console.log('First 10:', sorted.slice(0, 10).map((b) => b.name).join(', '));
