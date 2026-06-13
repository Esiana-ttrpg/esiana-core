import type { PluginRegistryEntry } from '@/lib/pluginManifest';

export function summarizeRegistryEntryNetworkAccess(entry: PluginRegistryEntry): string[] {
  const domains: string[] = [];
  const ext = entry.cspExtensions;
  if (!ext) return domains;
  for (const src of ext.connectSrc ?? []) {
    if (!domains.includes(src)) domains.push(src);
  }
  for (const src of ext.imgSrc ?? []) {
    if (!domains.includes(src)) domains.push(src);
  }
  return domains;
}

export function summarizeRegistryEntryPermissions(entry: PluginRegistryEntry): string[] {
  return entry.permissions ?? [];
}
