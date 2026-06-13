import { prisma } from '../prisma.js';
import { parsePluginConfig } from '../systemPlugins.js';
import { stripManifestFromConfig } from '../pluginManifest.js';
import { toInputJsonValue } from '../inputJsonValue.js';

export async function getPluginCampaignConfig(
  pluginId: string,
  campaignId: string,
  key?: string,
): Promise<Record<string, unknown> | unknown> {
  const setting = await prisma.campaignPluginSetting.findUnique({
    where: { campaignId_pluginId: { campaignId, pluginId } },
    select: { config: true },
  });
  const config = stripManifestFromConfig(parsePluginConfig(setting?.config ?? {}));
  if (key) return config[key];
  return config;
}

export async function setPluginCampaignConfig(
  pluginId: string,
  campaignId: string,
  partial: Record<string, unknown>,
): Promise<Record<string, unknown>> {
  const existing = await prisma.campaignPluginSetting.findUnique({
    where: { campaignId_pluginId: { campaignId, pluginId } },
    select: { config: true, isEnabled: true },
  });
  const current = stripManifestFromConfig(parsePluginConfig(existing?.config ?? {}));
  const next = { ...current, ...partial };
  await prisma.campaignPluginSetting.upsert({
    where: { campaignId_pluginId: { campaignId, pluginId } },
    create: {
      campaignId,
      pluginId,
      isEnabled: false,
      config: toInputJsonValue(next),
    },
    update: {
      config: toInputJsonValue(next),
    },
  });
  return next;
}
