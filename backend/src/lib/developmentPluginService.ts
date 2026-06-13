import type { Prisma } from '@prisma/client';
import { prisma } from './prisma.js';
import { PluginCapabilities, PluginScopes } from './pluginManifest.js';
import { readManifestForRecord } from '../plugins/pluginManager.js';
import { isCampaignPluginEnabled } from './campaignPlugins.js';
import { listRegisteredProviderIds } from './developmentRegistry.js';

export async function getEnabledDevelopmentPluginIds(
  campaignId: string,
  tx?: Prisma.TransactionClient,
): Promise<Set<string>> {
  const db = tx ?? prisma;
  const enabled = new Set<string>();
  const providerIds = listRegisteredProviderIds().filter((id) => id !== 'core');

  for (const pluginId of providerIds) {
    const installed = await db.installedPlugin.findUnique({
      where: { name: pluginId },
      select: { isEnabled: true, installPath: true, name: true },
    });
    if (!installed?.isEnabled) continue;

    const manifest = readManifestForRecord(installed);
    if (!manifest?.capabilities?.includes(PluginCapabilities.DEVELOPMENT_PROVIDER)) {
      continue;
    }

    if (manifest.scope === PluginScopes.CAMPAIGN) {
      if (await isCampaignPluginEnabled(campaignId, pluginId)) {
        enabled.add(pluginId);
      }
      continue;
    }

    const system = await db.systemPlugin.findUnique({
      where: { id: pluginId },
      select: { isEnabled: true },
    });
    if (system?.isEnabled) {
      enabled.add(pluginId);
    }
  }

  return enabled;
}
