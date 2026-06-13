import fs from 'node:fs';
import path from 'node:path';
import { pipeline } from 'node:stream/promises';
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

export const FILESYSTEM_PROVIDER_ID = 'filesystem';

function assertSafeKey(key: string): void {
  const normalized = key.replace(/\\/g, '/');
  const base = path.basename(normalized);
  if (!base || base === '.' || normalized.includes('..') || base !== normalized) {
    throw new Error('Invalid storage key');
  }
}

export function createFilesystemDriver(rootDir: string): StorageDriver {
  return {
    providerId: FILESYSTEM_PROVIDER_ID,

    async put(input: StoragePutInput): Promise<StorageObjectMetadata> {
      assertSafeKey(input.key);
      await fs.promises.mkdir(rootDir, { recursive: true });
      const filePath = path.join(rootDir, input.key);

      if (Buffer.isBuffer(input.body)) {
        await fs.promises.writeFile(filePath, input.body);
      } else {
        await pipeline(input.body, fs.createWriteStream(filePath));
      }

      const stat = await fs.promises.stat(filePath);
      return {
        key: input.key,
        sizeBytes: stat.size,
        mimeType: input.mimeType ?? 'application/octet-stream',
      };
    },

    async openRead(options: StorageOpenReadOptions): Promise<StorageReadDelivery> {
      assertSafeKey(options.key);
      const filePath = path.join(rootDir, options.key);
      if (!fs.existsSync(filePath)) {
        throw new Error('Storage object not found');
      }
      const stat = await fs.promises.stat(filePath);
      return {
        type: 'stream',
        stream: fs.createReadStream(filePath),
        sizeBytes: stat.size,
      };
    },

    async delete(key: string): Promise<void> {
      assertSafeKey(key);
      const filePath = path.join(rootDir, key);
      if (!fs.existsSync(filePath)) return;
      await fs.promises.unlink(filePath);
    },

    async exists(key: string): Promise<boolean> {
      assertSafeKey(key);
      return fs.existsSync(path.join(rootDir, key));
    },

    async checkHealth(): Promise<StorageHealthCheckResult> {
      try {
        await fs.promises.mkdir(rootDir, { recursive: true });
        await fs.promises.access(rootDir, fs.constants.W_OK);
        return { ok: true };
      } catch (error) {
        return {
          ok: false,
          detail:
            error instanceof Error
              ? error.message
              : 'Filesystem uploads directory is not writable',
        };
      }
    },

    async listObjects(
      options: StorageListObjectsOptions = {},
    ): Promise<StorageListedObject[]> {
      if (!fs.existsSync(rootDir)) return [];
      const maxKeys = options.maxKeys ?? 10_000;
      const prefix = options.prefix ?? '';
      const entries = fs.readdirSync(rootDir, { withFileTypes: true });
      const objects: StorageListedObject[] = [];

      for (const entry of entries) {
        if (!entry.isFile()) continue;
        if (prefix && !entry.name.startsWith(prefix)) continue;
        const filePath = path.join(rootDir, entry.name);
        const stat = fs.statSync(filePath);
        objects.push({ key: entry.name, sizeBytes: stat.size });
        if (objects.length >= maxKeys) break;
      }

      return objects;
    },

    async statObject(key: string): Promise<{ sizeBytes: number } | null> {
      assertSafeKey(key);
      const filePath = path.join(rootDir, key);
      if (!fs.existsSync(filePath)) return null;
      const stat = await fs.promises.stat(filePath);
      return { sizeBytes: stat.size };
    },
  };
}

/** Write buffer to filesystem driver (helper for import paths). */
export async function putBufferToFilesystem(
  driver: StorageDriver,
  key: string,
  body: Buffer,
  mimeType?: string,
): Promise<StorageObjectMetadata> {
  return driver.put({ key, body: Readable.from(body), mimeType });
}
