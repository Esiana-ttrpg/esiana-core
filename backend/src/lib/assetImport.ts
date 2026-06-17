import path from 'node:path';
import fs from 'node:fs';
import { parseTargetUrl } from './fetchPluginManifest.js';
import { SsrfGuardError } from './ssrfGuard.js';
import { fetchAssetRemoteBuffer, NetworkFetchError } from './networkFetch.js';
import { getUrlImportSettings } from './imageUploadSettings.js';
import { detectImageFromBuffer, UploadValidationError } from './uploadValidation.js';
import {
  ingestBinaryBuffer,
  ingestImageBuffer,
  ingestMapImage,
  ingestSvgBuffer,
  ActiveStorageUnavailableError,
} from './assetIngest.js';
import { AssetTypes, type AssetType } from '../types/domain.js';
import { env } from '../config/env.js';

export class UrlImportError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'UrlImportError';
  }
}

export interface ImportFromUrlInput {
  campaignId: string;
  url: string;
  type?: AssetType;
  uploadedByUserId?: string | null;
}

export interface ImportFromUploadInput {
  campaignId: string;
  file: Express.Multer.File;
  type: AssetType;
  uploadedByUserId?: string | null;
}

export interface ImportResult {
  asset: Awaited<ReturnType<typeof ingestImageBuffer>>['asset'];
  referenceUrl: string;
}

async function readFileBuffer(file: Express.Multer.File): Promise<Buffer> {
  if (file.buffer?.length) {
    return file.buffer;
  }
  const diskPath =
    file.path && fs.existsSync(file.path)
      ? file.path
      : path.join(env.uploadsDir, file.filename);
  return fs.promises.readFile(diskPath);
}

export async function importFromUrl(
  input: ImportFromUrlInput,
): Promise<ImportResult> {
  const settings = await getUrlImportSettings();
  if (!settings.enabled) {
    throw new UrlImportError('URL imports are disabled');
  }

  const parsed = parseTargetUrl(input.url);
  if (!parsed) {
    throw new UrlImportError('Invalid URL');
  }

  let buffer: Buffer;
  try {
    buffer = await fetchAssetRemoteBuffer(parsed, {
      allowHttp: settings.allowHttp,
      maxBytes: settings.maxDownloadBytes,
      timeoutSeconds: settings.timeoutSeconds,
    });
  } catch (error) {
    if (error instanceof NetworkFetchError) {
      throw new UrlImportError(error.message);
    }
    throw error;
  }

  const type = input.type ?? AssetTypes.GENERIC;
  if (type === AssetTypes.MAP) {
    const result = await ingestMapImage({
      campaignId: input.campaignId,
      buffer,
      originalFilename: path.basename(parsed.pathname) || 'import-map.png',
      uploadedByUserId: input.uploadedByUserId,
    });
    return { asset: result.asset, referenceUrl: result.referenceUrl };
  }

  const result = await ingestImageBuffer({
    campaignId: input.campaignId,
    buffer,
    type,
    uploadedByUserId: input.uploadedByUserId,
  });
  return { asset: result.asset, referenceUrl: result.referenceUrl };
}

export async function importFromUpload(
  input: ImportFromUploadInput,
): Promise<ImportResult> {
  const buffer = await readFileBuffer(input.file);

  if (input.type === AssetTypes.MAP) {
    const result = await ingestMapImage({
      campaignId: input.campaignId,
      buffer,
      originalFilename: input.file.originalname || input.file.filename,
      uploadedByUserId: input.uploadedByUserId,
    });
    return { asset: result.asset, referenceUrl: result.referenceUrl };
  }

  const result = await ingestImageBuffer({
    campaignId: input.campaignId,
    buffer,
    type: input.type,
    uploadedByUserId: input.uploadedByUserId,
  });
  return { asset: result.asset, referenceUrl: result.referenceUrl };
}

const RASTER_IMAGE_EXTS = new Set(['.png', '.jpg', '.jpeg', '.gif', '.webp']);

export function assetTypeForPackExtension(ext: string): string {
  const normalized = ext.toLowerCase();
  if (['.png', '.jpg', '.jpeg', '.gif', '.webp', '.svg'].includes(normalized)) {
    return 'image';
  }
  if (['.mp3', '.wav', '.ogg'].includes(normalized)) {
    return 'audio';
  }
  if (['.mp4', '.webm'].includes(normalized)) {
    return 'video';
  }
  return 'generic';
}

export function isPackImageExtension(ext: string): boolean {
  const normalized = ext.toLowerCase();
  return normalized === '.svg' || RASTER_IMAGE_EXTS.has(normalized);
}

export interface ImportFromPackInput {
  campaignId: string;
  absolutePath: string;
  relativePath: string;
  uploadedByUserId?: string | null;
  assetId?: string;
  assetType?: string;
}

export interface ImportFromPackBufferInput {
  campaignId: string;
  buffer: Buffer;
  filename: string;
  uploadedByUserId?: string | null;
  assetId?: string;
  assetType?: string;
}

export async function importFromPack(
  input: ImportFromPackInput,
): Promise<ImportResult> {
  const buffer = await fs.promises.readFile(input.absolutePath);
  return importFromPackBuffer({
    campaignId: input.campaignId,
    buffer,
    filename: path.basename(input.relativePath) || input.absolutePath,
    uploadedByUserId: input.uploadedByUserId,
    assetId: input.assetId,
    assetType: input.assetType ?? assetTypeForPackExtension(path.extname(input.relativePath)),
  });
}

export async function importFromPackBuffer(
  input: ImportFromPackBufferInput,
): Promise<ImportResult> {
  const ext = path.extname(input.filename).toLowerCase();
  const assetType = input.assetType ?? assetTypeForPackExtension(ext);
  const shared = {
    campaignId: input.campaignId,
    buffer: input.buffer,
    uploadedByUserId: input.uploadedByUserId,
    assetId: input.assetId,
  };

  if (ext === '.svg') {
    const result = await ingestSvgBuffer({ ...shared, type: assetType });
    return { asset: result.asset, referenceUrl: result.referenceUrl };
  }

  if (RASTER_IMAGE_EXTS.has(ext)) {
    if (assetType === AssetTypes.MAP) {
      const result = await ingestMapImage({
        ...shared,
        originalFilename: input.filename,
      });
      return { asset: result.asset, referenceUrl: result.referenceUrl };
    }
    const result = await ingestImageBuffer({
      ...shared,
      type: assetType,
    });
    return { asset: result.asset, referenceUrl: result.referenceUrl };
  }

  const result = await ingestBinaryBuffer({
    ...shared,
    type: assetType,
    ext: ext || '.bin',
  });
  return { asset: result.asset, referenceUrl: result.referenceUrl };
}

export function mapImportError(error: unknown): string {
  if (error instanceof ActiveStorageUnavailableError) return error.message;
  if (error instanceof UrlImportError) return error.message;
  if (error instanceof UploadValidationError) return error.message;
  if (error instanceof SsrfGuardError) return error.message;
  if (error instanceof Error) return error.message;
  return 'Import failed';
}
