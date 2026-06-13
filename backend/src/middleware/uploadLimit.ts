import type { Response, NextFunction } from 'express';
import fs from 'node:fs';
import type { Request } from 'express';
import { getMaxUploadSizeBytes, getMapMaxUploadSizeBytes } from '../lib/systemSettings.js';

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

  if ('path' in file && typeof file.path === 'string') {
    fs.unlink(file.path, () => {});
  }

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
      if (file.path) {
        fs.unlink(file.path, () => {});
      }
      res.status(400).json({
        error: `File exceeds the maximum upload size of ${maxMb} MB.`,
      });
      return;
    }
  }

  next();
}
