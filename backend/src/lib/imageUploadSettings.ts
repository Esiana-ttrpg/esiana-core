import {
  ALLOWED_IMAGE_EXT,
  ALLOWED_IMAGE_MIME,
} from '../types/domain.js';
import { getOrCreateSystemSettings } from './systemSettings.js';

export const DEFAULT_MAX_IMAGE_WIDTH = 16_384;
export const DEFAULT_MAX_IMAGE_HEIGHT = 16_384;
export const DEFAULT_ALLOWED_IMAGE_TYPES = 'png,jpeg,webp';

const MIME_BY_TYPE: Record<string, string> = {
  png: 'image/png',
  jpeg: 'image/jpeg',
  jpg: 'image/jpeg',
  webp: 'image/webp',
  gif: 'image/gif',
};

const EXT_BY_TYPE: Record<string, string> = {
  png: '.png',
  jpeg: '.jpeg',
  jpg: '.jpeg',
  webp: '.webp',
  gif: '.gif',
};

export interface ImageDimensionLimits {
  maxWidth: number;
  maxHeight: number;
}

export interface UrlImportSettings {
  enabled: boolean;
  allowHttp: boolean;
  maxDownloadBytes: number;
  timeoutSeconds: number;
}

export async function getImageDimensionLimits(): Promise<ImageDimensionLimits> {
  const row = await getOrCreateSystemSettings();
  return {
    maxWidth:
      row.maxImageWidth > 0 ? row.maxImageWidth : DEFAULT_MAX_IMAGE_WIDTH,
    maxHeight:
      row.maxImageHeight > 0 ? row.maxImageHeight : DEFAULT_MAX_IMAGE_HEIGHT,
  };
}

export async function getAllowedImageTypes(): Promise<{
  extensions: readonly string[];
  mimeTypes: readonly string[];
}> {
  const row = await getOrCreateSystemSettings();
  const raw = (row.allowedImageTypes ?? DEFAULT_ALLOWED_IMAGE_TYPES).trim();
  const tokens = raw
    .split(/[\s,;]+/)
    .map((part) => part.trim().toLowerCase())
    .filter(Boolean);

  const extensions = new Set<string>();
  const mimeTypes = new Set<string>();

  for (const token of tokens) {
    const ext = EXT_BY_TYPE[token];
    const mime = MIME_BY_TYPE[token];
    if (ext) extensions.add(ext);
    if (mime) mimeTypes.add(mime);
  }

  if (extensions.size === 0) {
    return {
      extensions: ALLOWED_IMAGE_EXT,
      mimeTypes: ALLOWED_IMAGE_MIME,
    };
  }

  return {
    extensions: [...extensions],
    mimeTypes: [...mimeTypes],
  };
}

export async function getUrlImportSettings(): Promise<UrlImportSettings> {
  const row = await getOrCreateSystemSettings();
  const maxMb = row.urlImportMaxDownloadMb > 0 ? row.urlImportMaxDownloadMb : 50;
  const timeout =
    row.urlImportTimeoutSeconds > 0 ? row.urlImportTimeoutSeconds : 15;
  return {
    enabled: row.urlImportsEnabled ?? true,
    allowHttp: row.urlImportAllowHttp ?? false,
    maxDownloadBytes: maxMb * 1024 * 1024,
    timeoutSeconds: timeout,
  };
}
