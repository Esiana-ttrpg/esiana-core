import { prisma } from './prisma.js';
import { deleteAssetRecordFiles } from './assetFiles.js';
import { AssetTypes } from '../types/domain.js';
import { parseTagIconAssetId } from './tagIconValidation.js';

export async function countTagsReferencingAsset(
  campaignId: string,
  assetId: string,
  excludeTagId?: string,
): Promise<number> {
  const iconRef = `asset:${assetId}`;
  return prisma.tag.count({
    where: {
      campaignId,
      icon: iconRef,
      ...(excludeTagId ? { id: { not: excludeTagId } } : {}),
    },
  });
}

/**
 * Deletes a tag-icon asset when it is no longer referenced by any tag in the campaign.
 */
export async function releaseTagIconAsset(
  campaignId: string,
  icon: string | null | undefined,
  excludeTagId?: string,
): Promise<void> {
  const assetId = parseTagIconAssetId(icon ?? null);
  if (!assetId) return;

  const refs = await countTagsReferencingAsset(campaignId, assetId, excludeTagId);
  if (refs > 0) return;

  const asset = await prisma.asset.findFirst({
    where: { id: assetId, campaignId, type: AssetTypes.TAG_ICON },
  });
  if (!asset) return;

  deleteAssetRecordFiles(asset);
  await prisma.asset.delete({ where: { id: assetId } });
}

export async function enrichWikiTagsWithIconUrls<
  T extends { icon: string | null },
>(tags: T[]): Promise<(T & { iconAssetUrl: string | null })[]> {
  const assetIds = tags
    .map((tag) => parseTagIconAssetId(tag.icon))
    .filter((id): id is string => Boolean(id));

  if (assetIds.length === 0) {
    return tags.map((tag) => ({ ...tag, iconAssetUrl: null }));
  }

  const assets = await prisma.asset.findMany({
    where: { id: { in: assetIds } },
    select: { id: true, url: true },
  });
  const urlById = new Map(assets.map((a) => [a.id, a.url]));

  return tags.map((tag) => {
    const assetId = parseTagIconAssetId(tag.icon);
    return {
      ...tag,
      iconAssetUrl: assetId ? (urlById.get(assetId) ?? null) : null,
    };
  });
}
