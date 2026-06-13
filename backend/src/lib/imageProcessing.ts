import path from 'node:path';
import sharp from 'sharp';
import { getMapProcessingSettings } from './systemSettings.js';

export interface ProcessedMapImage {
  url: string;
  displayUrl: string | null;
  thumbnailUrl: string;
  width: number;
  height: number;
  originalWidth: number;
  originalHeight: number;
}

export interface MapVariantBuffers {
  originalKey: string;
  originalBuffer: Buffer;
  originalMimeType: string;
  displayKey: string;
  displayBuffer: Buffer;
  thumbKey: string;
  thumbBuffer: Buffer;
  width: number;
  height: number;
  originalWidth: number;
  originalHeight: number;
  preserveFullRes: boolean;
}

function resizeToMaxEdge(
  pipeline: sharp.Sharp,
  maxEdge: number,
): sharp.Sharp {
  return pipeline.resize({
    width: maxEdge,
    height: maxEdge,
    fit: 'inside',
    withoutEnlargement: true,
  });
}

function mimeFromExt(ext: string): string {
  switch (ext.toLowerCase()) {
    case '.png':
      return 'image/png';
    case '.jpg':
    case '.jpeg':
      return 'image/jpeg';
    case '.webp':
      return 'image/webp';
    case '.gif':
      return 'image/gif';
    default:
      return 'application/octet-stream';
  }
}

/**
 * Build map display/thumbnail variant buffers and storage keys (no filesystem writes).
 */
export async function buildMapVariantBuffers(
  inputBuffer: Buffer,
  baseKey: string,
): Promise<MapVariantBuffers> {
  const settings = await getMapProcessingSettings();
  const ext = path.extname(baseKey).toLowerCase() || '.webp';
  const stem = path.basename(baseKey, ext);
  const displayKey = `${stem}-display.webp`;
  const thumbKey = `${stem}-thumb.webp`;

  const metadata = await sharp(inputBuffer).metadata();
  const originalWidth = metadata.width ?? 0;
  const originalHeight = metadata.height ?? 0;

  if (originalWidth <= 0 || originalHeight <= 0) {
    throw new Error('Invalid image dimensions');
  }

  const displayBuffer = await resizeToMaxEdge(
    sharp(inputBuffer),
    settings.displayMaxEdge,
  )
    .webp({ quality: 85 })
    .toBuffer();

  const displayMeta = await sharp(displayBuffer).metadata();
  const width = displayMeta.width ?? originalWidth;
  const height = displayMeta.height ?? originalHeight;

  const thumbBuffer = await resizeToMaxEdge(
    sharp(inputBuffer),
    settings.thumbMaxEdge,
  )
    .webp({ quality: 80 })
    .toBuffer();

  return {
    originalKey: baseKey,
    originalBuffer: inputBuffer,
    originalMimeType: mimeFromExt(ext),
    displayKey,
    displayBuffer,
    thumbKey,
    thumbBuffer,
    width,
    height,
    originalWidth,
    originalHeight,
    preserveFullRes: settings.preserveFullRes,
  };
}

/** @deprecated Use buildMapVariantBuffers + assetIngest.ingestMapImage */
export async function processMapUpload(
  sourcePath: string,
  baseFilename: string,
): Promise<ProcessedMapImage> {
  const fs = await import('node:fs');
  const inputBuffer = await fs.promises.readFile(sourcePath);
  const variants = await buildMapVariantBuffers(inputBuffer, baseFilename);

  return {
    url: variants.preserveFullRes
      ? `/uploads/${variants.originalKey}`
      : `/uploads/${variants.displayKey}`,
    displayUrl: variants.preserveFullRes
      ? `/uploads/${variants.displayKey}`
      : null,
    thumbnailUrl: `/uploads/${variants.thumbKey}`,
    width: variants.width,
    height: variants.height,
    originalWidth: variants.originalWidth,
    originalHeight: variants.originalHeight,
  };
}

export function resolveAssetVariantUrl(
  asset: {
    url: string;
    displayUrl?: string | null;
    thumbnailUrl?: string | null;
    type: string;
  },
  variant: 'full' | 'display' | 'thumb',
): string {
  if (variant === 'thumb') {
    return asset.thumbnailUrl ?? asset.displayUrl ?? asset.url;
  }
  if (variant === 'full') {
    return asset.url;
  }
  if (asset.type === 'map') {
    return asset.displayUrl ?? asset.url;
  }
  return asset.url;
}
