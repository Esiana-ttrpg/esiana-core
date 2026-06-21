import path from 'node:path';
import type JSZip from 'jszip';
import { normalizeZipPath } from '../../../shared/importZipStructure.js';

export function normalizeKankaImagePath(imagePath: string): string {
  return imagePath.replace(/\\/g, '/').replace(/^\/+/, '').toLowerCase();
}

function candidatePaths(imagePath: string, campaignId?: string | number | null): string[] {
  const normalized = normalizeKankaImagePath(imagePath);
  const basename = path.posix.basename(normalized);
  const candidates = new Set<string>([normalized]);
  if (!normalized.startsWith('w/')) {
    candidates.add(`w/${normalized}`);
  }
  if (campaignId != null) {
    const campaignSegment = String(campaignId);
    candidates.add(`w/${campaignSegment}/${basename}`);
    if (normalized.startsWith(`w/${campaignSegment}/`)) {
      candidates.add(normalized);
    }
  }
  candidates.add(`w/${basename}`);
  return [...candidates];
}

export function resolveKankaZipImageEntry(
  zip: JSZip,
  imagePath: string,
  campaignId?: string | number | null,
): JSZip.JSZipObject | null {
  const zipPaths = new Map<string, JSZip.JSZipObject>();
  for (const name of Object.keys(zip.files)) {
    const file = zip.files[name];
    if (!file || file.dir) continue;
    zipPaths.set(normalizeZipPath(name).toLowerCase(), file);
  }

  for (const candidate of candidatePaths(imagePath, campaignId)) {
    const hit = zipPaths.get(candidate.toLowerCase());
    if (hit) return hit;
  }

  const basename = path.posix.basename(normalizeKankaImagePath(imagePath));
  for (const [zipPath, file] of zipPaths.entries()) {
    if (zipPath.endsWith(`/${basename}`) || zipPath === basename) {
      return file;
    }
  }
  return null;
}

export function zipEntryKey(entry: JSZip.JSZipObject): string {
  return entry.name.replace(/\\/g, '/').toLowerCase();
}
