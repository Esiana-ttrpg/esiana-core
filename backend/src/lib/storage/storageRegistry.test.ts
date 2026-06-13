import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { createFilesystemDriver } from './filesystemDriver.js';
import {
  ActiveStorageUnavailableError,
  bootstrapStorageRegistry,
  clearStorageRegistryForTests,
  getActiveStorageDriver,
  getRegisteredProviders,
  initializeActiveStorageProvider,
  listStorageProviders,
  registerStorageProvider,
} from './storageRegistry.js';

test('filesystem driver put/openRead/delete round trip', async () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'esiana-storage-'));
  const driver = createFilesystemDriver(root);

  const meta = await driver.put({
    key: 'test.webp',
    body: Buffer.from('hello'),
    mimeType: 'image/webp',
  });
  assert.equal(meta.key, 'test.webp');
  assert.equal(await driver.exists('test.webp'), true);

  const delivery = await driver.openRead({ key: 'test.webp' });
  assert.equal(delivery.type, 'stream');
  if (delivery.type === 'stream') {
    const chunks: Buffer[] = [];
    for await (const chunk of delivery.stream) {
      chunks.push(Buffer.from(chunk));
    }
    assert.equal(Buffer.concat(chunks).toString('utf8'), 'hello');
  }

  await driver.delete('test.webp');
  assert.equal(await driver.exists('test.webp'), false);
});

test('storage registry resolves active filesystem provider', () => {
  clearStorageRegistryForTests();
  bootstrapStorageRegistry();
  initializeActiveStorageProvider();
  const driver = getActiveStorageDriver();
  assert.equal(driver.providerId, 'filesystem');
  clearStorageRegistryForTests();
});

test('getRegisteredProviders returns metadata without instantiating drivers', () => {
  clearStorageRegistryForTests();
  bootstrapStorageRegistry();
  registerStorageProvider('remote-object', () => ({
    providerId: 'remote-object',
    put: async () => ({ key: 'x', sizeBytes: 0, mimeType: 'application/octet-stream' }),
    openRead: async () => {
      throw new Error('stub');
    },
    delete: async () => {},
    exists: async () => false,
  }), {
    displayName: 'Remote Stub',
    version: '0.0.1',
    capabilities: { metrics: false },
  });

  const providers = getRegisteredProviders();
  assert.deepEqual(listStorageProviders(), ['filesystem', 'remote-object']);
  assert.equal(providers.length, 2);
  assert.equal(providers[0]?.providerId, 'filesystem');
  assert.equal(providers[1]?.displayName, 'Remote Stub');
  clearStorageRegistryForTests();
});

test('degraded active provider rejects writes', () => {
  clearStorageRegistryForTests();
  bootstrapStorageRegistry();
  registerStorageProvider('s3-compatible', () => ({
    providerId: 's3-compatible',
    put: async () => ({ key: 'x', sizeBytes: 0, mimeType: 'application/octet-stream' }),
    openRead: async () => ({ type: 'stream', stream: (await import('node:stream')).Readable.from([]) }),
    delete: async () => {},
    exists: async () => false,
  }), {
    capabilities: { metrics: true },
  });

  const originalProvider = process.env.STORAGE_PROVIDER;
  const originalBucket = process.env.S3_BUCKET;
  const originalRegion = process.env.S3_REGION;
  const originalKey = process.env.S3_ACCESS_KEY_ID;
  const originalSecret = process.env.S3_SECRET_ACCESS_KEY;

  process.env.STORAGE_PROVIDER = 's3-compatible';
  delete process.env.S3_BUCKET;
  delete process.env.S3_REGION;
  delete process.env.S3_ACCESS_KEY_ID;
  delete process.env.S3_SECRET_ACCESS_KEY;

  try {
    initializeActiveStorageProvider();
    assert.throws(
      () => getActiveStorageDriver(),
      ActiveStorageUnavailableError,
    );
  } finally {
    process.env.STORAGE_PROVIDER = originalProvider;
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
