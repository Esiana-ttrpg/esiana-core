import fs from 'node:fs';
import path from 'node:path';
import { env } from '../config/env.js';
import { prisma } from './prisma.js';

function uploadFilenameFromUrl(url: string): string | null {
  if (!url.startsWith('/uploads/')) return null;
  const filename = path.basename(url);
  if (!filename || filename === '.' || filename === '..') return null;
  return filename;
}

async function collectReferencedUploadFilenames(): Promise<Set<string>> {
  const referenced = new Set<string>();

  const [assets, users] = await Promise.all([
    prisma.asset.findMany({ select: { url: true } }),
    prisma.user.findMany({
      where: { avatarUrl: { not: null } },
      select: { avatarUrl: true },
    }),
  ]);

  for (const asset of assets) {
    const name = uploadFilenameFromUrl(asset.url);
    if (name) referenced.add(name);
  }

  for (const user of users) {
    if (!user.avatarUrl) continue;
    const name = uploadFilenameFromUrl(user.avatarUrl);
    if (name) referenced.add(name);
  }

  return referenced;
}

function directorySizeBytes(dir: string): number {
  if (!fs.existsSync(dir)) return 0;
  let total = 0;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (!entry.isFile()) continue;
    const stat = fs.statSync(path.join(dir, entry.name));
    total += stat.size;
  }
  return total;
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) {
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  }
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

export async function getUploadStorageStats() {
  const referenced = await collectReferencedUploadFilenames();
  const uploadsDir = env.uploadsDir;

  if (!fs.existsSync(uploadsDir)) {
    return {
      uploadsDir,
      totalFiles: 0,
      referencedFiles: referenced.size,
      orphanFiles: 0,
      totalBytes: 0,
      reclaimableBytes: 0,
      totalBytesFormatted: formatBytes(0),
      reclaimableBytesFormatted: formatBytes(0),
    };
  }

  const diskFiles = fs
    .readdirSync(uploadsDir, { withFileTypes: true })
    .filter((e) => e.isFile())
    .map((e) => e.name);

  let totalBytes = 0;
  let reclaimableBytes = 0;
  let orphanFiles = 0;

  for (const filename of diskFiles) {
    const filePath = path.join(uploadsDir, filename);
    const size = fs.statSync(filePath).size;
    totalBytes += size;
    if (!referenced.has(filename)) {
      orphanFiles += 1;
      reclaimableBytes += size;
    }
  }

  return {
    uploadsDir,
    totalFiles: diskFiles.length,
    referencedFiles: referenced.size,
    orphanFiles,
    totalBytes,
    reclaimableBytes,
    totalBytesFormatted: formatBytes(totalBytes),
    reclaimableBytesFormatted: formatBytes(reclaimableBytes),
  };
}

export async function pruneOrphanUploadFiles(): Promise<{
  deletedCount: number;
  freedBytes: number;
  freedBytesFormatted: string;
}> {
  const referenced = await collectReferencedUploadFilenames();
  const uploadsDir = env.uploadsDir;

  if (!fs.existsSync(uploadsDir)) {
    return { deletedCount: 0, freedBytes: 0, freedBytesFormatted: formatBytes(0) };
  }

  let deletedCount = 0;
  let freedBytes = 0;

  for (const entry of fs.readdirSync(uploadsDir, { withFileTypes: true })) {
    if (!entry.isFile()) continue;
    if (referenced.has(entry.name)) continue;

    const filePath = path.join(uploadsDir, entry.name);
    const size = fs.statSync(filePath).size;
    fs.unlinkSync(filePath);
    deletedCount += 1;
    freedBytes += size;
  }

  return {
    deletedCount,
    freedBytes,
    freedBytesFormatted: formatBytes(freedBytes),
  };
}

export function resolveSqliteDatabasePath(): string | null {
  const url = env.databaseUrl.trim();
  if (!url.startsWith('file:')) return null;

  const filePart = url.replace(/^file:/, '').replace(/^\//, '');
  if (path.isAbsolute(filePart)) return filePart;

  return path.resolve(env.backendRoot, 'prisma', filePart);
}
