import type { StorageDriver } from './storage/types.js';
import { FILESYSTEM_PROVIDER_ID } from './storage/filesystemDriver.js';
import { S3_COMPATIBLE_PROVIDER_ID } from './storage/storageProviderConfig.js';
import { formatStoragePointer } from './storage/storagePointer.js';

export interface AssetStorageKeys {
  original: string;
  display?: string;
  thumbnail?: string;
}

export interface AssetStorageUrls {
  originalUrl: string;
  displayUrl?: string;
  thumbnailUrl?: string;
}

export interface AssetLocation {
  keys: AssetStorageKeys;
  urls: AssetStorageUrls;
  driverId: string;
}

/**
 * Map storage keys to provider-managed pointers for Asset row URL columns.
 * Uses the active write provider only — not pointer ownership for reads.
 */
export function buildAssetLocation(
  keys: AssetStorageKeys,
  driver: StorageDriver,
): AssetLocation {
  const driverId = driver.providerId;

  return {
    keys,
    driverId,
    urls: {
      originalUrl: formatStoragePointer(driverId, keys.original),
      displayUrl: keys.display
        ? formatStoragePointer(driverId, keys.display)
        : undefined,
      thumbnailUrl: keys.thumbnail
        ? formatStoragePointer(driverId, keys.thumbnail)
        : undefined,
    },
  };
}

export function physicalUrlForFilesystemKey(key: string): string {
  return formatStoragePointer(FILESYSTEM_PROVIDER_ID, key);
}

export function assetReferenceUrl(assetId: string): string {
  return `/api/assets/${assetId}`;
}

export { FILESYSTEM_PROVIDER_ID, S3_COMPATIBLE_PROVIDER_ID };
