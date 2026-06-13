import assert from 'node:assert/strict';
import test from 'node:test';
import { createFilesystemDriver } from './filesystemDriver.js';
import {
  describeFilesystemCapabilities,
  describeStorageDriver,
  FILESYSTEM_DRIVER_VERSION,
} from './storageDescriptor.js';
import {
  bootstrapStorageRegistry,
  clearStorageRegistryForTests,
} from './storageRegistry.js';

test('describeFilesystemCapabilities reports full filesystem support', () => {
  const caps = describeFilesystemCapabilities();
  assert.equal(caps.upload, true);
  assert.equal(caps.read, true);
  assert.equal(caps.delete, true);
  assert.equal(caps.thumbnailStorage, true);
  assert.equal(caps.redirectDelivery, false);
  assert.equal(caps.presignedUpload, false);
});

test('describeStorageDriver shapes filesystem driver info', () => {
  clearStorageRegistryForTests();
  bootstrapStorageRegistry();
  const driver = createFilesystemDriver('/tmp/esiana-test-uploads');
  const info = describeStorageDriver(driver, { isActive: true });

  assert.equal(info.driverId, 'filesystem');
  assert.equal(info.displayName, 'Filesystem Storage Driver');
  assert.equal(info.version, FILESYSTEM_DRIVER_VERSION);
  assert.equal(info.isActive, true);
  assert.equal(info.capabilities.upload, true);
  assert.equal(info.capabilities.thumbnailStorage, true);
  assert.equal(info.registrationCapabilities.metrics, true);
  clearStorageRegistryForTests();
});
