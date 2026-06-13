import assert from 'node:assert/strict';
import test from 'node:test';
import { buildAssetLocation } from './assetLocation.js';
import { createFilesystemDriver } from './storage/filesystemDriver.js';
import { S3_COMPATIBLE_PROVIDER_ID } from './storage/storageProviderConfig.js';

test('buildAssetLocation maps filesystem keys to physical upload URLs', () => {
  const driver = createFilesystemDriver('/tmp/uploads');
  const location = buildAssetLocation(
    {
      original: 'abc.webp',
      display: 'abc-display.webp',
      thumbnail: 'abc-thumb.webp',
    },
    driver,
  );

  assert.equal(location.driverId, 'filesystem');
  assert.equal(location.urls.originalUrl, '/uploads/abc.webp');
  assert.equal(location.urls.displayUrl, '/uploads/abc-display.webp');
  assert.equal(location.urls.thumbnailUrl, '/uploads/abc-thumb.webp');
  assert.ok(!location.urls.originalUrl.includes('/api/assets/'));
});

test('buildAssetLocation maps s3-compatible keys to s3 pointers', () => {
  const driver = {
    providerId: S3_COMPATIBLE_PROVIDER_ID,
    put: async () => ({ key: 'x', sizeBytes: 0, mimeType: 'application/octet-stream' }),
    openRead: async () => {
      throw new Error('not implemented');
    },
    delete: async () => {},
    exists: async () => false,
  };

  const location = buildAssetLocation({ original: 'abc.webp' }, driver);
  assert.equal(location.urls.originalUrl, 's3://abc.webp');
});
