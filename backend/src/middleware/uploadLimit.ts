import type { Response, NextFunction } from 'express';
import fs from 'node:fs';
import type { Request } from 'express';
import { getMaxUploadSizeBytes, getMapMaxUploadSizeBytes } from '../lib/systemSettings.js';
import { resolveUploadedFilePath, UploadValidationError } from '../lib/uploadValidation.js';

function removeRejectedUpload(file: Express.Multer.File): void {
  if (!file.path) return; // Memory uploads have no disk file to remove.
  try {
    const diskPath = resolveUploadedFilePath(file);
    fs.unlink(diskPath, () => {});
  } catch (error) {
    // Still reject the upload, but never delete a path outside the upload root.
    if (!(error instanceof UploadValidationError)) throw error;
  }
}

/**
 * Enforces platform max upload size from SystemSetting after multer parses the file.
 * Map uploads may use a separate cartography size cap when configured.
 */
export async function enforceSystemUploadLimit(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  const file = req.file;
  if (!file) {
    next();
    return;
  }

  const isMapUpload =
    typeof req.body?.type === 'string' && req.body.type.trim() === 'map';
  const maxBytes = isMapUpload
    ? await getMapMaxUploadSizeBytes()
    : await getMaxUploadSizeBytes();
  if (file.size <= maxBytes) {
    next();
    return;
  }

  removeRejectedUpload(file);

  const maxMb = Math.round(maxBytes / (1024 * 1024));
  res.status(400).json({
    error: `File exceeds the maximum upload size of ${maxMb} MB.`,
  });
}

/** Enforces system upload cap on each file in a campaign wizard multipart request. */
export async function enforceWizardUploadLimits(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  const filesRaw = req.files;
  if (!filesRaw || typeof filesRaw !== 'object' || Array.isArray(filesRaw)) {
    next();
    return;
  }

  const maxBytes = await getMaxUploadSizeBytes();
  const maxMb = Math.round(maxBytes / (1024 * 1024));
  const record = filesRaw as Record<string, Express.Multer.File[] | undefined>;

  for (const list of Object.values(record)) {
    if (!list) continue;
    for (const file of list) {
      if (file.size <= maxBytes) continue;
      removeRejectedUpload(file);
      res.status(400).json({
        error: `File exceeds the maximum upload size of ${maxMb} MB.`,
      });
      return;
    }
  }

  next();
}
