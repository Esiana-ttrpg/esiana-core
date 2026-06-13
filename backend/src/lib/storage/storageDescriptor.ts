import type {
  StorageDriver,
  StorageDriverCapabilities,
  StorageDriverInfo,
  StorageProviderRegistration,
} from './types.js';
import { FILESYSTEM_PROVIDER_ID } from './filesystemDriver.js';
import { getRegistration, getProviderHealth } from './storageRegistry.js';

export const FILESYSTEM_DRIVER_VERSION = '1.0.0';

export function describeFilesystemCapabilities(): StorageDriverCapabilities {
  return {
    upload: true,
    read: true,
    delete: true,
    thumbnailStorage: true,
    redirectDelivery: false,
    presignedUpload: false,
  };
}

export function describeStorageDriverFromRegistration(
  registration: StorageProviderRegistration,
  options?: { isActive?: boolean },
): StorageDriverInfo {
  const health = getProviderHealth(registration.providerId);
  return {
    driverId: registration.providerId,
    displayName: registration.displayName,
    version: registration.version,
    capabilities: describeCapabilitiesFromRegistration(registration),
    registrationCapabilities: registration.capabilities,
    health: health.state,
    healthDetail: health.detail,
    isActive: options?.isActive ?? false,
  };
}

function describeCapabilitiesFromRegistration(
  registration: StorageProviderRegistration,
): StorageDriverCapabilities {
  const isFilesystem = registration.providerId === FILESYSTEM_PROVIDER_ID;
  if (isFilesystem) {
    return describeFilesystemCapabilities();
  }

  return {
    upload: true,
    read: true,
    delete: true,
    thumbnailStorage: true,
    redirectDelivery: registration.capabilities.redirectDelivery ?? false,
    presignedUpload: false,
  };
}

export function describeStorageDriver(
  driver: StorageDriver,
  options?: { isActive?: boolean },
): StorageDriverInfo {
  const registration = getRegistration(driver.providerId);
  if (registration) {
    return describeStorageDriverFromRegistration(registration, options);
  }

  const health = getProviderHealth(driver.providerId);
  return {
    driverId: driver.providerId,
    displayName: driver.providerId,
    version: 'unknown',
    capabilities: {
      upload: typeof driver.put === 'function',
      read: typeof driver.openRead === 'function',
      delete: typeof driver.delete === 'function',
      thumbnailStorage: true,
      redirectDelivery: typeof driver.openRead === 'function',
      presignedUpload: typeof driver.createUploadTarget === 'function',
    },
    registrationCapabilities: {},
    health: health.state,
    healthDetail: health.detail,
    isActive: options?.isActive ?? false,
  };
}
