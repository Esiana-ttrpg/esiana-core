import {
  DeleteObjectCommand,
  GetObjectCommand,
  HeadBucketCommand,
  HeadObjectCommand,
  ListObjectsV2Command,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { Readable } from 'node:stream';
import type {
  StorageDriver,
  StorageHealthCheckResult,
  StorageListObjectsOptions,
  StorageListedObject,
  StorageObjectMetadata,
  StorageOpenReadOptions,
  StoragePutInput,
  StorageReadDelivery,
} from './types.js';

export const S3_COMPATIBLE_PROVIDER_ID = 's3-compatible';
export const S3_DRIVER_VERSION = '1.0.0';

export interface S3CompatibleDriverConfig {
  endpoint?: string;
  region: string;
  bucket: string;
  accessKeyId: string;
  secretAccessKey: string;
  forcePathStyle?: boolean;
}

function assertSafeKey(key: string): void {
  const normalized = key.replace(/\\/g, '/');
  if (!normalized || normalized.includes('..') || normalized.startsWith('/')) {
    throw new Error('Invalid storage key');
  }
}

function bodyToBuffer(body: unknown): Promise<Buffer> {
  if (Buffer.isBuffer(body)) return Promise.resolve(body);
  if (body instanceof Readable) {
    const chunks: Buffer[] = [];
    return new Promise((resolve, reject) => {
      body.on('data', (chunk) => chunks.push(Buffer.from(chunk)));
      body.on('error', reject);
      body.on('end', () => resolve(Buffer.concat(chunks)));
    });
  }
  return Promise.reject(new Error('Unsupported body type'));
}

export function createS3CompatibleDriver(
  config: S3CompatibleDriverConfig,
): StorageDriver {
  const client = new S3Client({
    region: config.region,
    endpoint: config.endpoint,
    forcePathStyle: config.forcePathStyle ?? Boolean(config.endpoint),
    credentials: {
      accessKeyId: config.accessKeyId,
      secretAccessKey: config.secretAccessKey,
    },
  });
  const bucket = config.bucket;

  return {
    providerId: S3_COMPATIBLE_PROVIDER_ID,

    async put(input: StoragePutInput): Promise<StorageObjectMetadata> {
      assertSafeKey(input.key);
      const body = Buffer.isBuffer(input.body)
        ? input.body
        : await bodyToBuffer(input.body);
      await client.send(
        new PutObjectCommand({
          Bucket: bucket,
          Key: input.key,
          Body: body,
          ContentType: input.mimeType ?? 'application/octet-stream',
        }),
      );
      return {
        key: input.key,
        sizeBytes: body.length,
        mimeType: input.mimeType ?? 'application/octet-stream',
      };
    },

    async openRead(options: StorageOpenReadOptions): Promise<StorageReadDelivery> {
      assertSafeKey(options.key);
      const head = await client.send(
        new HeadObjectCommand({ Bucket: bucket, Key: options.key }),
      );
      const sizeBytes = head.ContentLength ?? 0;
      const mimeType = head.ContentType ?? undefined;
      const threshold = options.preferRedirectAboveBytes ?? 0;

      if (threshold > 0 && sizeBytes > threshold) {
        const command = new GetObjectCommand({ Bucket: bucket, Key: options.key });
        const url = await getSignedUrl(client, command, { expiresIn: 3600 });
        return { type: 'redirect', url, expiresAt: new Date(Date.now() + 3600_000) };
      }

      const response = await client.send(
        new GetObjectCommand({ Bucket: bucket, Key: options.key }),
      );
      if (!response.Body) {
        throw new Error('Storage object not found');
      }

      const stream =
        response.Body instanceof Readable
          ? response.Body
          : Readable.from(response.Body as AsyncIterable<Uint8Array>);

      return {
        type: 'stream',
        stream,
        sizeBytes,
        mimeType,
      };
    },

    async delete(key: string): Promise<void> {
      assertSafeKey(key);
      await client.send(new DeleteObjectCommand({ Bucket: bucket, Key: key }));
    },

    async exists(key: string): Promise<boolean> {
      assertSafeKey(key);
      try {
        await client.send(new HeadObjectCommand({ Bucket: bucket, Key: key }));
        return true;
      } catch {
        return false;
      }
    },

    async checkHealth(): Promise<StorageHealthCheckResult> {
      try {
        await client.send(new HeadBucketCommand({ Bucket: bucket }));
        return { ok: true };
      } catch (error) {
        return {
          ok: false,
          detail:
            error instanceof Error ? error.message : 'S3 bucket health check failed',
        };
      }
    },

    async listObjects(
      options: StorageListObjectsOptions = {},
    ): Promise<StorageListedObject[]> {
      const maxKeys = options.maxKeys ?? 1000;
      const response = await client.send(
        new ListObjectsV2Command({
          Bucket: bucket,
          Prefix: options.prefix,
          MaxKeys: maxKeys,
        }),
      );
      return (response.Contents ?? [])
        .filter((item) => item.Key)
        .map((item) => ({
          key: item.Key!,
          sizeBytes: item.Size ?? 0,
        }));
    },

    async statObject(key: string): Promise<{ sizeBytes: number } | null> {
      assertSafeKey(key);
      try {
        const head = await client.send(
          new HeadObjectCommand({ Bucket: bucket, Key: key }),
        );
        return { sizeBytes: head.ContentLength ?? 0 };
      } catch {
        return null;
      }
    },
  };
}

export function parseS3DriverConfig(
  config: Record<string, unknown>,
): S3CompatibleDriverConfig {
  return {
    endpoint:
      typeof config.endpoint === 'string' && config.endpoint.trim()
        ? config.endpoint.trim()
        : undefined,
    region: String(config.region ?? ''),
    bucket: String(config.bucket ?? ''),
    accessKeyId: String(config.accessKeyId ?? ''),
    secretAccessKey: String(config.secretAccessKey ?? ''),
    forcePathStyle:
      config.forcePathStyle === true ||
      Boolean(
        typeof config.endpoint === 'string' &&
          config.endpoint.trim() &&
          config.forcePathStyle !== false,
      ),
  };
}
