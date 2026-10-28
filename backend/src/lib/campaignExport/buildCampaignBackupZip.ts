import JSZip from 'jszip';
import fs from 'node:fs';
import { ZipFile } from 'yazl';
import type { Readable } from 'node:stream';
import type { SovereignExportFile } from './types.js';

export async function buildCampaignBackupZip(
  files: SovereignExportFile[],
): Promise<Buffer> {
  const zip = new JSZip();

  for (const file of files) {
    zip.file(file.path.replace(/\\/g, '/'), file.openStream ? await file.openStream() : file.sourcePath ? fs.createReadStream(file.sourcePath) : file.content);
  }

  return zip.generateAsync({
    type: 'nodebuffer',
    compression: 'DEFLATE',
    compressionOptions: { level: 6 },
  });
}

/** Production exports stream file sources; the Buffer API above remains for small callers/tests. */
export function streamCampaignBackupZip(files: SovereignExportFile[]) {
  const zip = new ZipFile();
  zip.on('error', (error) => (zip.outputStream as Readable).destroy(error));
  for (const file of files) {
    const name = file.path.replace(/\\/g, '/');
    if (file.openStream) zip.addReadStreamLazy(name, { compress: false }, (callback) => {
      void file.openStream!().then((stream) => callback(null, stream), (error) => callback(error, null as unknown as Readable));
    });
    else if (file.sourcePath) zip.addFile(file.sourcePath, name, { compress: false });
    else zip.addBuffer(Buffer.isBuffer(file.content) ? file.content : Buffer.from(file.content), name);
  }
  zip.end();
  return zip.outputStream;
}

export async function readCampaignBackupZip(
  zipBuffer: Buffer,
): Promise<Map<string, Buffer>> {
  const zip = await JSZip.loadAsync(zipBuffer);
  const entries = new Map<string, Buffer>();

  for (const [relativePath, entry] of Object.entries(zip.files)) {
    if (entry.dir) continue;
    const normalized = relativePath.replace(/\\/g, '/');
    entries.set(normalized, await entry.async('nodebuffer'));
  }

  return entries;
}

export function readZipTextFile(
  entries: Map<string, Buffer>,
  relativePath: string,
): string | null {
  const normalized = relativePath.replace(/\\/g, '/');
  const buffer = entries.get(normalized);
  if (!buffer) return null;
  return buffer.toString('utf8');
}
