import { prisma } from '../prisma.js';
import { stripManifestFromConfig } from '../pluginManifest.js';
import { parsePluginConfig } from '../systemPlugins.js';

/** Plugin configuration is instance-owned; campaignId remains only for host API compatibility. */
export async function getPluginCampaignConfig(pluginId: string, _campaignId: string, key?: string): Promise<Record<string, unknown> | unknown> {
  const plugin = await prisma.systemPlugin.findUnique({ where: { id: pluginId }, select: { config: true } });
  const config = stripManifestFromConfig(parsePluginConfig(plugin?.config ?? {}));
  return key ? config[key] : config;
}

export async function setPluginCampaignConfig(_pluginId: string, _campaignId: string, _partial: Record<string, unknown>): Promise<Record<string, unknown>> {
  throw new Error('Plugin configuration can only be changed by an application administrator');
}
