import fs from 'node:fs';
import path from 'node:path';
import { pipeline } from 'node:stream/promises';
import { open, type Entry, type ZipFile } from 'yauzl';
import { assertAudio } from './audioCore.js';
import { env } from '../config/env.js';

class StagedEntry {
  readonly dir = false;
  constructor(public name: string, public sourcePath: string, public size: number) {}
  async async(type: 'string'): Promise<string>;
  async async(type: 'nodebuffer'): Promise<Buffer>;
  async async(type: 'string' | 'nodebuffer'): Promise<string | Buffer> {
    assertAudio(this.size <= 536870912, 413, 'backup_metadata_too_large');
    const buffer = await fs.promises.readFile(this.sourcePath);
    return type === 'string' ? buffer.toString('utf8') : buffer;
  }
}
export class StagedBackupZip {
  readonly files: Record<string, StagedEntry> = Object.create(null);
  constructor(private root: string) {}
  file(name: string) { return this.files[name] ?? null; }
  async close() { await fs.promises.rm(this.root, { recursive: true, force: true }); }
}
export async function stageBackupZip(filename: string, maxTotalBytes = 1099511627776) {
  const stagingDir = path.join(env.uploadsDir, '.backup-staging');
  await fs.promises.mkdir(stagingDir, { recursive: true });
  const root = await fs.promises.mkdtemp(path.join(stagingDir, 'esiana-backup-'));
  const result = new StagedBackupZip(root);
  try {
    const zip = await new Promise<ZipFile>((resolve, reject) => open(filename, { lazyEntries: true, validateEntrySizes: true }, (error, value) => error ? reject(error) : resolve(value!)));
    await new Promise<void>((resolve, reject) => {
      let total = 0, count = 0;
      const fail = (error: unknown) => { zip.close(); reject(error); };
      zip.on('error', fail); zip.on('end', resolve);
      zip.on('entry', (entry: Entry) => {
        void (async () => {
          const name = entry.fileName.replace(/\\/g, '/');
          assertAudio(!path.isAbsolute(name) && !name.split('/').some((part) => part === '..' || part.includes(':')) && !name.includes('\0'), 400, 'unsafe_backup_path');
          if (name.endsWith('/')) { zip.readEntry(); return; }
          count++; total += entry.uncompressedSize;
          assertAudio(count <= 100000 && total <= maxTotalBytes && !Object.hasOwn(result.files, name), 413, 'backup_limit_exceeded');
          assertAudio(((entry.externalFileAttributes >>> 16) & 0xf000) !== 0xa000, 400, 'backup_symlink_forbidden');
          const destination = path.join(root, String(count));
          const stream = await new Promise<fs.ReadStream | NodeJS.ReadableStream>((yes, no) => zip.openReadStream(entry, (error, value) => error ? no(error) : yes(value!)));
          await pipeline(stream, fs.createWriteStream(destination));
          result.files[name] = new StagedEntry(name, destination, entry.uncompressedSize); zip.readEntry();
        })().catch(fail);
      }); zip.readEntry();
    });
    return result;
  } catch (error) { await result.close(); throw error; }
}

/** Inspect the small manifest without inflating the archive's media during upload validation. */
export async function readBackupManifest(filename: string): Promise<{ format?: string }> {
  const zip = await new Promise<ZipFile>((resolve, reject) => open(filename, { lazyEntries: true, validateEntrySizes: true }, (error, value) => error ? reject(error) : resolve(value!)));
  return new Promise((resolve, reject) => {
    let found = false;
    const fail = (error: unknown) => { zip.close(); reject(error); };
    zip.on('error', fail); zip.on('end', () => { if (!found) fail(new Error('Backup manifest missing')); });
    zip.on('entry', (entry: Entry) => {
      if (entry.fileName !== 'manifest.json') { zip.readEntry(); return; }
      found = true;
      void (async () => {
        assertAudio(entry.uncompressedSize <= 1048576, 413, 'backup_manifest_too_large');
        const stream = await new Promise<NodeJS.ReadableStream>((yes, no) => zip.openReadStream(entry, (error, value) => error ? no(error) : yes(value!)));
        const chunks: Buffer[] = []; let total = 0;
        for await (const chunk of stream) { const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk); total += buffer.length; assertAudio(total <= 1048576, 413, 'backup_manifest_too_large'); chunks.push(buffer); }
        const result = JSON.parse(Buffer.concat(chunks).toString('utf8'));
        assertAudio(result && typeof result === 'object' && !Array.isArray(result), 400, 'invalid_campaign_backup');
        zip.close(); resolve(result);
      })().catch(fail);
    }); zip.readEntry();
  });
}
