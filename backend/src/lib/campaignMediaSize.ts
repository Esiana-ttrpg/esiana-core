import fs from 'node:fs';
import path from 'node:path';
import { env } from '../config/env.js';
import { formatBytes } from './storageMaintenance.js';

export function uploadFilenameFromUrl(url: string): string | null {
  if (!url.startsWith('/uploads/')) return null;
  const filename = path.basename(url);
  if (!filename || filename === '.' || filename === '..') return null;
  return filename;
}

export function fileSizeOnDisk(filename: string): number {
  const filePath = path.join(env.uploadsDir, filename);
  if (!fs.existsSync(filePath)) return 0;
  return fs.statSync(filePath).size;
}

export function sumAssetUrlBytes(urls: string[]): number {
  let total = 0;
  for (const url of urls) {
    const filename = uploadFilenameFromUrl(url);
    if (filename) total += fileSizeOnDisk(filename);
  }
  return total;
}

export function buildFileSizeFields(bytes: number) {
  return {
    fileSize: bytes,
    fileSizeFormatted: formatBytes(bytes),
  };
}
