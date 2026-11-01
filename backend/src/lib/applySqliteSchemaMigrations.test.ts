import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test, { type TestContext } from 'node:test';
import {
  applySqliteSchemaMigrations,
  shouldApplySqliteSchemaMigrations,
} from './applySqliteSchemaMigrations.js';

function stubBackend(t: TestContext, script: string) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'esiana-sqlite-apply-'));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  fs.mkdirSync(path.join(root, 'prisma/scripts'), { recursive: true });
  fs.writeFileSync(path.join(root, 'prisma/scripts/deploy-sqlite-migrations.mjs'), script);
  return root;
}

test('SQLite schema migrate runs for file URLs outside tests, never in test env', () => {
  assert.equal(shouldApplySqliteSchemaMigrations({
    databaseProvider: 'sqlite', databaseUrl: 'file:./dev.db', nodeEnv: 'production',
  }), true);
  assert.equal(shouldApplySqliteSchemaMigrations({
    databaseProvider: 'postgresql', databaseUrl: 'file:/data/esiana.db', nodeEnv: 'production',
  }), true);
  assert.equal(shouldApplySqliteSchemaMigrations({
    databaseProvider: 'postgresql', databaseUrl: 'postgresql://esiana:esiana@localhost/esiana', nodeEnv: 'production',
  }), false);
  assert.equal(shouldApplySqliteSchemaMigrations({
    databaseProvider: 'sqlite', databaseUrl: 'file:./dev.db', nodeEnv: 'test',
  }), false);
});

test('applySqliteSchemaMigrations runs deploy without reset and fails closed', async (t) => {
  const ok = stubBackend(t, `
    import fs from 'node:fs';
    fs.writeFileSync(new URL('./seen.json', import.meta.url), JSON.stringify({
      argv: process.argv.slice(2),
      reset: process.env.SQLITE_DB_RESET,
      url: process.env.DATABASE_URL,
    }));
  `);
  await applySqliteSchemaMigrations({ backendRoot: ok, databaseUrl: 'file:./keep.db' });
  const seen = JSON.parse(fs.readFileSync(path.join(ok, 'prisma/scripts/seen.json'), 'utf8'));
  assert.deepEqual(seen.argv, ['--no-generate']);
  assert.equal(seen.reset, '0');
  assert.equal(seen.url, 'file:./keep.db');

  const failing = stubBackend(t, 'process.exit(2)');
  await assert.rejects(
    applySqliteSchemaMigrations({ backendRoot: failing, databaseUrl: 'file:./keep.db' }),
    /SQLite migrate deploy failed \(2\)/,
  );
});
