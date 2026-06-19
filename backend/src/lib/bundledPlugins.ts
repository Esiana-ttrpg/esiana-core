import fs from 'node:fs';
import path from 'node:path';
import { env } from '../config/env.js';
import { parsePluginRegistryIndex, type PluginRegistryEntry } from './pluginManifest.js';

function resolveLocalRegistryPath(): string | null {
  const inPluginsDir = path.join(env.pluginsDir, 'registry.json');
  if (fs.existsSync(inPluginsDir)) return inPluginsDir;

  const monorepoRegistry = path.join(
    env.repoRoot,
    '..',
    'community-plugins',
    'registry.json',
  );
  if (fs.existsSync(monorepoRegistry)) return monorepoRegistry;

  return null;
}

export function readLocalPluginRegistryFromDisk():
  | { ok: true; plugins: PluginRegistryEntry[] }
  | { ok: false; errors: string[] } {
  const registryPath = resolveLocalRegistryPath();
  if (!registryPath) {
    return { ok: false, errors: [] };
  }

  try {
    const raw = JSON.parse(fs.readFileSync(registryPath, 'utf-8')) as unknown;
    return parsePluginRegistryIndex(raw);
  } catch {
    return { ok: false, errors: ['Local plugin registry is not valid JSON'] };
  }
}

/** Monorepo fallback when remote registry fetch fails — not a registry URL identity. */
export function collectLocalRegistryFallback(): {
  plugins: PluginRegistryEntry[];
  warnings: string[];
} {
  const localRegistry = readLocalPluginRegistryFromDisk();
  if (localRegistry.ok) {
    return {
      plugins: localRegistry.plugins,
      warnings: ['Remote registry unavailable — merged local community-plugins/registry.json'],
    };
  }
  if (localRegistry.errors.length > 0) {
    return { plugins: [], warnings: localRegistry.errors };
  }
  return { plugins: [], warnings: [] };
}

export function mergeDiscoverablePluginEntries(
  ...groups: PluginRegistryEntry[][]
): PluginRegistryEntry[] {
  const byId = new Map<string, PluginRegistryEntry>();

  for (const group of groups) {
    for (const entry of group) {
      byId.set(entry.id, entry);
    }
  }

  return [...byId.values()].sort((a, b) => a.name.localeCompare(b.name));
}

export function filterUndiscoveredCampaignEntries(
  entries: PluginRegistryEntry[],
  installedPluginIds: Set<string>,
): PluginRegistryEntry[] {
  return entries.filter(
    (entry) => entry.scope === 'campaign' && !installedPluginIds.has(entry.id),
  );
}
