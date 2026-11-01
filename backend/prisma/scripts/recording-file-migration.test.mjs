import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
import Database from 'better-sqlite3';
import { normalizeMigrationSqlForSqlite } from './sqliteSchema.mjs';

test('recording file migration preserves populated metadata and allows campaign cascades', () => {
  const db = new Database(':memory:');
  try {
    db.pragma('foreign_keys = ON');
    db.exec(`
      CREATE TABLE "Campaign" ("id" TEXT PRIMARY KEY);
      CREATE TABLE "Asset" ("id" TEXT PRIMARY KEY, "campaignId" TEXT REFERENCES "Campaign"("id") ON DELETE CASCADE);
      CREATE TABLE "SessionRecording" ("id" TEXT PRIMARY KEY, "campaignId" TEXT REFERENCES "Campaign"("id") ON DELETE CASCADE);
    `);
    const original = fs.readFileSync(new URL('../migrations/20261026120000_session_audio_processing/migration.sql', import.meta.url), 'utf8');
    const table = original.match(/CREATE TABLE "SessionRecordingFile" \([\s\S]*?\n\);/);
    assert.ok(table);
    db.exec(table[0]);
    db.exec(`
      INSERT INTO "Campaign" VALUES ('campaign');
      INSERT INTO "Asset" VALUES ('asset', 'campaign');
      INSERT INTO "SessionRecording" VALUES ('recording', 'campaign');
      INSERT INTO "SessionRecordingFile" VALUES ('file', 'recording', 'asset', 'session.wav', 0, 1000, 0, 16044, 'wav', 'audio/wav');
    `);
    const before = db.prepare('SELECT * FROM "SessionRecordingFile"').all();
    const migration = fs.readFileSync(new URL('../migrations/20261027130000_recording_file_asset_no_action/migration.sql', import.meta.url), 'utf8');
    db.exec(normalizeMigrationSqlForSqlite(migration));
    assert.deepEqual(db.prepare('SELECT * FROM "SessionRecordingFile"').all(), before);
    assert.deepEqual(db.pragma('foreign_key_check'), []);
    assert.throws(() => db.exec('DELETE FROM "Asset"'), /FOREIGN KEY/);
    db.exec('DELETE FROM "Campaign"');
    assert.deepEqual(db.prepare('SELECT * FROM "SessionRecordingFile"').all(), []);
    assert.deepEqual(db.prepare('SELECT * FROM "Asset"').all(), []);
  } finally { db.close(); }
});
