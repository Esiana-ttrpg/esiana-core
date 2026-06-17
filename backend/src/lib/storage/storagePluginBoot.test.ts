import assert from 'node:assert/strict';
import test from 'node:test';
import {
  ActiveStorageUnavailableError,
  bootstrapStorageRegistry,
  clearStorageRegistryForTests,
  getActiveStorageDriver,
  getRegisteredProviders,
  initializeActiveStorageProvider,
  registerStorageProvider,
} from './storageRegistry.js';
import { S3_COMPATIBLE_PROVIDER_ID } from './storageProviderConfig.js';

test('enabled storage plugin registers s3-compatible provider', () => {
  clearStorageRegistryForTests();
  bootstrapStorageRegistry();
  registerStorageProvider('s3-compatible', () => ({
    providerId: 's3-compatible',
    put: async () => ({ key: 'x', sizeBytes: 0, mimeType: 'application/octet-stream' }),
    openRead: async () => ({ type: 'stream', stream: (await import('node:stream')).Readable.from([]) }),
    delete: async () => {},
    exists: async () => false,
  }), {
    displayName: 'S3-Compatible Storage Driver',
    version: '1.0.0',
    capabilities: { redirectDelivery: true, metrics: true },
  });

  const originalProvider = process.env.STORAGE_PROVIDER;
  const originalBucket = process.env.S3_BUCKET;
  const originalRegion = process.env.S3_REGION;
  const originalKey = process.env.S3_ACCESS_KEY_ID;
  const originalSecret = process.env.S3_SECRET_ACCESS_KEY;

  process.env.STORAGE_PROVIDER = 's3-compatible';
  process.env.S3_BUCKET = 'test-bucket';
  process.env.S3_REGION = 'us-east-1';
  process.env.S3_ACCESS_KEY_ID = 'key';
  process.env.S3_SECRET_ACCESS_KEY = 'secret';

  try {
    initializeActiveStorageProvider();
    assert.equal(getRegisteredProviders().some((p) => p.providerId === S3_COMPATIBLE_PROVIDER_ID), true);
    assert.equal(getActiveStorageDriver().providerId, S3_COMPATIBLE_PROVIDER_ID);
  } finally {
    if (originalProvider !== undefined) process.env.STORAGE_PROVIDER = originalProvider;
    else delete process.env.STORAGE_PROVIDER;
    if (originalBucket !== undefined) process.env.S3_BUCKET = originalBucket;
    else delete process.env.S3_BUCKET;
    if (originalRegion !== undefined) process.env.S3_REGION = originalRegion;
    else delete process.env.S3_REGION;
    if (originalKey !== undefined) process.env.S3_ACCESS_KEY_ID = originalKey;
    else delete process.env.S3_ACCESS_KEY_ID;
    if (originalSecret !== undefined) process.env.S3_SECRET_ACCESS_KEY = originalSecret;
    else delete process.env.S3_SECRET_ACCESS_KEY;
  }
  clearStorageRegistryForTests();
});

test('disabled storage plugin leaves s3-compatible unregistered and degraded', () => {
  clearStorageRegistryForTests();
  bootstrapStorageRegistry();

  const originalProvider = process.env.STORAGE_PROVIDER;
  process.env.STORAGE_PROVIDER = 's3-compatible';

  try {
    initializeActiveStorageProvider();
    assert.equal(
      getRegisteredProviders().some((p) => p.providerId === S3_COMPATIBLE_PROVIDER_ID),
      false,
    );
    assert.throws(() => getActiveStorageDriver(), ActiveStorageUnavailableError);
  } finally {
    if (originalProvider !== undefined) process.env.STORAGE_PROVIDER = originalProvider;
    else delete process.env.STORAGE_PROVIDER;
  }
  clearStorageRegistryForTests();
});
