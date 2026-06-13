import { DatabaseSync } from 'node:sqlite';

const db = new DatabaseSync(process.argv[2]);
const rows = db.prepare('SELECT key, length(value) as len FROM ItemTable ORDER BY key').all();
for (const r of rows) console.log(`${r.len}\t${r.key}`);
db.close();
