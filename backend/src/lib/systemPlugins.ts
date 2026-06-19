import type { Prisma, SystemPlugin } from '@prisma/client';
import { prisma } from './prisma.js';
import {
  buildDefaultConfigFromTemplate,
  extractManifestMeta,
  MANIFEST_META_KEY,
  type PluginManifest,
  stripManifestFromConfig,
} from './pluginManifest.js';
import { env } from '../config/env.js';

/** Runtime scope literals for SystemPlugin rows and manifest validation. */
export const PluginScopes = {
  GLOBAL: 'global',
  CAMPAIGN: 'campaign',
} as const;

export type PluginScope = (typeof PluginScopes)[keyof typeof PluginScopes];

export function parsePluginConfig(config: Prisma.JsonValue): Record<string, unknown> {
  if (config && typeof config === 'object' && !Array.isArray(config)) {
    return config as Record<string, unknown>;
  }
  return {};
}

function buildManifestMetaConfig(manifest: PluginManifest): Record<string, unknown> {
  return {
    [MANIFEST_META_KEY]: {
      version: manifest.version,
      description: manifest.description,
      configTemplate: manifest.configTemplate ?? [],
      ...(manifest.category ? { category: manifest.category } : {}),
      ...(manifest.configSchemaUrl ? { configSchemaUrl: manifest.configSchemaUrl } : {}),
      ...(manifest.configSchema ? { configSchema: manifest.configSchema } : {}),
      ...(manifest.uiSlots?.length ? { uiSlots: manifest.uiSlots } : {}),
      ...(manifest.permissions?.length ? { permissions: manifest.permissions } : {}),
      ...(manifest.engines ? { engines: manifest.engines } : {}),
      ...(manifest.compatibility ? { compatibility: manifest.compatibility } : {}),
    },
  };
}

function buildGlobalStoredConfig(
  manifest: PluginManifest,
  existingConfig?: Record<string, unknown>,
): Record<string, unknown> {
  const defaults = buildDefaultConfigFromTemplate(manifest.configTemplate);
  const priorUser = existingConfig ? stripManifestFromConfig(existingConfig) : {};
  return {
    ...defaults,
    ...priorUser,
    ...buildManifestMetaConfig(manifest),
  };
}

export function serializeSystemPlugin(row: SystemPlugin) {
  const rawConfig = parsePluginConfig(row.config);
  const meta = extractManifestMeta(rawConfig);
  const userConfig = stripManifestFromConfig(rawConfig);

  return {
    id: row.id,
    name: row.name,
    scope: row.scope,
    isEnabled: row.isEnabled,
    installedAt: row.installedAt.toISOString(),
    version: meta?.version ?? '',
    description: meta?.description ?? '',
    category: meta?.category ?? null,
    configTemplate: meta?.configTemplate ?? [],
    configSchema: meta?.configSchema,
    uiSlots: meta?.uiSlots ?? [],
    permissions: meta?.permissions ?? [],
    engines: meta?.engines ?? {},
    compatibility: meta?.compatibility,
    config: userConfig,
    updatedAt: row.updatedAt.toISOString(),
  };
}

export async function listSystemPluginsByScope(
  scope: PluginScope,
): Promise<SystemPlugin[]> {
  return prisma.systemPlugin.findMany({
    where: { scope },
    orderBy: { name: 'asc' },
  });
}

export async function getSystemPluginById(
  pluginId: string,
): Promise<SystemPlugin | null> {
  return prisma.systemPlugin.findUnique({ where: { id: pluginId } });
}

export async function registerGlobalPluginFromManifest(
  manifest: PluginManifest,
): Promise<SystemPlugin> {
  const existing = await getSystemPluginById(manifest.id);
  const config = buildGlobalStoredConfig(
    manifest,
    existing ? parsePluginConfig(existing.config) : undefined,
  );

  return prisma.systemPlugin.upsert({
    where: { id: manifest.id },
    create: {
      id: manifest.id,
      name: manifest.name,
      scope: PluginScopes.GLOBAL,
      config: config as Prisma.InputJsonValue,
      isEnabled: false,
    },
    update: {
      name: manifest.name,
      scope: PluginScopes.GLOBAL,
      config: config as Prisma.InputJsonValue,
    },
  });
}

/** @deprecated Use registerGlobalPluginFromManifest */
export async function registerPluginFromManifest(
  manifest: PluginManifest,
): Promise<SystemPlugin> {
  return registerGlobalPluginFromManifest(manifest);
}

export async function updateSystemPluginConfig(
  pluginId: string,
  config: Record<string, unknown>,
  isEnabled?: boolean,
): Promise<SystemPlugin> {
  const existing = await getSystemPluginById(pluginId);
  if (!existing) {
    throw new Error('Unknown plugin');
  }

  if (existing.scope !== PluginScopes.GLOBAL) {
    throw new Error('Campaign-scoped plugins must be configured per campaign');
  }

  const prior = parsePluginConfig(existing.config);
  const meta = prior[MANIFEST_META_KEY];
  const mergedConfig = {
    ...stripManifestFromConfig(prior),
    ...config,
    ...(meta !== undefined ? { [MANIFEST_META_KEY]: meta } : {}),
  };

  return prisma.systemPlugin.update({
    where: { id: pluginId },
    data: {
      config: mergedConfig as Prisma.InputJsonValue,
      ...(isEnabled !== undefined ? { isEnabled } : {}),
    },
  });
}

export function getCoreVersion(): string {
  return env.coreVersion;
}

/** @deprecated Global plugins sync from disk via pluginManager.syncGlobalSystemPluginsFromDisk */
export async function bootstrapSystemPlugins(): Promise<void> {}

/** @deprecated Use pluginManager.syncGlobalSystemPluginsFromDisk */
export async function syncGlobalPluginsFromDisk(): Promise<number> {
  return 0;
}
