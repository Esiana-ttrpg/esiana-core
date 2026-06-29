import fsSync from 'node:fs';
import path from 'node:path';
import { prisma } from './prisma.js';
import { env } from '../config/env.js';
import { PLAYER_SESSION_NOTES_TITLE } from './seedWiki.js';
import type { CampaignSizeSnapshot } from '../../../shared/campaignCapacityTiers.js';

function isCharactersRoot(row: {
  templateType: string;
  metadata: unknown;
}): boolean {
  if (row.templateType === 'CHARACTER') return true;
  if (typeof row.metadata !== 'object' || row.metadata === null) return false;
  return (row.metadata as Record<string, unknown>).categoryKey === 'characters';
}

export async function buildCampaignSizeSnapshot(campaignId: string): Promise<CampaignSizeSnapshot> {
  const [rows, assets, sessionNotesRoot] = await Promise.all([
    prisma.wikiPage.findMany({
      where: { campaignId },
      select: {
        id: true,
        parentId: true,
        templateType: true,
        metadata: true,
        blocks: true,
      },
    }),
    prisma.asset.findMany({
      where: { campaignId },
      select: { id: true, type: true, url: true },
    }),
    prisma.wikiPage.findFirst({
      where: { campaignId, title: PLAYER_SESSION_NOTES_TITLE },
      select: { id: true },
    }),
  ]);

  const charactersRoot = rows.find(isCharactersRoot);
  const charactersRootId = charactersRoot?.id ?? null;

  let characterCount = 0;
  let locationCount = 0;
  let organizationCount = 0;
  let sessionCount = 0;
  let imageDisplayCount = 0;

  for (const row of rows) {
    if (row.templateType === 'CHARACTER' && row.parentId === charactersRootId) {
      characterCount += 1;
    }
    if (row.templateType === 'LOCATION') {
      locationCount += 1;
    } else if (
      typeof row.metadata === 'object' &&
      row.metadata !== null &&
      (row.metadata as Record<string, unknown>).entityCategory === 'locations'
    ) {
      locationCount += 1;
    }
    if (row.templateType === 'ORGANIZATION') {
      organizationCount += 1;
    } else if (
      typeof row.metadata === 'object' &&
      row.metadata !== null &&
      (row.metadata as Record<string, unknown>).entityCategory === 'organizations'
    ) {
      organizationCount += 1;
    }
    if (row.templateType === 'SESSION_NOTE') {
      sessionCount += 1;
    } else if (sessionNotesRoot && row.parentId === sessionNotesRoot.id) {
      sessionCount += 1;
    }

    const blocks = Array.isArray(row.blocks) ? row.blocks : [];
    imageDisplayCount += blocks.filter((block: unknown) => {
      return (
        typeof block === 'object' &&
        block !== null &&
        (block as Record<string, unknown>).type === 'image-display'
      );
    }).length;
  }

  if (characterCount === 0) {
    characterCount = rows.filter((row) => row.templateType === 'CHARACTER').length;
  }

  const mapAssetCount = assets.filter((asset) => asset.type === 'map').length;
  const mapCount = imageDisplayCount + mapAssetCount;

  let assetStorageBytes = 0;
  for (const asset of assets) {
    const filename = path.basename(asset.url);
    const filePath = path.join(env.uploadsDir, filename);
    if (fsSync.existsSync(filePath)) {
      assetStorageBytes += fsSync.statSync(filePath).size;
    }
  }

  return {
    pageCount: rows.length,
    characterCount,
    locationCount,
    organizationCount,
    sessionCount,
    mapCount,
    assetCount: assets.length,
    assetStorageBytes,
  };
}
