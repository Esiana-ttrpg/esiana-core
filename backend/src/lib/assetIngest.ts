import path from 'node:path';
import { randomUUID } from 'node:crypto';
import sharp from 'sharp';
import type { Asset, Prisma } from '@prisma/client';
import { prisma } from './prisma.js';
import {
  assetReferenceUrl,
  buildAssetLocation,
  type AssetStorageKeys,
} from './assetLocation.js';
import { getActiveStorageDriver, ActiveStorageUnavailableError } from './storage/storageRegistry.js';
import type { StorageDriver } from './storage/types.js';
import { buildMapVariantBuffers } from './imageProcessing.js';
import { detectImageFromBuffer } from './uploadValidation.js';
import { AssetTypes, type AssetType } from '../types/domain.js';

export interface IngestImageResult {
  asset: Asset;
  referenceUrl: string;
  location: ReturnType<typeof buildAssetLocation>;
}

export function generateStorageKey(ext: string): string {
  const normalized = ext.startsWith('.') ? ext : `.${ext}`;
  return `${randomUUID()}${normalized}`;
}

async function rollbackWrittenKeys(
  driver: StorageDriver,
  keys: string[],
): Promise<void> {
  for (const key of [...keys].reverse()) {
    try {
      if (await driver.exists(key)) {
        await driver.delete(key);
      }
    } catch (error) {
      console.warn('[assetIngest] Failed to rollback storage key', { key, error });
    }
  }
}

async function putBuffer(
  driver: StorageDriver,
  key: string,
  body: Buffer,
  mimeType: string,
  writtenKeys: string[],
): Promise<void> {
  await driver.put({ key, body, mimeType });
  writtenKeys.push(key);
}

export { ActiveStorageUnavailableError } from './storage/storageRegistry.js';

export async function ingestImageBuffer(input: {
  campaignId: string;
  buffer: Buffer;
  type: AssetType | string;
  uploadedByUserId?: string | null;
  assetId?: string;
  /** When omitted, detected from buffer magic bytes. */
  mimeType?: string;
  ext?: string;
  /** Use when creating assets inside an open transaction (SQLite FK visibility). */
  db?: Prisma.TransactionClient;
}): Promise<IngestImageResult> {
  const detected = await detectImageFromBuffer(input.buffer);
  const mimeType = input.mimeType ?? detected.mimeType;
  const ext = input.ext ?? detected.ext;
  const key = generateStorageKey(ext);
  const driver = getActiveStorageDriver();
  const writtenKeys: string[] = [];

  try {
    await putBuffer(driver, key, input.buffer, mimeType, writtenKeys);
    const keys: AssetStorageKeys = { original: key };
    const location = buildAssetLocation(keys, driver);

    const db = input.db ?? prisma;
    const asset = await db.asset.create({
      data: {
        ...(input.assetId ? { id: input.assetId } : {}),
        campaignId: input.campaignId,
        url: location.urls.originalUrl,
        type: input.type,
        uploadedByUserId: input.uploadedByUserId ?? undefined,
      },
    });

    return {
      asset,
      referenceUrl: assetReferenceUrl(asset.id),
      location,
    };
  } catch (error) {
    await rollbackWrittenKeys(driver, writtenKeys);
    throw error;
  }
}

export async function ingestSvgBuffer(input: {
  campaignId: string;
  buffer: Buffer;
  type: AssetType | string;
  uploadedByUserId?: string | null;
  assetId?: string;
}): Promise<IngestImageResult> {
  const key = generateStorageKey('.svg');
  const driver = getActiveStorageDriver();
  const writtenKeys: string[] = [];

  try {
    await putBuffer(driver, key, input.buffer, 'image/svg+xml', writtenKeys);
    const location = buildAssetLocation({ original: key }, driver);
    const asset = await prisma.asset.create({
      data: {
        ...(input.assetId ? { id: input.assetId } : {}),
        campaignId: input.campaignId,
        url: location.urls.originalUrl,
        type: input.type,
        uploadedByUserId: input.uploadedByUserId ?? undefined,
      },
    });
    return {
      asset,
      referenceUrl: assetReferenceUrl(asset.id),
      location,
    };
  } catch (error) {
    await rollbackWrittenKeys(driver, writtenKeys);
    throw error;
  }
}

export async function ingestBinaryBuffer(input: {
  campaignId: string;
  buffer: Buffer;
  type: AssetType | string;
  ext: string;
  mimeType?: string;
  uploadedByUserId?: string | null;
  assetId?: string;
}): Promise<IngestImageResult> {
  const ext = input.ext.startsWith('.') ? input.ext : `.${input.ext}`;
  const key = generateStorageKey(ext);
  const driver = getActiveStorageDriver();
  const writtenKeys: string[] = [];

  try {
    await putBuffer(
      driver,
      key,
      input.buffer,
      input.mimeType ?? 'application/octet-stream',
      writtenKeys,
    );
    const location = buildAssetLocation({ original: key }, driver);
    const asset = await prisma.asset.create({
      data: {
        ...(input.assetId ? { id: input.assetId } : {}),
        campaignId: input.campaignId,
        url: location.urls.originalUrl,
        type: input.type,
        uploadedByUserId: input.uploadedByUserId ?? undefined,
      },
    });
    return {
      asset,
      referenceUrl: assetReferenceUrl(asset.id),
      location,
    };
  } catch (error) {
    await rollbackWrittenKeys(driver, writtenKeys);
    throw error;
  }
}

export async function ingestMapImage(input: {
  campaignId: string;
  buffer: Buffer;
  originalFilename: string;
  uploadedByUserId?: string | null;
  assetId?: string;
}): Promise<IngestImageResult> {
  await detectImageFromBuffer(input.buffer);
  const ext = path.extname(input.originalFilename).toLowerCase() || '.webp';
  const stem = path.basename(input.originalFilename, ext);
  const baseKey = `${randomUUID()}${ext}`;

  const variants = await buildMapVariantBuffers(input.buffer, baseKey);
  const driver = getActiveStorageDriver();
  const writtenKeys: string[] = [];

  try {
    if (variants.preserveFullRes && variants.originalBuffer) {
      await putBuffer(
        driver,
        variants.originalKey,
        variants.originalBuffer,
        variants.originalMimeType,
        writtenKeys,
      );
    }

    await putBuffer(
      driver,
      variants.displayKey,
      variants.displayBuffer,
      'image/webp',
      writtenKeys,
    );
    await putBuffer(
      driver,
      variants.thumbKey,
      variants.thumbBuffer,
      'image/webp',
      writtenKeys,
    );

    const keys: AssetStorageKeys = {
      original: variants.preserveFullRes
        ? variants.originalKey
        : variants.displayKey,
      display: variants.preserveFullRes ? variants.displayKey : undefined,
      thumbnail: variants.thumbKey,
    };
    const location = buildAssetLocation(keys, driver);

    const asset = await prisma.asset.create({
      data: {
        ...(input.assetId ? { id: input.assetId } : {}),
        campaignId: input.campaignId,
        url: location.urls.originalUrl,
        displayUrl: location.urls.displayUrl ?? null,
        thumbnailUrl: location.urls.thumbnailUrl ?? null,
        width: variants.width,
        height: variants.height,
        originalWidth: variants.originalWidth,
        originalHeight: variants.originalHeight,
        type: AssetTypes.MAP,
        uploadedByUserId: input.uploadedByUserId ?? undefined,
      },
    });

    return {
      asset,
      referenceUrl: assetReferenceUrl(asset.id),
      location,
    };
  } catch (error) {
    await rollbackWrittenKeys(driver, writtenKeys);
    throw error;
  }
}
