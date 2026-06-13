import path from 'node:path';
import { prisma } from './prisma.js';
import {
  PluginScopes,
  type PluginManifest,
  type PluginUiSlotId,
  stripManifestFromConfig,
} from './pluginManifest.js';
import { parsePluginConfig } from './systemPlugins.js';
import { isCampaignPluginEnabled } from './campaignPlugins.js';
import {
  readManifestForRecord,
  resolvePluginRoot,
} from '../plugins/pluginManager.js';

export interface FrontendPluginDescriptor {
  id: string;
  name: string;
  scope: string;
  version: string;
  frontendEntry: string;
  uiSlots: PluginUiSlotId[];
  config: Record<string, unknown>;
  runtimeStatus?: string;
  quarantineReason?: string | null;
  trustedInstall?: boolean;
  cspExtensions?: {
    connectSrc?: string[];
    imgSrc?: string[];
  };
}

async function isPluginActiveForCampaign(
  pluginId: string,
  scope: string,
  campaignId: string | undefined,
  installedEnabled: boolean,
  systemEnabled: boolean,
): Promise<boolean> {
  if (scope === PluginScopes.CAMPAIGN) {
    if (!campaignId) return false;
    return isCampaignPluginEnabled(campaignId, pluginId);
  }
  return installedEnabled && systemEnabled;
}

/**
 * Enabled plugins with a frontend entry for the active campaign (or global-only).
 */
export async function listFrontendRuntimePlugins(
  campaignId?: string,
): Promise<FrontendPluginDescriptor[]> {
  const installed = await prisma.installedPlugin.findMany({
    orderBy: { name: 'asc' },
  });

  const systemRows = await prisma.systemPlugin.findMany({
    where: { id: { in: installed.map((row) => row.name) } },
  });
  const systemById = new Map(systemRows.map((row) => [row.id, row]));

  const campaignConfigs = campaignId
    ? await prisma.campaignPluginSetting.findMany({
        where: { campaignId },
        select: { pluginId: true, config: true, isEnabled: true },
      })
    : [];
  const campaignConfigByPlugin = new Map(
    campaignConfigs.map((row) => [row.pluginId, row]),
  );

  const descriptors: FrontendPluginDescriptor[] = [];

  for (const record of installed) {
    const manifest = readManifestForRecord(record);
    if (!manifest?.frontendEntry) continue;

    const system = systemById.get(record.name);
    const scope = manifest.scope ?? system?.scope ?? PluginScopes.GLOBAL;
    const active = await isPluginActiveForCampaign(
      record.name,
      scope,
      campaignId,
      record.isEnabled,
      system?.isEnabled ?? false,
    );
    if (!active) continue;

    const systemConfig = system ? parsePluginConfig(system.config) : {};
    const userConfig = stripManifestFromConfig(systemConfig);
    const campaignRow = campaignConfigByPlugin.get(record.name);
    const campaignUserConfig = campaignRow
      ? stripManifestFromConfig(parsePluginConfig(campaignRow.config))
      : {};

    descriptors.push({
      id: record.name,
      name: manifest.name,
      scope,
      version: record.version,
      frontendEntry: record.frontendEntry,
      uiSlots: manifest.uiSlots ?? [],
      config: {
        ...userConfig,
        ...campaignUserConfig,
      },
      runtimeStatus: record.runtimeStatus,
      quarantineReason: record.quarantineReason,
      trustedInstall: record.trustedInstall,
      cspExtensions: manifest.cspExtensions,
    });
  }

  return descriptors;
}

export async function resolvePluginAssetPath(
  pluginId: string,
  relativePath: string,
): Promise<{ pluginRoot: string; absolutePath: string } | null> {
  const record = await prisma.installedPlugin.findUnique({ where: { name: pluginId } });
  if (!record) return null;

  const pluginRoot = path.resolve(resolvePluginRoot(record));
  const safeRelative = relativePath.replace(/^(\.\/)+/, '').replace(/\\/g, '/');
  if (!safeRelative || safeRelative.includes('..') || safeRelative.includes('\0')) {
    return null;
  }

  const absolutePath = path.resolve(pluginRoot, safeRelative);
  const relative = path.relative(pluginRoot, absolutePath);
  if (relative.startsWith('..') || path.isAbsolute(relative)) {
    return null;
  }

  return { pluginRoot, absolutePath };
}

export async function canAccessPluginAssets(
  pluginId: string,
  campaignId: string | undefined,
  userId: string | undefined,
): Promise<boolean> {
  const installed = await prisma.installedPlugin.findUnique({
    where: { name: pluginId },
  });
  if (!installed) return false;

  const manifest = readManifestForRecord(installed);
  const system = await prisma.systemPlugin.findUnique({ where: { id: pluginId } });
  const scope = manifest?.scope ?? system?.scope ?? PluginScopes.GLOBAL;

  if (!userId) return false;

  if (scope === PluginScopes.GLOBAL) {
    return installed.isEnabled && (system?.isEnabled ?? false);
  }

  if (!campaignId) return false;

  const membership = await prisma.campaignMember.findUnique({
    where: { userId_campaignId: { userId, campaignId } },
    select: { userId: true },
  });
  if (!membership) return false;

  return isPluginActiveForCampaign(
    pluginId,
    scope,
    campaignId,
    installed.isEnabled,
    system?.isEnabled ?? false,
  );
}
