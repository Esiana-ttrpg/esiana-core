import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';
import Database from 'better-sqlite3';
import { normalizeMigrationSqlForSqlite } from '../prisma/scripts/sqliteSchema.mjs';

const backend = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'esiana-eras-'));
const database = path.join(directory, 'test.db');
const db = new Database(database);
const require = createRequire(import.meta.url);
const fixtureEnv = { ...process.env, DATABASE_PROVIDER: 'sqlite', DATABASE_URL: `file:${database.replaceAll('\\', '/')}` };
try {
  const generated = spawnSync(process.execPath, ['prisma/scripts/generate-sqlite-client.mjs'], { cwd: backend, stdio: 'inherit', env: fixtureEnv });
  if (generated.status !== 0) throw new Error('Could not generate the SQLite test client.');
  const root = path.join(backend, 'prisma/migrations');
  for (const migration of fs.readdirSync(root).sort()) {
    const file = path.join(root, migration, 'migration.sql');
    if (fs.existsSync(file)) db.exec(normalizeMigrationSqlForSqlite(fs.readFileSync(file, 'utf8')));
  }
  db.close();
  const result = spawnSync(process.execPath, ['--import', 'tsx', '--test', 'src/lib/chronologyEraService.test.ts'], {
    cwd: backend, stdio: 'inherit', env: { ...process.env, NODE_ENV: 'test', DATABASE_PROVIDER: 'sqlite', DATABASE_URL: `file:${database.replaceAll('\\', '/')}`, CHRONOLOGY_ERA_TEST_DATABASE_URL: `file:${database.replaceAll('\\', '/')}` },
  });
  process.exitCode = result.status ?? 1;
} finally {
  if (db.open) db.close();
  const restored = spawnSync(process.execPath, [path.join(path.dirname(require.resolve('prisma/package.json')), 'build/index.js'), 'generate'], { cwd: backend, stdio: 'inherit' });
  if (restored.status !== 0) process.exitCode = 1;
  // Exact disposable fixture paths; never touch a developer database.
  for (const suffix of ['', '-wal', '-shm']) if (fs.existsSync(database + suffix)) fs.unlinkSync(database + suffix);
  fs.rmdirSync(directory);
}
