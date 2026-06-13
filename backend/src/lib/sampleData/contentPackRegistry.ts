import { prisma } from '../prisma.js';
import {
  PluginCapabilities,
  PluginScopes,
  type ContentPackManifestEntry,
  type PluginManifest,
} from '../pluginManifest.js';
import { readManifestForRecord } from '../../plugins/pluginManager.js';
import { CAMPAIGN_FORMAT_TO_RECRUITMENT } from '../../../../shared/campaignFormat.js';
import type { CampaignFormatSlug } from '../../../../shared/campaignFormat.js';

export interface ContentPackCard {
  kind: 'contentPack';
  source: 'plugin';
  pluginId: string;
  pluginName: string;
  packId: string;
  name: string;
  description: string;
  campaignFormat: CampaignFormatSlug;
  gameSystem?: string;
  genreThemes?: string[];
  author?: string;
  authorUrl?: string;
}

export interface ContentPackSpec {
  kind: 'contentPack';
  pluginId: string;
  packId: string;
}

export interface ValidatedContentPack {
  pluginId: string;
  pluginName: string;
  pack: ContentPackManifestEntry;
  recruitmentCampaignFormat: string;
}

function isContentPackManifest(manifest: PluginManifest): boolean {
  return (
    manifest.scope === PluginScopes.GLOBAL &&
    (manifest.capabilities?.includes(PluginCapabilities.CONTENT_PACK) ?? false)
  );
}

function contentPacksFromManifest(manifest: PluginManifest): ContentPackManifestEntry[] {
  if (manifest.contentPacks?.length) return manifest.contentPacks;
  return [];
}

export async function listEnabledContentPacks(): Promise<ContentPackCard[]> {
  const globalPlugins = await prisma.systemPlugin.findMany({
    where: { scope: PluginScopes.GLOBAL, isEnabled: true },
    select: { id: true, name: true },
  });

  const cards: ContentPackCard[] = [];

  for (const row of globalPlugins) {
    const installed = await prisma.installedPlugin.findUnique({
      where: { name: row.id },
    });
    if (!installed?.isEnabled) continue;

    const manifest = readManifestForRecord(installed);
    if (!manifest || !isContentPackManifest(manifest)) continue;

    for (const pack of contentPacksFromManifest(manifest)) {
      cards.push({
        kind: 'contentPack',
        source: 'plugin',
        pluginId: manifest.id,
        pluginName: manifest.name,
        packId: pack.id,
        name: pack.name,
        description: pack.description,
        campaignFormat: pack.campaignFormat,
        ...(pack.gameSystem ? { gameSystem: pack.gameSystem } : {}),
        ...(pack.genreThemes?.length ? { genreThemes: pack.genreThemes } : {}),
        ...(pack.author ? { author: pack.author } : {}),
        ...(pack.authorUrl ? { authorUrl: pack.authorUrl } : {}),
      });
    }
  }

  return cards;
}

export async function validateContentPackRequest(
  spec: ContentPackSpec,
): Promise<{ ok: true; validated: ValidatedContentPack } | { ok: false; error: string }> {
  const pluginId = spec.pluginId.trim();
  const packId = spec.packId.trim();
  if (!pluginId || !packId) {
    return { ok: false, error: 'pluginId and packId are required' };
  }

  const systemRow = await prisma.systemPlugin.findUnique({
    where: { id: pluginId },
    select: { isEnabled: true, scope: true, name: true },
  });
  if (!systemRow?.isEnabled || systemRow.scope !== PluginScopes.GLOBAL) {
    return { ok: false, error: `Content pack plugin "${pluginId}" is not enabled globally` };
  }

  const installed = await prisma.installedPlugin.findUnique({ where: { name: pluginId } });
  if (!installed?.isEnabled) {
    return { ok: false, error: `Content pack plugin "${pluginId}" is not installed or enabled` };
  }

  const manifest = readManifestForRecord(installed);
  if (!manifest || !isContentPackManifest(manifest)) {
    return { ok: false, error: `Plugin "${pluginId}" is not a content pack provider` };
  }

  const pack = contentPacksFromManifest(manifest).find((entry) => entry.id === packId);
  if (!pack) {
    return { ok: false, error: `Unknown content pack "${packId}"` };
  }

  return {
    ok: true,
    validated: {
      pluginId,
      pluginName: manifest.name,
      pack,
      recruitmentCampaignFormat: CAMPAIGN_FORMAT_TO_RECRUITMENT[pack.campaignFormat],
    },
  };
}
