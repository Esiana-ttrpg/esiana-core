import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import Database from 'better-sqlite3';
import { deploySqliteMigrations } from './deploy-sqlite-migrations.mjs';
import { normalizeMigrationSqlForSqlite } from './sqliteSchema.mjs';

function snapshot(root) {
  return fs.readdirSync(root, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))
    .flatMap((entry) => {
      const target = path.join(root, entry.name);
      return entry.isDirectory()
        ? snapshot(target).map(([name, bytes]) => [`${entry.name}/${name}`, bytes])
        : [[entry.name, fs.readFileSync(target).toString('base64')]];
    });
}

function fixture(t) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'esiana-sqlite-deploy-test-'));
  t.after(() => {
    assert.equal(path.dirname(root), os.tmpdir());
    assert.ok(path.basename(root).startsWith('esiana-sqlite-deploy-test-'));
    fs.rmSync(root, { recursive: true, force: true });
  });
  fs.mkdirSync(path.join(root, 'prisma/migrations/001'), { recursive: true });
  fs.writeFileSync(path.join(root, 'prisma/schema.prisma'), `generator client {
  provider = "prisma-client"
  output = "../src/generated/prisma"
}
datasource db {
  provider = "postgresql"
}
`);
  fs.writeFileSync(path.join(root, 'prisma/migrations/001/migration.sql'), 'CREATE TABLE "Example" ("id" TEXT, "metadata" JSONB);');
  fs.writeFileSync(path.join(root, 'prisma/migrations/migration_lock.toml'), 'provider = "postgresql"\n');
  fs.writeFileSync(path.join(root, 'prisma/.env'), 'DATABASE_URL=do-not-touch\r\n');
  for (const name of ['.sqlite-migrations-backup', '.sqlite-migrations-staging', '.sqlite-deploy-existing']) {
    fs.mkdirSync(path.join(root, name));
    fs.writeFileSync(path.join(root, name, 'preserve.sql'), 'original recovery artifact');
  }
  return root;
}

for (const failure of ['staging', 'deploy', 'generate', 'none']) {
  test(`SQLite deployment preserves sources and stale artifacts after ${failure}`, (t) => {
    const root = fixture(t);
    if (failure === 'staging') fs.mkdirSync(path.join(root, 'prisma/migrations/002'));
    const before = snapshot(root);
    let calls = 0;
    const runCommand = (executable, args, options) => {
      calls++;
      assert.equal(executable, process.execPath);
      assert.equal(options.env.DATABASE_URL, 'file:./fixture.db');
      const config = args.at(-1);
      const workspace = path.dirname(config);
      const stagedSchema = fs.readFileSync(path.join(workspace, 'schema.prisma'), 'utf8');
      assert.match(stagedSchema, /provider = "sqlite"/);
      assert.ok(stagedSchema.includes(path.join(root, 'src/generated/prisma').replaceAll('\\', '/')));
      assert.match(fs.readFileSync(path.join(workspace, 'migrations/001/migration.sql'), 'utf8'), /TEXT/);
      assert.match(fs.readFileSync(config, 'utf8'), /base\.migrations/);
      // Source files are intact even while deployment is in progress.
      assert.deepEqual(snapshot(path.join(root, 'prisma')), before.filter(([name]) => name.startsWith('prisma/')).map(([name, bytes]) => [name.slice(7), bytes]));
      if ((failure === 'deploy' && calls === 1) || (failure === 'generate' && calls === 2)) {
        throw new Error('injected command failure');
      }
    };
    const deploy = () => deploySqliteMigrations({ backendRoot: root, reset: false, databaseUrl: 'file:./fixture.db', runCommand });
    if (failure === 'none') deploy();
    else assert.throws(deploy, failure === 'staging' ? /ENOENT/ : /injected command failure/);
    assert.equal(calls, failure === 'staging' ? 0 : failure === 'deploy' ? 1 : 2);
    assert.deepEqual(snapshot(root), before);
  });
}

test('SQLite deploy without generate only runs migrate deploy', (t) => {
  const root = fixture(t);
  let calls = 0;
  deploySqliteMigrations({
    backendRoot: root,
    reset: false,
    generate: false,
    databaseUrl: 'file:./fixture.db',
    runCommand: (_, args) => {
      calls++;
      assert.ok(args.includes('deploy'));
      assert.equal(args.includes('generate'), false);
    },
  });
  assert.equal(calls, 1);
});

test('SQLite upgrade deploy does not delete an existing database', (t) => {
  const root = fixture(t);
  const dbPath = path.join(root, 'prisma/upgrade.db');
  fs.writeFileSync(dbPath, 'existing-sqlite-bytes');
  deploySqliteMigrations({
    backendRoot: root,
    reset: false,
    generate: false,
    databaseUrl: 'file:./upgrade.db',
    runCommand: () => {},
  });
  assert.equal(fs.readFileSync(dbPath, 'utf8'), 'existing-sqlite-bytes');
});

test('SQLite reset deploy deletes an existing database', (t) => {
  const root = fixture(t);
  const dbPath = path.join(root, 'prisma/upgrade.db');
  fs.writeFileSync(dbPath, 'existing-sqlite-bytes');
  deploySqliteMigrations({
    backendRoot: root,
    reset: true,
    generate: false,
    databaseUrl: 'file:./upgrade.db',
    runCommand: () => {},
  });
  assert.equal(fs.existsSync(dbPath), false);
});

test('chronology workspace flag migration is additive on SQLite', () => {
  const db = new Database(':memory:');
  try {
    db.exec(`
      CREATE TABLE "Campaign" ("id" TEXT PRIMARY KEY, "eventCategoriesInitialized" BOOLEAN NOT NULL DEFAULT 0);
      INSERT INTO "Campaign" ("id") VALUES ('keep-me');
    `);
    const sql = fs.readFileSync(new URL('../migrations/20261101140000_chronology_workspaces_initialized/migration.sql', import.meta.url), 'utf8');
    db.exec(normalizeMigrationSqlForSqlite(sql));
    const row = db.prepare('SELECT id, chronologyWorkspacesInitialized FROM Campaign').get();
    assert.equal(row.id, 'keep-me');
    assert.equal(row.chronologyWorkspacesInitialized, 0);
  } finally {
    db.close();
  }
});

test('overlapping invocations own separate workspaces and cleanup', (t) => {
  const root = fixture(t);
  const before = snapshot(root);
  const workspaces = new Set();
  let nested = false;
  const runCommand = (_, args) => {
    const config = args.at(-1);
    workspaces.add(path.dirname(config));
    if (!nested) {
      nested = true;
      deploySqliteMigrations({ backendRoot: root, reset: false, runCommand });
      assert.ok(fs.existsSync(config), 'nested cleanup must preserve outer workspace');
    }
  };
  deploySqliteMigrations({ backendRoot: root, reset: false, runCommand });
  assert.equal(workspaces.size, 2);
  assert.deepEqual(snapshot(root), before);
});