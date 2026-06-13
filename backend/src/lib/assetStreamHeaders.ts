import type { Request, Response } from 'express';
import fs from 'node:fs';
import type { Readable } from 'node:stream';

export const PRIVATE_CACHE_CONTROL = 'private, max-age=86400';

export function contentTypeForFilename(filename: string): string {
  const ext = filename.toLowerCase().split('.').pop() ?? '';
  if (ext === 'png') return 'image/png';
  if (ext === 'jpg' || ext === 'jpeg') return 'image/jpeg';
  if (ext === 'webp') return 'image/webp';
  if (ext === 'gif') return 'image/gif';
  return 'application/octet-stream';
}

export function etagFromStat(stat: fs.Stats): string {
  return `"${stat.mtimeMs.toString(16)}-${stat.size.toString(16)}"`;
}

export function setPrivateStreamHeaders(
  res: Response,
  contentType: string,
  etag?: string,
): void {
  res.setHeader('Content-Type', contentType);
  res.setHeader('Cache-Control', PRIVATE_CACHE_CONTROL);
  if (etag) {
    res.setHeader('ETag', etag);
  }
}

/** Returns true when a 304 Not Modified was sent. */
export function sendNotModifiedIfMatch(
  req: Request,
  res: Response,
  etag: string,
): boolean {
  const ifNoneMatch = req.headers['if-none-match'];
  if (ifNoneMatch && ifNoneMatch === etag) {
    res.status(304);
    setPrivateStreamHeaders(res, res.getHeader('Content-Type')?.toString() ?? 'application/octet-stream', etag);
    res.end();
    return true;
  }
  return false;
}

export function streamFileWithCache(
  req: Request,
  res: Response,
  filePath: string,
  contentType: string,
): void {
  const stat = fs.statSync(filePath);
  const etag = etagFromStat(stat);
  setPrivateStreamHeaders(res, contentType, etag);
  if (sendNotModifiedIfMatch(req, res, etag)) {
    return;
  }

  const stream = fs.createReadStream(filePath);
  stream.on('error', (error) => {
    console.error('[assets] Failed to stream file', { filePath, error });
    if (!res.headersSent) {
      res.status(500).json({ error: 'Unable to read file' });
    } else {
      res.end();
    }
  });
  stream.pipe(res);
}

export function etagFromSize(sizeBytes: number): string {
  return `"${sizeBytes.toString(16)}-stream"`;
}

export function streamReadableWithCache(
  req: Request,
  res: Response,
  stream: Readable,
  contentType: string,
  sizeBytes?: number,
): void {
  const etag =
    sizeBytes !== undefined ? etagFromSize(sizeBytes) : undefined;
  setPrivateStreamHeaders(res, contentType, etag);
  if (etag && sendNotModifiedIfMatch(req, res, etag)) {
    stream.destroy();
    return;
  }
  if (sizeBytes !== undefined) {
    res.setHeader('Content-Length', String(sizeBytes));
  }

  stream.on('error', (error) => {
    console.error('[assets] Failed to stream object', { error });
    if (!res.headersSent) {
      res.status(500).json({ error: 'Unable to read file' });
    } else {
      res.end();
    }
  });
  stream.pipe(res);
}
