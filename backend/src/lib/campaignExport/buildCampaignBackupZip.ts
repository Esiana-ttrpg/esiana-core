import JSZip from 'jszip';
import type { SovereignExportFile } from './types.js';

export async function buildCampaignBackupZip(
  files: SovereignExportFile[],
): Promise<Buffer> {
  const zip = new JSZip();

  for (const file of files) {
    zip.file(file.path.replace(/\\/g, '/'), file.content);
  }

  return zip.generateAsync({
    type: 'nodebuffer',
    compression: 'DEFLATE',
    compressionOptions: { level: 6 },
  });
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
