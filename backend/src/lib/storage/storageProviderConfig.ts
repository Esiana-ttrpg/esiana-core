import fs from 'node:fs';
import { env } from '../../config/env.js';
import { FILESYSTEM_PROVIDER_ID } from './filesystemDriver.js';

export const S3_COMPATIBLE_PROVIDER_ID = 's3-compatible';

const S3_REQUIRED_ENV = [
  'S3_BUCKET',
  'S3_REGION',
  'S3_ACCESS_KEY_ID',
  'S3_SECRET_ACCESS_KEY',
] as const;

export interface S3CompatibleConfig {
  endpoint?: string;
  region: string;
  bucket: string;
  accessKeyId: string;
  secretAccessKey: string;
  forcePathStyle: boolean;
}

export function resolveFilesystemConfig(): Record<string, unknown> {
  return { uploadsDir: env.uploadsDir };
}

export function resolveS3CompatibleConfig(): S3CompatibleConfig {
  const endpoint = process.env.S3_ENDPOINT?.trim() || undefined;
  return {
    endpoint,
    region: process.env.S3_REGION?.trim() ?? '',
    bucket: process.env.S3_BUCKET?.trim() ?? '',
    accessKeyId: process.env.S3_ACCESS_KEY_ID?.trim() ?? '',
    secretAccessKey: process.env.S3_SECRET_ACCESS_KEY?.trim() ?? '',
    forcePathStyle:
      process.env.S3_FORCE_PATH_STYLE === 'true' ||
      (endpoint !== undefined && process.env.S3_FORCE_PATH_STYLE !== 'false'),
  };
}

export function validateFilesystemConfig(): { ok: true } | { ok: false; error: string } {
  if (!env.uploadsDir.trim()) {
    return { ok: false, error: 'UPLOADS_DIR is not configured' };
  }
  return { ok: true };
}

export function validateS3CompatibleConfig(
  config: S3CompatibleConfig = resolveS3CompatibleConfig(),
): { ok: true } | { ok: false; error: string } {
  for (const key of S3_REQUIRED_ENV) {
    const value = process.env[key]?.trim();
    if (!value) {
      return { ok: false, error: `Missing required environment variable: ${key}` };
    }
  }
  if (!config.bucket) {
    return { ok: false, error: 'Missing required environment variable: S3_BUCKET' };
  }
  return { ok: true };
}

export function validateProviderConfig(
  providerId: string,
): { ok: true } | { ok: false; error: string } {
  if (providerId === FILESYSTEM_PROVIDER_ID) {
    return validateFilesystemConfig();
  }
  if (providerId === S3_COMPATIBLE_PROVIDER_ID) {
    return validateS3CompatibleConfig();
  }
  return { ok: true };
}

export function sanitizeConfigSummary(providerId: string): Record<string, unknown> {
  if (providerId === FILESYSTEM_PROVIDER_ID) {
    return { providerId, uploadsDir: env.uploadsDir };
  }
  if (providerId === S3_COMPATIBLE_PROVIDER_ID) {
    const config = resolveS3CompatibleConfig();
    let endpointHost: string | undefined;
    if (config.endpoint) {
      try {
        endpointHost = new URL(config.endpoint).host;
      } catch {
        endpointHost = config.endpoint;
      }
    }
    return {
      providerId,
      bucket: config.bucket || undefined,
      endpointHost,
      region: config.region || undefined,
    };
  }
  return { providerId };
}
