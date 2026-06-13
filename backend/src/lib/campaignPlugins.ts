import type { CampaignPluginSetting, SystemPlugin } from '@prisma/client';
import { prisma } from './prisma.js';
import {
  buildDefaultConfigFromTemplate,
  extractManifestMeta,
  MANIFEST_META_KEY,
  PluginScopes,
  type PluginManifest,
  stripManifestFromConfig,
} from './pluginManifest.js';
import { parsePluginConfig } from './systemPlugins.js';
import { readManifestForRecord } from '../plugins/pluginManager.js';
import { toInputJsonValue } from './inputJsonValue.js';
import { deletePluginAssets } from './plugins/pluginAssetsService.js';
import { deleteCampaignPluginSecrets } from './plugins/pluginSecretsService.js';

type CampaignPluginRow = CampaignPluginSetting & { plugin: SystemPlugin };

function buildCampaignPluginDefinitionConfig(
  manifest: PluginManifest,
): Record<string, unknown> {
  return {
    [MANIFEST_META_KEY]: {
      version: manifest.version,
      description: manifest.description,
      configTemplate: manifest.configTemplate ?? [],
      ...(manifest.category ? { category: manifest.category } : {}),
      ...(manifest.configSchemaUrl ? { configSchemaUrl: manifest.configSchemaUrl } : {}),
      ...(manifest.configSchema ? { configSchema: manifest.configSchema } : {}),
      ...(manifest.uiSlots?.length ? { uiSlots: manifest.uiSlots } : {}),
    },
  };
}

function serializePluginDescriptor(
  plugin: SystemPlugin,
  record?: { frontendEntry?: string | null },
  manifest?: PluginManifest | null,
) {
  const meta = extractManifestMeta(parsePluginConfig(plugin.config));
  return {
    id: plugin.id,
    name: plugin.name,
    scope: plugin.scope,
    version: meta?.version ?? manifest?.version ?? '',
    description: meta?.description ?? manifest?.description ?? '',
    category: meta?.category ?? null,
    configTemplate: meta?.configTemplate ?? [],
    configSchema: meta?.configSchema,
    uiSlots: manifest?.uiSlots ?? meta?.uiSlots ?? [],
    frontendEntry: record?.frontendEntry ?? manifest?.frontendEntry ?? null,
  };
}

export function serializeCampaignPluginSetting(row: CampaignPluginRow) {
  const meta = extractManifestMeta(parsePluginConfig(row.plugin.config));
  const userConfig = stripManifestFromConfig(parsePluginConfig(row.config));

  return {
    campaignId: row.campaignId,
    pluginId: row.pluginId,
    isEnabled: row.isEnabled,
    config: userConfig,
    plugin: {
      id: row.plugin.id,
      name: row.plugin.name,
      scope: row.plugin.scope,
      version: meta?.version ?? '',
      description: meta?.description ?? '',
      category: meta?.category ?? null,
      configTemplate: meta?.configTemplate ?? [],
      configSchema: meta?.configSchema,
      uiSlots: meta?.uiSlots ?? [],
    },
    updatedAt: row.updatedAt.toISOString(),
  };
}

export async function isCampaignPluginEnabled(
  campaignId: string,
  pluginId: string,
): Promise<boolean> {
  const setting = await prisma.campaignPluginSetting.findUnique({
    where: {
      campaignId_pluginId: { campaignId, pluginId },
    },
    select: { isEnabled: true },
  });
  return Boolean(setting?.isEnabled);
}

export async function getCampaignPluginUserConfig(
  campaignId: string,
  pluginId: string,
): Promise<Record<string, unknown>> {
  const setting = await prisma.campaignPluginSetting.findUnique({
    where: {
      campaignId_pluginId: { campaignId, pluginId },
    },
    select: { config: true },
  });
  if (!setting) return {};
  return stripManifestFromConfig(parsePluginConfig(setting.config));
}

/** Server install: upsert SystemPlugin definition only (no CampaignPluginSetting). */
export async function registerCampaignPluginDefinition(
  manifest: PluginManifest,
): Promise<SystemPlugin> {
  return prisma.systemPlugin.upsert({
    where: { id: manifest.id },
    create: {
      id: manifest.id,
      name: manifest.name,
      scope: PluginScopes.CAMPAIGN,
      config: toInputJsonValue(buildCampaignPluginDefinitionConfig(manifest)),
      isEnabled: false,
    },
    update: {
      name: manifest.name,
      scope: PluginScopes.CAMPAIGN,
      config: toInputJsonValue(buildCampaignPluginDefinitionConfig(manifest)),
    },
  });
}

export async function listAvailableCampaignPlugins() {
  const plugins = await prisma.systemPlugin.findMany({
    where: { scope: PluginScopes.CAMPAIGN },
    orderBy: { name: 'asc' },
  });

  const installed = await prisma.installedPlugin.findMany({
    where: { name: { in: plugins.map((plugin) => plugin.id) } },
  });
  const installedByName = new Map(installed.map((record) => [record.name, record]));

  return plugins
    .filter((plugin) => installedByName.has(plugin.id))
    .map((plugin) => {
      const record = installedByName.get(plugin.id)!;
      const manifest = readManifestForRecord(record);
      return serializePluginDescriptor(plugin, record, manifest);
    });
}

export async function listCampaignPluginSettings(campaignId: string) {
  const rows = await prisma.campaignPluginSetting.findMany({
    where: {
      campaignId,
      plugin: { scope: PluginScopes.CAMPAIGN },
    },
    include: { plugin: true },
    orderBy: { plugin: { name: 'asc' } },
  });

  const installed = await prisma.installedPlugin.findMany({
    where: { name: { in: rows.map((row) => row.pluginId) } },
  });
  const installedByName = new Map(installed.map((record) => [record.name, record]));

  return rows.map((row) => {
    const serialized = serializeCampaignPluginSetting(row);
    const record = installedByName.get(row.pluginId);
    const manifest = record ? readManifestForRecord(record) : null;
    return {
      ...serialized,
      plugin: {
        ...serialized.plugin,
        uiSlots: manifest?.uiSlots ?? serialized.plugin.uiSlots,
        frontendEntry: record?.frontendEntry ?? manifest?.frontendEntry ?? null,
      },
    };
  });
}

export async function registerCampaignPluginFromManifest(
  campaignId: string,
  manifest: PluginManifest,
): Promise<ReturnType<typeof serializeCampaignPluginSetting>> {
  const campaignConfig = buildDefaultConfigFromTemplate(manifest.configTemplate);
  const existingSetting = await prisma.campaignPluginSetting.findUnique({
    where: {
      campaignId_pluginId: { campaignId, pluginId: manifest.id },
    },
  });

  const priorCampaignConfig = existingSetting
    ? stripManifestFromConfig(parsePluginConfig(existingSetting.config))
    : {};

  await registerCampaignPluginDefinition(manifest);

  const setting = await prisma.campaignPluginSetting.upsert({
    where: {
      campaignId_pluginId: { campaignId, pluginId: manifest.id },
    },
    create: {
      campaignId,
      pluginId: manifest.id,
      isEnabled: false,
      config: toInputJsonValue({ ...campaignConfig, ...priorCampaignConfig }),
    },
    update: {
      config: toInputJsonValue({ ...campaignConfig, ...priorCampaignConfig }),
    },
    include: { plugin: true },
  });

  return serializeCampaignPluginSetting(setting);
}

export async function enableCampaignPlugin(
  campaignId: string,
  pluginId: string,
): Promise<ReturnType<typeof serializeCampaignPluginSetting>> {
  const record = await prisma.installedPlugin.findUnique({ where: { name: pluginId } });
  if (!record) {
    throw new Error(`Plugin "${pluginId}" is not installed on this server`);
  }

  const manifest = readManifestForRecord(record);
  if (!manifest || manifest.scope !== PluginScopes.CAMPAIGN) {
    throw new Error(`Plugin "${pluginId}" is not a campaign-scoped plugin`);
  }

  await registerCampaignPluginFromManifest(campaignId, manifest);

  const row = await prisma.campaignPluginSetting.update({
    where: {
      campaignId_pluginId: { campaignId, pluginId },
    },
    data: { isEnabled: true },
    include: { plugin: true },
  });

  return serializeCampaignPluginSetting(row);
}

export async function disableCampaignPlugin(
  campaignId: string,
  pluginId: string,
): Promise<ReturnType<typeof serializeCampaignPluginSetting>> {
  return updateCampaignPluginSetting(campaignId, pluginId, {}, false);
}

export async function removeCampaignPlugin(
  campaignId: string,
  pluginId: string,
): Promise<void> {
  const existing = await prisma.campaignPluginSetting.findFirst({
    where: {
      campaignId,
      pluginId,
      plugin: { scope: PluginScopes.CAMPAIGN },
    },
  });

  if (!existing) {
    throw new Error('Campaign plugin not found');
  }

  await prisma.pluginData.deleteMany({ where: { pluginId, campaignId } });
  await deleteCampaignPluginSecrets(pluginId, campaignId);
  await deletePluginAssets(pluginId, campaignId);
  await prisma.campaignPluginSetting.delete({
    where: {
      campaignId_pluginId: { campaignId, pluginId },
    },
  });
}

export async function updateCampaignPluginSetting(
  campaignId: string,
  pluginId: string,
  config: Record<string, unknown>,
  isEnabled?: boolean,
): Promise<ReturnType<typeof serializeCampaignPluginSetting>> {
  const existing = await prisma.campaignPluginSetting.findFirst({
    where: {
      campaignId,
      pluginId,
      plugin: { scope: PluginScopes.CAMPAIGN },
    },
    include: { plugin: true },
  });

  if (!existing) {
    throw new Error('Campaign plugin not found');
  }

  const row = await prisma.campaignPluginSetting.update({
    where: {
      campaignId_pluginId: { campaignId, pluginId },
    },
    data: {
      config: toInputJsonValue(config),
      ...(isEnabled !== undefined ? { isEnabled } : {}),
    },
    include: { plugin: true },
  });

  return serializeCampaignPluginSetting(row);
}

/** Enable campaign-scoped plugins after a generator job (host-only). */
export async function enableCampaignPluginsForCampaign(
  campaignId: string,
  pluginIds: string[],
): Promise<void> {
  const uniqueIds = [...new Set(pluginIds.map((id) => id.trim()).filter(Boolean))];
  if (uniqueIds.length === 0) return;

  for (const pluginId of uniqueIds) {
    try {
      await enableCampaignPlugin(campaignId, pluginId);
    } catch {
      // Plugin not server-installed — skip silently (seeder attachCampaignPlugins)
    }
  }
}
