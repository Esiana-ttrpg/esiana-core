#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const migrationPath = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  '../migrations/20260613190000_v1_baseline/migration.sql',
);
const sql = fs.readFileSync(migrationPath, 'utf8');
const names = [
  ...sql.matchAll(/"(CampaignScheduledEffectOccurrence[^"]+)"/g),
  ...sql.matchAll(/CONSTRAINT "([^"]+)"/g),
  ...sql.matchAll(/CREATE (?:UNIQUE )?INDEX "([^"]+)"/g),
].map((m) => m[1]);

const byTrunc = new Map();
for (const name of names) {
  const trunc = name.slice(0, 63);
  if (!byTrunc.has(trunc)) byTrunc.set(trunc, []);
  byTrunc.get(trunc).push(name);
}

const collisions = [...byTrunc.entries()].filter(([, list]) => {
  const unique = new Set(list);
  return unique.size > 1;
});

if (!collisions.length) {
  console.log('OK: no Postgres 63-char identifier collisions');
  process.exit(0);
}

console.error(`Found ${collisions.length} truncation collision(s):`);
for (const [trunc, list] of collisions) {
  console.error(`\nTruncated: ${trunc}`);
  for (const n of [...new Set(list)]) console.error(`  - ${n} (${n.length} chars)`);
}
process.exit(1);
