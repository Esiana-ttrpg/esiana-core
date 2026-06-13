import { writeFileSync } from 'node:fs';
import { DatabaseSync } from 'node:sqlite';

const [dbPath, key, outPath] = process.argv.slice(2);
const db = new DatabaseSync(dbPath);
const row = db.prepare('SELECT value FROM ItemTable WHERE key = ?').get(key);
db.close();
const v = row?.value ?? '';
writeFileSync(outPath, v);
console.log(`Wrote ${v.length} chars to ${outPath}`);
