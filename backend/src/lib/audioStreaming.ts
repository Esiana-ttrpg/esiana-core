import type { Request, Response } from 'express';
import { assertAudio } from './audioCore.js';
import { resolveDriverForPointer } from './storage/storagePointer.js';
import { pipeline } from 'node:stream/promises';

export function parseByteRange(header: string | undefined, size: number): { start: number; end: number } | undefined {
  if (!header) return;
  const match = /^bytes=(\d*)-(\d*)$/.exec(header);
  if (!match || (!match[1] && !match[2]) || size <= 0) throw new Error('invalid_range');
  let start: number, end: number;
  if (!match[1]) {
    const suffix = Number(match[2]);
    if (!Number.isSafeInteger(suffix) || suffix <= 0) throw new Error('invalid_range');
    start = Math.max(0, size - suffix); end = size - 1;
  } else {
    start = Number(match[1]); end = match[2] ? Math.min(Number(match[2]), size - 1) : size - 1;
  }
  if (!Number.isSafeInteger(start) || !Number.isSafeInteger(end) || start < 0 || start >= size || end < start) throw new Error('invalid_range');
  return { start, end };
}
export async function streamAudio(req: Request, res: Response, pointer: string, mimeType: string, size: number) {
  const resolved = resolveDriverForPointer(pointer);
  assertAudio(resolved?.driver.rangeRead, 503, 'storage_does_not_support_protected_ranges');
  const metadata = await resolved.driver.statObject?.(resolved.key);
  assertAudio(metadata && metadata.sizeBytes === size, 404, 'media_missing');
  let range;
  try { range = parseByteRange(req.headers.range, size); }
  catch { res.status(416).setHeader('Content-Range', `bytes */${size}`); res.end(); return; }
  res.setHeader('Accept-Ranges', 'bytes'); res.setHeader('Cache-Control', 'private, no-cache');
  res.setHeader('Content-Type', mimeType); res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Content-Length', range ? range.end - range.start + 1 : size);
  if (range) { res.status(206); res.setHeader('Content-Range', `bytes ${range.start}-${range.end}/${size}`); }
  if (req.method === 'HEAD') { res.end(); return; }
  const delivery = await resolved.driver.openRead({ key: resolved.key, range, requireStream: true });
  assertAudio(delivery.type === 'stream', 503, 'protected_stream_required');
  try { await pipeline(delivery.stream, res); }
  catch { if (!res.destroyed) res.destroy(); }
}
