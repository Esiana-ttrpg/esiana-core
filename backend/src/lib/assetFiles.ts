import { prisma } from './prisma.js';
import { parseStoragePointer, resolveDriverForPointer } from './storage/storagePointer.js';

/**
 * Remove stored objects for all assets in a campaign.
 * DB rows are removed by Prisma cascade when the campaign is deleted.
 */
export async function deleteCampaignAssetFiles(
  campaignId: string,
): Promise<void> {
  const assets = await prisma.asset.findMany({
    where: { campaignId },
    select: { url: true, displayUrl: true, thumbnailUrl: true },
  });

  const pointers = new Set<string>();
  for (const asset of assets) {
    for (const url of [asset.url, asset.displayUrl, asset.thumbnailUrl]) {
      if (url) pointers.add(url);
    }
  }

  for (const pointer of pointers) {
    try {
      const resolved = resolveDriverForPointer(pointer);
      if (!resolved) continue;
      await resolved.driver.delete(resolved.key);
    } catch (error) {
      console.warn('[assetFiles] Failed to delete storage object', { pointer, error });
    }
  }
}

export function deleteUploadedFile(filename: string): void {
  void deleteUploadedFileSafe(filename);
}

/** Best-effort delete with short retries (Windows may lock fresh uploads briefly). */
export async function deleteUploadedFileSafe(filename: string): Promise<void> {
  const pointer = `/uploads/${filename}`;
  const resolved = resolveDriverForPointer(pointer);
  if (!resolved) return;

  const maxAttempts = 5;
  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      if (!(await resolved.driver.exists(resolved.key))) return;
      await resolved.driver.delete(resolved.key);
      return;
    } catch (error) {
      const code = (error as NodeJS.ErrnoException).code;
      const retryable = code === 'EPERM' || code === 'EBUSY' || code === 'EACCES';
      if (!retryable || attempt === maxAttempts) {
        console.warn('[assetFiles] Failed to delete upload file', {
          filename,
          code,
          error,
        });
        return;
      }
      await new Promise((resolve) => setTimeout(resolve, attempt * 50));
    }
  }
}

/** Delete all stored objects associated with an asset URL set. */
export function deleteAssetFilesFromUrls(urls: (string | null | undefined)[]): void {
  const seen = new Set<string>();
  for (const url of urls) {
    if (!url || seen.has(url)) continue;
    seen.add(url);
    void deleteAssetFileFromPointer(url);
  }
}

async function deleteAssetFileFromPointer(pointer: string): Promise<void> {
  const resolved = resolveDriverForPointer(pointer);
  if (!resolved) {
    const parsed = parseStoragePointer(pointer);
    if (parsed) {
      await deleteUploadedFileSafe(parsed.key);
    }
    return;
  }

  try {
    if (await resolved.driver.exists(resolved.key)) {
      await resolved.driver.delete(resolved.key);
    }
  } catch (error) {
    console.warn('[assetFiles] Failed to delete storage pointer', { pointer, error });
  }
}

/** Delete a locally hosted file URL (e.g. /uploads/abc.png). */
export function deleteUploadedFileFromUrl(url: string | null | undefined): void {
  if (!url) return;
  deleteAssetFilesFromUrls([url]);
}

export function deleteAssetRecordFiles(asset: {
  url: string;
  displayUrl?: string | null;
  thumbnailUrl?: string | null;
}): void {
  deleteAssetFilesFromUrls([asset.url, asset.displayUrl, asset.thumbnailUrl]);
}
