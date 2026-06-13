import DOMPurify from 'isomorphic-dompurify';
import {
  ALLOWED_TAG_ICON_EXT,
  ALLOWED_TAG_ICON_MIME,
  MAX_TAG_ICON_BYTES,
} from '../types/domain.js';
import { UploadValidationError } from './uploadValidation.js';

const SVG_PURIFY_CONFIG = {
  USE_PROFILES: { svg: true, svgFilters: true },
  FORBID_TAGS: ['foreignObject', 'script', 'iframe', 'object', 'embed'],
  FORBID_ATTR: ['onerror', 'onload', 'onclick', 'onmouseover'],
};

export function assertTagIconUploadMeta(
  mimetype: string,
  originalname: string,
  size: number,
): void {
  if (size <= 0) {
    throw new UploadValidationError('SVG file is empty');
  }
  if (size > MAX_TAG_ICON_BYTES) {
    throw new UploadValidationError(
      `Tag icon must be ${MAX_TAG_ICON_BYTES / 1024} KB or smaller`,
    );
  }
  const ext = originalname.toLowerCase().slice(originalname.lastIndexOf('.'));
  if (
    !ALLOWED_TAG_ICON_EXT.includes(ext as (typeof ALLOWED_TAG_ICON_EXT)[number])
  ) {
    throw new UploadValidationError('Tag icons must be .svg files');
  }
  if (
    !ALLOWED_TAG_ICON_MIME.includes(
      mimetype as (typeof ALLOWED_TAG_ICON_MIME)[number],
    ) &&
    mimetype !== 'application/octet-stream'
  ) {
    throw new UploadValidationError('Tag icons must use image/svg+xml');
  }
}

export function sanitizeTagIconSvg(buffer: Buffer): Buffer {
  const raw = buffer.toString('utf8').trim();
  if (!raw) {
    throw new UploadValidationError('SVG file is empty');
  }

  const clean = DOMPurify.sanitize(raw, SVG_PURIFY_CONFIG);
  const trimmed = typeof clean === 'string' ? clean.trim() : '';
  if (!trimmed || !trimmed.includes('<svg')) {
    throw new UploadValidationError('Invalid or unsupported SVG content');
  }

  return Buffer.from(trimmed, 'utf8');
}
