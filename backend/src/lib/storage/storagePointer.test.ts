import assert from 'node:assert/strict';
import test from 'node:test';
import { FILESYSTEM_PROVIDER_ID } from './filesystemDriver.js';
import { S3_COMPATIBLE_PROVIDER_ID } from './storageProviderConfig.js';
import {
  formatStoragePointer,
  parseStoragePointer,
} from './storagePointer.js';

test('parseStoragePointer recognizes filesystem upload paths', () => {
  const parsed = parseStoragePointer('/uploads/abc.webp');
  assert.deepEqual(parsed, {
    providerId: FILESYSTEM_PROVIDER_ID,
    key: 'abc.webp',
  });
});

test('parseStoragePointer recognizes s3 pointers', () => {
  const parsed = parseStoragePointer('s3://abc.webp');
  assert.deepEqual(parsed, {
    providerId: S3_COMPATIBLE_PROVIDER_ID,
    key: 'abc.webp',
  });
});

test('formatStoragePointer round-trips provider keys', () => {
  assert.equal(formatStoragePointer(FILESYSTEM_PROVIDER_ID, 'abc.webp'), '/uploads/abc.webp');
  assert.equal(formatStoragePointer(S3_COMPATIBLE_PROVIDER_ID, 'abc.webp'), 's3://abc.webp');
});
