import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';
import Database from 'better-sqlite3';
import { normalizeMigrationSqlForSqlite } from '../prisma/scripts/sqliteSchema.mjs';

const backend = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
console.log(`Session audio validation: Node ${process.version}`);
const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'esiana-session-audio-'));
const database = path.join(directory, 'test.db');
const require = createRequire(import.meta.url);
const fixtureEnv = { ...process.env, NODE_ENV: 'test', DATABASE_PROVIDER: 'sqlite',
  DATABASE_URL: `file:${database.replaceAll('\\', '/')}`, UPLOADS_DIR: path.join(directory, 'uploads'),
  SESSION_AUDIO_TEST_DATABASE: '1' };
let db;
try {
  const generated = spawnSync(process.execPath, ['prisma/scripts/generate-sqlite-client.mjs'], { cwd: backend, stdio: 'inherit', env: fixtureEnv });
  if (generated.status !== 0) throw new Error('Could not generate SQLite test client');
  db = new Database(database);
  const migrations = path.join(backend, 'prisma/migrations');
  for (const name of fs.readdirSync(migrations).sort()) {
    const file = path.join(migrations, name, 'migration.sql');
    if (fs.existsSync(file)) db.exec(normalizeMigrationSqlForSqlite(fs.readFileSync(file, 'utf8')));
  }
  db.close();
  const result = spawnSync(process.execPath, ['--import', 'tsx', '--import', './scripts/session-audio-test-env.mjs', '--test', '--test-concurrency=1',
    '../shared/sessionAudio.test.ts', 'src/lib/sessionAudio.integration.test.ts', 'src/lib/transcriptionHttp.test.ts',
    'src/lib/sessionAudio.apiTokens.test.ts',
    '../shared/campaignPolicy/policy.test.ts', '../shared/campaignPolicy/capabilityOverrides.test.ts',
    'src/lib/campaignClonePresets.test.ts', 'src/lib/campaignBackupRoundTrip.test.ts',
    'src/lib/campaignExport/buildCampaignBackupZip.test.ts', 'src/lib/campaignBackupRestore.integration.test.ts',
    'src/lib/rateLimit/coverage.test.ts', 'src/routes/openapiDocs.test.ts'], { cwd: backend, stdio: 'inherit', env: fixtureEnv });
  process.exitCode = result.status ?? 1;
} finally {
  if (db?.open) db.close();
  const restored = spawnSync(process.execPath, [path.join(path.dirname(require.resolve('prisma/package.json')), 'build/index.js'), 'generate'], { cwd: backend, stdio: 'inherit' });
  if (restored.status !== 0) process.exitCode = 1;
  // Only the mkdtemp-created fixture directory is removed.
  if (path.dirname(directory) !== os.tmpdir() || !path.basename(directory).startsWith('esiana-session-audio-')) throw new Error('Invalid fixture path');
  fs.rmSync(directory, { recursive: true, force: true });
}
