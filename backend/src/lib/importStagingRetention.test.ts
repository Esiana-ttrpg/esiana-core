import assert from 'node:assert/strict';
import test from 'node:test';
import {
  buildImportStagingAssetData,
  computeImportStagingExpiresAt,
  IMPORT_STAGING_ASSET_TYPES,
  IMPORT_STAGING_RETENTION_MS,
  isImportStagingAssetType,
} from './importStagingRetention.js';

test('IMPORT_STAGING_RETENTION_MS is 3 days', () => {
  assert.equal(IMPORT_STAGING_RETENTION_MS, 3 * 24 * 60 * 60 * 1000);
});

test('computeImportStagingExpiresAt adds retention window', () => {
  const nowMs = Date.UTC(2026, 4, 1, 12, 0, 0);
  const expiresAt = computeImportStagingExpiresAt(nowMs);
  assert.equal(expiresAt.getTime(), nowMs + IMPORT_STAGING_RETENTION_MS);
});

test('buildImportStagingAssetData returns staging asset fields', () => {
  const nowMs = Date.UTC(2026, 4, 1, 12, 0, 0);
  const data = buildImportStagingAssetData({
    campaignId: 'camp-1',
    url: '/uploads/campaign-camp-1-import.zip',
    type: 'campaign-import-zip',
    nowMs,
  });

  assert.equal(data.campaignId, 'camp-1');
  assert.equal(data.url, '/uploads/campaign-camp-1-import.zip');
  assert.equal(data.type, 'campaign-import-zip');
  assert.equal(data.expiresAt.getTime(), nowMs + IMPORT_STAGING_RETENTION_MS);
});

test('isImportStagingAssetType recognizes known staging types', () => {
  for (const type of IMPORT_STAGING_ASSET_TYPES) {
    assert.equal(isImportStagingAssetType(type), true);
  }
  assert.equal(isImportStagingAssetType('campaign-cover'), false);
  assert.equal(isImportStagingAssetType('generic'), false);
});
