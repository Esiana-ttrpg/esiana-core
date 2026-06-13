import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';
import { env } from '../config/env.js';
import {
  ALLOWED_IMAGE_EXT,
  ALLOWED_IMAGE_MIME,
} from '../types/domain.js';
import {
  getAllowedImageTypes,
  getImageDimensionLimits,
} from './imageUploadSettings.js';

export const MAX_IMAGE_PIXEL_EDGE = 16_384;

export class UploadValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'UploadValidationError';
  }
}

function readHead(buffer: Buffer, len: number): Buffer {
  return buffer.subarray(0, Math.min(len, buffer.length));
}

function matchesPng(head: Buffer): boolean {
  return (
    head.length >= 8 &&
    head[0] === 0x89 &&
    head[1] === 0x50 &&
    head[2] === 0x4e &&
    head[3] === 0x47
  );
}

function matchesJpeg(head: Buffer): boolean {
  return head.length >= 3 && head[0] === 0xff && head[1] === 0xd8 && head[2] === 0xff;
}

function matchesWebp(head: Buffer): boolean {
  return (
    head.length >= 12 &&
    head.toString('ascii', 0, 4) === 'RIFF' &&
    head.toString('ascii', 8, 12) === 'WEBP'
  );
}

function matchesZip(head: Buffer): boolean {
  return head.length >= 4 && head[0] === 0x50 && head[1] === 0x4b;
}

function matchesGif(head: Buffer): boolean {
  return (
    head.length >= 6 &&
    (head.toString('ascii', 0, 6) === 'GIF87a' ||
      head.toString('ascii', 0, 6) === 'GIF89a')
  );
}

function magicMatchesImage(head: Buffer, ext: string): boolean {
  if (ext === '.png') return matchesPng(head);
  if (ext === '.jpg' || ext === '.jpeg') return matchesJpeg(head);
  if (ext === '.webp') return matchesWebp(head);
  if (ext === '.gif') return matchesGif(head);
  return false;
}

export interface DetectedImageType {
  mimeType: string;
  ext: string;
}

function detectFromMagic(head: Buffer): DetectedImageType | null {
  if (matchesPng(head)) return { mimeType: 'image/png', ext: '.png' };
  if (matchesJpeg(head)) return { mimeType: 'image/jpeg', ext: '.jpeg' };
  if (matchesWebp(head)) return { mimeType: 'image/webp', ext: '.webp' };
  if (matchesGif(head)) return { mimeType: 'image/gif', ext: '.gif' };
  return null;
}

/** Source of truth for image type — URL extension and Content-Type are hints only. */
export async function detectImageFromBuffer(
  buffer: Buffer,
): Promise<DetectedImageType> {
  if (!buffer.length) {
    throw new UploadValidationError('Image file is empty');
  }

  const head = readHead(buffer, 16);
  const detected = detectFromMagic(head);
  if (!detected) {
    throw new UploadValidationError('Unsupported or unrecognized image format');
  }

  const allowed = await getAllowedImageTypes();
  if (!allowed.extensions.includes(detected.ext)) {
    throw new UploadValidationError('Image type is not allowed by system settings');
  }

  const limits = await getImageDimensionLimits();
  const maxPixels = limits.maxWidth * limits.maxHeight;
  const meta = await sharp(buffer, { limitInputPixels: maxPixels }).metadata();
  const width = meta.width ?? 0;
  const height = meta.height ?? 0;
  if (width <= 0 || height <= 0) {
    throw new UploadValidationError('Invalid image dimensions');
  }
  if (width > limits.maxWidth || height > limits.maxHeight) {
    throw new UploadValidationError(
      `Image dimensions exceed maximum allowed (${limits.maxWidth}x${limits.maxHeight}px)`,
    );
  }

  return detected;
}

export function assertZipFile(buffer: Buffer): void {
  if (!buffer.length) {
    throw new UploadValidationError('ZIP file is empty');
  }
  if (!matchesZip(readHead(buffer, 4))) {
    throw new UploadValidationError('Invalid ZIP archive');
  }
}

export function assertDocumentFile(buffer: Buffer, ext: string): void {
  if (!buffer.length) {
    throw new UploadValidationError('Document file is empty');
  }
  if (ext === '.doc') {
    throw new UploadValidationError(
      'Legacy .doc files are not supported. Please convert to .docx before uploading.',
    );
  }
  if (ext === '.docx' && !matchesZip(readHead(buffer, 4))) {
    throw new UploadValidationError('Invalid .docx file');
  }
}

export async function assertImageFile(
  input: Buffer | string,
  mimetype: string,
  ext: string,
): Promise<void> {
  const buffer =
    typeof input === 'string'
      ? await fs.promises.readFile(input)
      : input;

  const detected = await detectImageFromBuffer(buffer);
  const normalizedExt = ext.toLowerCase();
  const head = readHead(buffer, 16);

  // Hint validation only — detected type is authoritative
  if (
    normalizedExt &&
    normalizedExt !== detected.ext &&
    normalizedExt !== '.jpg' &&
    !(normalizedExt === '.jpg' && detected.ext === '.jpeg')
  ) {
    // Allow mismatch; magic bytes already validated
  }

  if (!magicMatchesImage(head, detected.ext)) {
    throw new UploadValidationError('Image content does not match detected type');
  }

  void mimetype;
}

export function logUploadAttempt(entry: {
  endpoint: string;
  userId?: string;
  campaignId?: string;
  originalName?: string;
  bytes?: number;
  outcome: 'ok' | 'rejected' | 'error';
  reason?: string;
}): void {
  console.info('[upload]', JSON.stringify(entry));
}

function resolveDiskPath(file: Express.Multer.File): string {
  const candidate =
    file.path && fs.existsSync(file.path)
      ? file.path
      : path.join(env.uploadsDir, file.filename);
  if (!fs.existsSync(candidate)) {
    throw new UploadValidationError('Uploaded file is missing on disk');
  }
  return candidate;
}

export async function validateWizardUploadFile(
  file: Express.Multer.File,
): Promise<void> {
  const ext = path.extname(file.originalname).toLowerCase();
  const resolvedPath = resolveDiskPath(file);

  const { fieldname } = file;
  if (fieldname === 'coverImage') {
    await assertImageFile(resolvedPath, file.mimetype, ext);
    return;
  }
  if (fieldname === 'markdownZipFile' || fieldname === 'backupZipFile') {
    const buf = await fs.promises.readFile(resolvedPath);
    assertZipFile(buf);
    return;
  }
  if (fieldname === 'calendarConfigFile') {
    if (ext !== '.json') {
      throw new UploadValidationError('Calendar config must be a .json file');
    }
    return;
  }
  throw new UploadValidationError(`Unexpected wizard upload field: ${fieldname}`);
}
