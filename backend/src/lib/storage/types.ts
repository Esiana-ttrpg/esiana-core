import type { Readable } from 'node:stream';

/** Normalized object metadata returned to the core platform (provider-agnostic). */
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
  /** When object size exceeds this threshold, prefer redirect delivery if supported. */
  preferRedirectAboveBytes?: number;
}

export interface StorageUploadTarget {
  type: 'stream';
}

export interface StorageRedirectUploadTarget {
  type: 'redirect';
  url: string;
  method: 'PUT' | 'POST';
  expiresAt?: Date;
}

export interface StorageListObjectsOptions {
  prefix?: string;
  maxKeys?: number;
}

export interface StorageListedObject {
  key: string;
  sizeBytes: number;
}

export type StorageDriverFactory = (
  config: Record<string, unknown>,
) => StorageDriver | Promise<StorageDriver>;

export type StorageProviderHealthState = 'uninitialized' | 'healthy' | 'degraded';

/** Declared at registration — drives admin UI without instantiating drivers. */
export interface StorageProviderRegistrationCapabilities {
  redirectDelivery?: boolean;
  metrics?: boolean;
  orphanDetection?: boolean;
}

export interface StorageProviderRegistration {
  providerId: string;
  displayName: string;
  version: string;
  factory: StorageDriverFactory;
  resolveConfig?: () => Record<string, unknown>;
  capabilities: StorageProviderRegistrationCapabilities;
}

export interface StorageProviderSnapshot {
  providerId: string;
  displayName: string;
  version: string;
  capabilities: StorageProviderRegistrationCapabilities;
  health: StorageProviderHealthState;
  healthDetail?: string;
  isActive: boolean;
}

export interface StorageDriverCapabilities {
  upload: boolean;
  read: boolean;
  delete: boolean;
  thumbnailStorage: boolean;
  redirectDelivery?: boolean;
  presignedUpload?: boolean;
}

export interface StorageDriverInfo {
  driverId: string;
  displayName: string;
  version: string;
  capabilities: StorageDriverCapabilities;
  registrationCapabilities: StorageProviderRegistrationCapabilities;
  health: StorageProviderHealthState;
  healthDetail?: string;
  isActive: boolean;
}

export interface StorageHealthCheckResult {
  ok: boolean;
  detail?: string;
}

/**
 * Technology-neutral storage contract. Implementations register via StorageRegistry.
 */
export interface StorageDriver {
  readonly providerId: string;
  put(input: StoragePutInput): Promise<StorageObjectMetadata>;
  openRead(options: StorageOpenReadOptions): Promise<StorageReadDelivery>;
  delete(key: string): Promise<void>;
  exists(key: string): Promise<boolean>;
  checkHealth?(): Promise<StorageHealthCheckResult>;
  listObjects?(options?: StorageListObjectsOptions): Promise<StorageListedObject[]>;
  /** Best-effort size lookup for admin metrics (bounded batches). */
  statObject?(key: string): Promise<{ sizeBytes: number } | null>;
  createUploadTarget?(options: {
    key: string;
    mimeType?: string;
    expiresInSeconds?: number;
  }): Promise<StorageUploadTarget | StorageRedirectUploadTarget>;
}

export interface SanitizedStorageConfigSummary {
  providerId: string;
  uploadsDir?: string;
  bucket?: string;
  endpointHost?: string;
  region?: string;
}
