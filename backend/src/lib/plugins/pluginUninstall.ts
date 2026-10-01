import { prisma } from '../prisma.js';
import { reloadPluginHost } from '../../plugins/pluginManager.js';
import { parseUninstallPolicy } from './pluginManifestExtras.js';
import { readManifestForRecord, resolvePluginRoot } from '../../plugins/pluginManager.js';
import fs from 'node:fs';
import path from 'node:path';
import { rm } from 'node:fs/promises';
import { deleteAllPluginSecrets } from './pluginSecretsService.js';
import { deletePluginAssets } from './pluginAssetsService.js';
import {
  normalizeSidebarConfig,
  prunePluginFromSidebarConfig,
  type SidebarConfig,
} from '../sidebarConfig.js';
import { toInputJsonValue } from '../inputJsonValue.js';
import { Prisma } from '../prismaClient.js';

function sidebarConfigSnapshot(config: SidebarConfig): string {
  return JSON.stringify(config);
}

function sidebarConfigsEqual(a: SidebarConfig, b: SidebarConfig): boolean {
  return sidebarConfigSnapshot(a) === sidebarConfigSnapshot(b);
}

/**
 * Prune plugin sidebar entries for one campaign, skipping no-ops and
 * retrying when a concurrent sidebar edit changed the stored JSON.
 */
async function pruneCampaignSidebarConfig(
  campaignId: string,
  pluginId: string,
  initialRaw: unknown,
): Promise<void> {
  let raw: unknown = initialRaw;
  const maxAttempts = 3;

  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    const normalized = normalizeSidebarConfig(raw);
    const pruned = prunePluginFromSidebarConfig(normalized, pluginId);
    if (sidebarConfigsEqual(normalized, pruned)) {
      return;
    }

    const equalsFilter =
      raw === null || raw === undefined
        ? Prisma.DbNull
        : (raw as Prisma.InputJsonValue);

    const result = await prisma.campaign.updateMany({
      where: {
        id: campaignId,
        sidebarConfig: { equals: equalsFilter },
      },
      data: { sidebarConfig: toInputJsonValue(pruned) },
    });

    if (result.count === 1) {
      return;
    }

    const fresh = await prisma.campaign.findUnique({
      where: { id: campaignId },
      select: { sidebarConfig: true },
    });
    if (!fresh) {
      return;
    }
    raw = fresh.sidebarConfig;
  }
}

export async function uninstallPlugin(pluginId: string): Promise<void> {
  const record = await prisma.installedPlugin.findUnique({ where: { name: pluginId } });
  if (!record) {
    throw new Error(`Plugin "${pluginId}" is not installed`);
  }

  const manifest = readManifestForRecord(record);
  const uninstallPolicy = parseUninstallPolicy(
    manifest && 'uninstallPolicy' in manifest
      ? (manifest as { uninstallPolicy?: string }).uninstallPolicy
      : undefined,
  );

  const characterDb = prisma as typeof prisma & {
    pluginCharacterPageState: { updateMany(args: unknown): Promise<unknown> };
  };
  await characterDb.pluginCharacterPageState.updateMany({
    where: { pluginId },
    data: { providerState: 'UNAVAILABLE' },
  });

  if (uninstallPolicy === 'removePluginData') {
    await prisma.pluginData.deleteMany({ where: { pluginId } });
    await prisma.campaignPluginSetting.deleteMany({ where: { pluginId } });
    await deleteAllPluginSecrets(pluginId);
    await deletePluginAssets(pluginId);
  }

  // Credentials and pending grants are never retained after provider code is removed.
  await prisma.pluginConnectionAuthState.deleteMany({ where: { pluginId } });
  await prisma.pluginConnection.deleteMany({ where: { pluginId } });

  // Prune plugin sidebar placement from all campaigns (skip unchanged; retry on races).
  const campaigns = await prisma.campaign.findMany({
    select: { id: true, sidebarConfig: true },
  });
  for (const campaign of campaigns) {
    await pruneCampaignSidebarConfig(campaign.id, pluginId, campaign.sidebarConfig);
  }

  await prisma.systemPlugin.deleteMany({ where: { id: pluginId } });

  const pluginRoot = resolvePluginRoot(record);
  if (fs.existsSync(pluginRoot)) {
    await rm(pluginRoot, { recursive: true, force: true });
  }

  await prisma.installedPlugin.delete({ where: { name: pluginId } });
  await reloadPluginHost();
}

export async function loadConfigSchemaFromDisk(pluginRoot: string): Promise<Record<string, unknown> | undefined> {
  const schemaPath = path.join(pluginRoot, 'config-schema.json');
  if (!fs.existsSync(schemaPath)) return undefined;
  try {
    const raw = JSON.parse(await fs.promises.readFile(schemaPath, 'utf-8')) as unknown;
    if (raw && typeof raw === 'object' && !Array.isArray(raw)) {
      return raw as Record<string, unknown>;
    }
  } catch {
    return undefined;
  }
  return undefined;
}

export async function mergeManifestWithDiskSchema(
  pluginRoot: string,
  manifest: Record<string, unknown>,
): Promise<Record<string, unknown>> {
  const diskSchema = await loadConfigSchemaFromDisk(pluginRoot);
  if (!diskSchema) return manifest;
  return {
    ...manifest,
    configSchema: manifest.configSchema ?? diskSchema,
  };
}
