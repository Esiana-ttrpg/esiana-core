import fs from 'node:fs';
import path from 'node:path';

const dir = path.join(import.meta.dirname, '../migrations');
const created = new Set();
const altered = new Set();

for (const name of fs.readdirSync(dir).sort()) {
  const file = path.join(dir, name, 'migration.sql');
  if (!fs.existsSync(file)) continue;
  const sql = fs.readFileSync(file, 'utf8');
  for (const match of sql.matchAll(/CREATE TABLE "([^"]+)"/g)) {
    created.add(match[1]);
  }
  for (const match of sql.matchAll(/ALTER TABLE "([^"]+)"/g)) {
    altered.add(match[1]);
  }
}

const missing = [...altered]
  .filter(
    (table) =>
      !created.has(table) &&
      !table.startsWith('new_') &&
      !table.endsWith('_new') &&
      table !== 'SystemSetting',
  )
  .sort();

console.log(missing.join('\n'));
