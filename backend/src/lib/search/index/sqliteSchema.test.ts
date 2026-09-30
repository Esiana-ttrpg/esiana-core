/**
 * Unit tests for Postgres→SQLite schema/migration normalizers.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  normalizeMigrationSqlForSqlite,
  normalizeSchemaPrismaForSqlite,
} from '../../../../prisma/scripts/sqliteSchema.mjs';

test('normalizeSchemaPrismaForSqlite swaps provider and strips tsvector/Gin', () => {
  const input = `
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}
model SearchIndexDocument {
  partyVector    Unsupported("tsvector")?
  elevatedVector Unsupported("tsvector")?
  @@index([partyVector], type: Gin)
  @@index([elevatedVector], type: Gin)
}
`;
  const out = normalizeSchemaPrismaForSqlite(input);
  assert.match(out, /provider = "sqlite"/);
  assert.doesNotMatch(out, /postgresql/);
  assert.doesNotMatch(out, /Unsupported\("tsvector"\)/);
  assert.match(out, /partyVector\s+String\?/);
  assert.doesNotMatch(out, /type:\s*Gin/);
  assert.match(out, /@@index\(\[partyVector\]\)/);
});

test('normalizeMigrationSqlForSqlite rewrites types and drops GIN indexes', () => {
  const sql = `
CREATE TABLE "SearchIndexDocument" (
  "sourceUpdatedAt" TIMESTAMP(3) NOT NULL,
  "meta" JSONB,
  "partyVector" tsvector,
  "elevatedVector" tsvector
);
CREATE INDEX "SearchIndexDocument_partyVector_idx" ON "SearchIndexDocument" USING GIN ("partyVector");
CREATE INDEX "SearchIndexDocument_campaignId_typeKey_idx" ON "SearchIndexDocument"("campaignId", "typeKey");
`;
  const out = normalizeMigrationSqlForSqlite(sql);
  assert.match(out, /DATETIME/);
  assert.doesNotMatch(out, /TIMESTAMP\(3\)/);
  assert.match(out, /TEXT/);
  assert.doesNotMatch(out, /JSONB/);
  assert.doesNotMatch(out, /\btsvector\b/);
  assert.doesNotMatch(out, /USING\s+GIN/i);
  assert.match(out, /SearchIndexDocument_campaignId_typeKey_idx/);
  assert.doesNotMatch(out, /SearchIndexDocument_partyVector_idx/);
});
