import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
import Database from 'better-sqlite3';
import { normalizeMigrationSqlForSqlite } from './sqliteSchema.mjs';

test('audio contributor migration maps flags onto role grants without expanding access', () => {
  const db = new Database(':memory:');
  try {
    db.exec(`
      CREATE TABLE "Campaign" ("id" TEXT PRIMARY KEY);
      CREATE TABLE "CampaignAudioSettings" (
        "campaignId" TEXT PRIMARY KEY REFERENCES "Campaign"("id"),
        "enabled" BOOLEAN NOT NULL DEFAULT 1,
        "allowContributors" BOOLEAN NOT NULL DEFAULT 0,
        "allowChapters" BOOLEAN NOT NULL DEFAULT 0,
        "allowTranscripts" BOOLEAN NOT NULL DEFAULT 0
      );
      CREATE TABLE "CampaignRoleCapabilityOverride" (
        "id" TEXT PRIMARY KEY,
        "campaignId" TEXT NOT NULL,
        "role" TEXT NOT NULL,
        "capability" TEXT NOT NULL,
        "effect" TEXT NOT NULL,
        "createdAt" DATETIME,
        "updatedAt" DATETIME
      );
      CREATE UNIQUE INDEX "CampaignRoleCapabilityOverride_campaignId_role_capability_key"
        ON "CampaignRoleCapabilityOverride"("campaignId", "role", "capability");
      INSERT INTO "Campaign" VALUES ('default'), ('contributors'), ('inert-chapters'),
        ('live-chapters'), ('writer-no-assets'), ('writer-no-manage'), ('writer-no-manage-flags');
      INSERT INTO "CampaignAudioSettings" ("campaignId", "allowContributors", "allowChapters", "allowTranscripts") VALUES
        ('default', 0, 0, 0),
        ('contributors', 1, 0, 0),
        ('inert-chapters', 0, 0, 0),
        ('live-chapters', 0, 1, 0),
        ('writer-no-assets', 0, 0, 0),
        ('writer-no-manage', 0, 0, 0),
        ('writer-no-manage-flags', 0, 1, 1);
      INSERT INTO "CampaignRoleCapabilityOverride"
        ("id", "campaignId", "role", "capability", "effect", "createdAt", "updatedAt") VALUES
        ('inert', 'inert-chapters', 'PARTICIPANT', 'audio.chapters.edit', 'GRANT', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
        ('live', 'live-chapters', 'PARTICIPANT', 'audio.chapters.edit', 'GRANT', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
        ('no-assets', 'writer-no-assets', 'WRITER', 'assets.upload', 'REVOKE', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
        ('no-manage', 'writer-no-manage', 'WRITER', 'audio.manage', 'REVOKE', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
        ('no-manage-flags', 'writer-no-manage-flags', 'WRITER', 'audio.manage', 'REVOKE', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);
    `);
    const sql = fs.readFileSync(new URL('../migrations/20261101030000_audio_contributor_role_grants/migration.sql', import.meta.url), 'utf8');
    db.exec(normalizeMigrationSqlForSqlite(sql));
    const rows = db.prepare(
      'SELECT "campaignId", "role", "capability", "effect" FROM "CampaignRoleCapabilityOverride" ORDER BY "campaignId", "role", "capability"',
    ).all();
    assert.deepEqual(rows, [
      { campaignId: 'contributors', role: 'PARTICIPANT', capability: 'audio.upload', effect: 'GRANT' },
      { campaignId: 'live-chapters', role: 'PARTICIPANT', capability: 'audio.chapters.edit', effect: 'GRANT' },
      { campaignId: 'writer-no-assets', role: 'WRITER', capability: 'assets.upload', effect: 'REVOKE' },
      { campaignId: 'writer-no-assets', role: 'WRITER', capability: 'audio.upload', effect: 'REVOKE' },
      { campaignId: 'writer-no-manage', role: 'WRITER', capability: 'audio.chapters.edit', effect: 'REVOKE' },
      { campaignId: 'writer-no-manage', role: 'WRITER', capability: 'audio.manage', effect: 'REVOKE' },
      { campaignId: 'writer-no-manage', role: 'WRITER', capability: 'audio.transcript.edit', effect: 'REVOKE' },
      { campaignId: 'writer-no-manage', role: 'WRITER', capability: 'audio.upload', effect: 'REVOKE' },
      { campaignId: 'writer-no-manage-flags', role: 'WRITER', capability: 'audio.manage', effect: 'REVOKE' },
      { campaignId: 'writer-no-manage-flags', role: 'WRITER', capability: 'audio.upload', effect: 'REVOKE' },
    ]);
    const columns = db.pragma('table_info(CampaignAudioSettings)').map((column) => column.name);
    assert.deepEqual(columns, ['campaignId', 'enabled']);
    assert.equal(rows.some((row) => row.campaignId === 'default'), false);
    assert.equal(rows.some((row) => row.campaignId === 'inert-chapters'), false);
  } finally {
    db.close();
  }
});
