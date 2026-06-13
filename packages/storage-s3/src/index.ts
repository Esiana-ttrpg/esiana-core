import {
  createS3CompatibleDriver,
  parseS3DriverConfig,
  S3_COMPATIBLE_PROVIDER_ID,
  S3_DRIVER_VERSION,
} from './s3Driver.js';
import type { RegisterStorageProviderFn } from './types.js';

export {
  createS3CompatibleDriver,
  parseS3DriverConfig,
  S3_COMPATIBLE_PROVIDER_ID,
  S3_DRIVER_VERSION,
} from './s3Driver.js';
export type { S3CompatibleDriverConfig } from './s3Driver.js';
export type { RegisterStorageProviderFn } from './types.js';

export function registerS3CompatibleProvider(
  registerFn: RegisterStorageProviderFn,
  resolveConfigFn: () => Record<string, unknown>,
): void {
  registerFn({
    providerId: S3_COMPATIBLE_PROVIDER_ID,
    displayName: 'S3-Compatible Storage Driver',
    version: S3_DRIVER_VERSION,
    resolveConfig: resolveConfigFn,
    factory: (config) => createS3CompatibleDriver(parseS3DriverConfig(config)),
    capabilities: {
      redirectDelivery: true,
      metrics: true,
      orphanDetection: false,
    },
  });
}
