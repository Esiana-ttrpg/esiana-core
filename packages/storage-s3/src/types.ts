/**
 * Minimal storage driver contract for @esiana/storage-s3.
 * Mirrors backend/src/lib/storage/types.ts — kept local to avoid circular deps.
 */
import type { Readable } from 'node:stream';

export interface StorageObjectMetadata {
  key: string;
  sizeBytes: number;
  mimeType: string;
}

export interface StoragePutInput {
  key: string;
  body: Buffer | Readable;
  mimeType?: string;
}

export type StorageReadDelivery =
  | {
      type: 'stream';
      stream: Readable;
      sizeBytes?: number;
      mimeType?: string;
    }
  | {
      type: 'redirect';
      url: string;
      expiresAt?: Date;
    };

export interface StorageOpenReadOptions {
  key: string;
  preferRedirectAboveBytes?: number;
}

export interface StorageListObjectsOptions {
  prefix?: string;
  maxKeys?: number;
}

export interface StorageListedObject {
  key: string;
  sizeBytes: number;
}

export interface StorageHealthCheckResult {
  ok: boolean;
  detail?: string;
}

export interface StorageDriver {
  readonly providerId: string;
  put(input: StoragePutInput): Promise<StorageObjectMetadata>;
  openRead(options: StorageOpenReadOptions): Promise<StorageReadDelivery>;
  delete(key: string): Promise<void>;
  exists(key: string): Promise<boolean>;
  checkHealth?(): Promise<StorageHealthCheckResult>;
  listObjects?(options?: StorageListObjectsOptions): Promise<StorageListedObject[]>;
  statObject?(key: string): Promise<{ sizeBytes: number } | null>;
}

export interface StorageProviderRegistrationCapabilities {
  redirectDelivery?: boolean;
  metrics?: boolean;
  orphanDetection?: boolean;
}

export interface StorageProviderRegistration {
  providerId: string;
  displayName: string;
  version: string;
  factory: (config: Record<string, unknown>) => StorageDriver;
  resolveConfig?: () => Record<string, unknown>;
  capabilities: StorageProviderRegistrationCapabilities;
}

export type RegisterStorageProviderFn = (
  registration: StorageProviderRegistration,
) => void;
