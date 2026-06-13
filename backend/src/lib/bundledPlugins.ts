import fs from 'node:fs';
import path from 'node:path';
import { env } from '../config/env.js';
import {
  PluginScopes,
  parsePluginRegistryIndex,
  type PluginManifest,
  type PluginRegistryEntry,
} from './pluginManifest.js';
import { listAvailablePluginDirs, readRuntimeManifest } from '../plugins/pluginManager.js';

export function manifestToRegistryEntry(
  manifest: PluginManifest,
  options: { bundled?: boolean; installable?: boolean } = {},
): PluginRegistryEntry {
  const bundled = options.bundled ?? false;
  return {
    id: manifest.id,
    name: manifest.name,
    version: manifest.version,
    description: manifest.description,
    scope: manifest.scope,
    ...(manifest.category ? { category: manifest.category } : {}),
    ...(manifest.configTemplate ? { configTemplate: manifest.configTemplate } : {}),
    ...(manifest.backendEntry ? { backendEntry: manifest.backendEntry } : {}),
    ...(manifest.frontendEntry ? { frontendEntry: manifest.frontendEntry } : {}),
    ...(manifest.githubUrl ? { githubUrl: manifest.githubUrl } : {}),
    ...(manifest.permissions ? { permissions: manifest.permissions } : {}),
    ...(manifest.engines ? { engines: manifest.engines } : {}),
    ...(manifest.configSchema ? { configSchema: manifest.configSchema } : {}),
    ...(manifest.configSchemaUrl ? { configSchemaUrl: manifest.configSchemaUrl } : {}),
    ...(bundled ? { source: { type: 'bundled' as const }, installable: true } : {}),
    ...(options.installable !== undefined ? { installable: options.installable } : {}),
  };
}

/** Campaign-scoped plugins shipped on disk under PLUGINS_DIR. */
export function listBundledCampaignPluginEntries(): PluginRegistryEntry[] {
  const entries: PluginRegistryEntry[] = [];

  for (const dir of listAvailablePluginDirs()) {
    const manifest = readRuntimeManifest(dir);
    if (!manifest || manifest.scope !== PluginScopes.CAMPAIGN) continue;
    entries.push(manifestToRegistryEntry(manifest, { bundled: true }));
  }

  entries.sort((a, b) => a.name.localeCompare(b.name));
  return entries;
}

/** Global plugins linked on disk under PLUGINS_DIR (dev / generators without registry publish). */
export function listBundledGlobalPluginEntries(): PluginRegistryEntry[] {
  const entries: PluginRegistryEntry[] = [];

  for (const dir of listAvailablePluginDirs()) {
    const manifest = readRuntimeManifest(dir);
    if (!manifest || manifest.scope !== PluginScopes.GLOBAL) continue;
    entries.push(manifestToRegistryEntry(manifest, { bundled: true }));
  }

  entries.sort((a, b) => a.name.localeCompare(b.name));
  return entries;
}

export function collectAdminDiscoverablePluginEntries(): {
  plugins: PluginRegistryEntry[];
  registryUrl: string;
  warnings: string[];
} {
  const warnings: string[] = [];
  const remoteGroups: PluginRegistryEntry[][] = [listBundledGlobalPluginEntries()];
  let registryUrl = 'bundled://local';

  const localRegistry = readLocalPluginRegistryFromDisk();
  if (localRegistry.ok) {
    registryUrl = 'file://community-plugins/registry.json';
    remoteGroups.push(localRegistry.plugins);
  } else if (localRegistry.errors.length > 0) {
    warnings.push(localRegistry.errors.join('; '));
  }

  return {
    plugins: mergeDiscoverablePluginEntries(...remoteGroups),
    registryUrl,
    warnings,
  };
}

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
    return { ok: false, errors: ['Local plugin registry not found (plugins/ or community-plugins/)'] };
  }

  try {
    const raw = JSON.parse(fs.readFileSync(registryPath, 'utf-8')) as unknown;
    return parsePluginRegistryIndex(raw);
  } catch {
    return { ok: false, errors: ['Local plugin registry is not valid JSON'] };
  }
}

export function mergeDiscoverablePluginEntries(
  ...groups: PluginRegistryEntry[][]
): PluginRegistryEntry[] {
  const byId = new Map<string, PluginRegistryEntry>();

  for (const group of groups) {
    for (const entry of group) {
      const existing = byId.get(entry.id);
      if (!existing) {
        byId.set(entry.id, entry);
        continue;
      }
      if (existing.source?.type === 'bundled') {
        byId.set(entry.id, existing);
      } else {
        byId.set(entry.id, entry);
      }
    }
  }

  return [...byId.values()].sort((a, b) => a.name.localeCompare(b.name));
}

export function filterUndiscoveredCampaignEntries(
  entries: PluginRegistryEntry[],
  installedPluginIds: Set<string>,
): PluginRegistryEntry[] {
  return entries.filter(
    (entry) =>
      entry.scope === PluginScopes.CAMPAIGN && !installedPluginIds.has(entry.id),
  );
}
