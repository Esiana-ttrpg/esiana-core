import { createHash } from 'node:crypto';
import fs from 'node:fs';

export function hashManifestFile(manifestPath: string): string {
  const content = fs.readFileSync(manifestPath, 'utf-8');
  return createHash('sha256').update(content).digest('hex');
}

export function summarizeCspExtensions(manifest: {
  cspExtensions?: { connectSrc?: string[]; imgSrc?: string[] };
}): string[] {
  const domains: string[] = [];
  const ext = manifest.cspExtensions;
  if (!ext) return domains;
  for (const src of ext.connectSrc ?? []) {
    domains.push(src);
  }
  for (const src of ext.imgSrc ?? []) {
    if (!domains.includes(src)) domains.push(src);
  }
  return domains;
}

export type UninstallPolicy = 'preserveData' | 'removePluginData';

export function parseUninstallPolicy(raw: unknown): UninstallPolicy {
  if (raw === 'preserveData') return 'preserveData';
  return 'removePluginData';
}
