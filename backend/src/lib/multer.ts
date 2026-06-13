import fs from 'node:fs';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import multer, { type FileFilterCallback } from 'multer';
import type { Request } from 'express';
import { env } from '../config/env.js';
import {
  ALLOWED_IMAGE_EXT,
  ALLOWED_IMAGE_MIME,
  ALLOWED_TAG_ICON_EXT,
  ALLOWED_TAG_ICON_MIME,
  MAX_TAG_ICON_BYTES,
} from '../types/domain.js';

function imageFileFilter(
  _req: Request,
  file: Express.Multer.File,
  cb: FileFilterCallback,
): void {
  const ext = path.extname(file.originalname).toLowerCase();
  if (
    ALLOWED_IMAGE_MIME.includes(
      file.mimetype as (typeof ALLOWED_IMAGE_MIME)[number],
    ) &&
    ALLOWED_IMAGE_EXT.includes(ext as (typeof ALLOWED_IMAGE_EXT)[number])
  ) {
    cb(null, true);
    return;
  }
  cb(new Error('Only webp, png, and jpeg images are allowed'));
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    fs.mkdirSync(env.uploadsDir, { recursive: true });
    cb(null, env.uploadsDir);
  },
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `${randomUUID()}${ext}`);
  },
});

/** Hard ceiling; per-instance limit enforced in `enforceSystemUploadLimit`. */
const UPLOAD_HARD_CAP_BYTES = 512 * 1024 * 1024;

export const imageUpload = multer({
  storage,
  fileFilter: imageFileFilter,
  limits: { fileSize: UPLOAD_HARD_CAP_BYTES },
});

function tagIconFileFilter(
  _req: Request,
  file: Express.Multer.File,
  cb: FileFilterCallback,
): void {
  const ext = path.extname(file.originalname).toLowerCase();
  if (
    ALLOWED_TAG_ICON_MIME.includes(
      file.mimetype as (typeof ALLOWED_TAG_ICON_MIME)[number],
    ) &&
    ALLOWED_TAG_ICON_EXT.includes(ext as (typeof ALLOWED_TAG_ICON_EXT)[number])
  ) {
    cb(null, true);
    return;
  }
  if (
    ext === '.svg' &&
    (file.mimetype === 'application/octet-stream' || file.mimetype === '')
  ) {
    cb(null, true);
    return;
  }
  cb(new Error('Tag icons must be .svg files'));
}

/** In-memory upload; controller sanitizes and writes to disk. */
export const tagIconUpload = multer({
  storage: multer.memoryStorage(),
  fileFilter: tagIconFileFilter,
  limits: { fileSize: MAX_TAG_ICON_BYTES, files: 1 },
});

/** Same constraints as tag icons — sidebar custom SVGs. */
export const sidebarIconUpload = multer({
  storage: multer.memoryStorage(),
  fileFilter: tagIconFileFilter,
  limits: { fileSize: MAX_TAG_ICON_BYTES, files: 1 },
});

const DOCUMENT_EXTENSIONS = ['.txt', '.docx', '.md'] as const;

const DOCUMENT_MIMES = [
  'text/plain',
  'text/markdown',
  'application/octet-stream',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
] as const;

function documentFileFilter(
  _req: Request,
  file: Express.Multer.File,
  cb: FileFilterCallback,
): void {
  const ext = path.extname(file.originalname).toLowerCase();
  if (ext === '.doc') {
    cb(
      new Error(
        'Legacy .doc files are not supported. Please convert to .docx before uploading.',
      ),
    );
    return;
  }
  if (
    DOCUMENT_EXTENSIONS.includes(ext as (typeof DOCUMENT_EXTENSIONS)[number]) &&
    (DOCUMENT_MIMES.includes(
      file.mimetype as (typeof DOCUMENT_MIMES)[number],
    ) ||
      file.mimetype === '' ||
      ext === '.md' ||
      ext === '.txt')
  ) {
    cb(null, true);
    return;
  }
  cb(new Error('Only .txt, .docx, and .md files are allowed'));
}

function wizardFileFilter(
  _req: Request,
  file: Express.Multer.File,
  cb: FileFilterCallback,
): void {
  const ext = path.extname(file.originalname).toLowerCase();
  if (file.fieldname === 'coverImage') {
    imageFileFilter(_req, file, cb);
    return;
  }
  if (file.fieldname === 'markdownZipFile' || file.fieldname === 'backupZipFile') {
    if (ext === '.zip' || file.mimetype === 'application/zip') {
      cb(null, true);
      return;
    }
    cb(new Error('Import archives must be .zip files'));
    return;
  }
  if (file.fieldname === 'calendarConfigFile') {
    if (ext === '.json' || file.mimetype === 'application/json') {
      cb(null, true);
      return;
    }
    cb(new Error('Calendar config must be a .json file'));
    return;
  }
  cb(new Error(`Unexpected upload field: ${file.fieldname}`));
}

export const documentUpload = multer({
  storage: multer.memoryStorage(),
  fileFilter: documentFileFilter,
  limits: { fileSize: UPLOAD_HARD_CAP_BYTES, files: 1 },
});

/**
 * Multipart handler for campaign creation/import wizard.
 * Accepts optional cover image, markdown ZIP archive, and calendar configuration file.
 * We intentionally keep validation light here and perform semantic checks in controllers.
 */
export const campaignWizardUpload = multer({
  storage,
  fileFilter: wizardFileFilter,
  limits: {
    fileSize: UPLOAD_HARD_CAP_BYTES,
    files: 4,
  },
});

/** Plugin runtime scoped asset upload (memory buffer). */
export const pluginAssetUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: UPLOAD_HARD_CAP_BYTES, files: 1 },
});
