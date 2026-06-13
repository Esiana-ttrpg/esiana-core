import { DatabaseSync } from 'node:sqlite';

const dbPath = process.argv[2];
const db = new DatabaseSync(dbPath);
const keys = db
  .prepare(
    `SELECT key, length(value) as len FROM ItemTable ORDER BY len DESC LIMIT 40`,
  )
  .all();
console.log('Top keys by value length:');
for (const row of keys) {
  const preview = db.prepare('SELECT substr(value,1,80) as p FROM ItemTable WHERE key = ?').get(row.key);
  const hasOld = String(preview?.p ?? '').includes('GIT/esiana') || String(preview?.p ?? '').includes('GIT\\esiana');
  console.log(`${row.len}\t${row.key}${hasOld ? ' [OLD PATH]' : ''}`);
}
const chatKeys = db
  .prepare(`SELECT key, length(value) as len FROM ItemTable WHERE key LIKE '%chat%' OR key LIKE '%composer%' OR key LIKE '%aichat%' OR key LIKE '%conversation%' OR key LIKE '%prompt%' OR key LIKE '%generation%'`)
  .all();
console.log('\nChat-related keys:');
for (const row of chatKeys) console.log(`${row.len}\t${row.key}`);
db.close();
