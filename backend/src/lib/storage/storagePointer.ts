import path from 'node:path';
import { FILESYSTEM_PROVIDER_ID } from './filesystemDriver.js';
import { S3_COMPATIBLE_PROVIDER_ID } from './storageProviderConfig.js';
import {
  resolveStorageProvider,
} from './storageRegistry.js';
import type { StorageDriver } from './types.js';

export interface ParsedStoragePointer {
  providerId: string;
  key: string;
}

/**
 * Parse a provider-managed storage pointer into owning provider + object key.
 * Pointer format is derived from the stored value — not from STORAGE_PROVIDER.
 *
 * v1 formats:
 *   filesystem: /uploads/{key}  (legacy path; future: filesystem://{key})
 *   s3-compatible: s3://{key}  (future v2: s3://{bucket}/{key})
 */
export function parseStoragePointer(pointer: string): ParsedStoragePointer | null {
  const trimmed = pointer.trim();
  if (!trimmed) return null;

  if (trimmed.startsWith('s3://')) {
    const key = trimmed.slice('s3://'.length).replace(/\\/g, '/');
    if (!key || key.includes('..') || key.startsWith('/')) return null;
    return { providerId: S3_COMPATIBLE_PROVIDER_ID, key };
  }

  if (trimmed.startsWith('/uploads/')) {
    const key = path.basename(trimmed);
    if (!key || key === '.' || key === '..') return null;
    return { providerId: FILESYSTEM_PROVIDER_ID, key };
  }

  return null;
}

export function formatStoragePointer(providerId: string, key: string): string {
  if (providerId === FILESYSTEM_PROVIDER_ID) {
    return `/uploads/${key}`;
  }
  if (providerId === S3_COMPATIBLE_PROVIDER_ID) {
    return `s3://${key}`;
  }
  throw new Error(`Unknown storage provider: ${providerId}`);
}

export function resolveDriverForPointer(pointer: string): {
  driver: StorageDriver;
  key: string;
} | null {
  const parsed = parseStoragePointer(pointer);
  if (!parsed) return null;

  const driver = resolveStorageProvider(parsed.providerId);
  if (!driver) return null;

  return { driver, key: parsed.key };
}
