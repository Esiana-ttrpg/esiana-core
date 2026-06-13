import { prisma } from './prisma.js';
import { deleteAssetRecordFiles } from './assetFiles.js';
import { AssetTypes } from '../types/domain.js';
import { parseTagIconAssetId } from './tagIconValidation.js';
import type { SidebarConfig } from './sidebarConfig.js';
import { collectSidebarIconRefs } from './sidebarConfig.js';

function countSidebarIconAssetRefs(
  config: SidebarConfig,
  assetId: string,
  excludeSectionId?: string,
): number {
  const iconRef = `asset:${assetId}`;
  let count = 0;

  for (const item of [
    ...config.worldLoreOrder,
    ...config.playOrder,
    ...config.toolsOrder,
  ]) {
    if (item.icon === iconRef && item.id !== excludeSectionId) count += 1;
  }

  if (config.fixedSectionIcons) {
    for (const [sectionId, icon] of Object.entries(config.fixedSectionIcons)) {
      if (icon === iconRef && sectionId !== excludeSectionId) count += 1;
    }
  }

  return count;
}

export async function releaseSidebarIconAsset(
  campaignId: string,
  config: SidebarConfig,
  icon: string | null | undefined,
  excludeSectionId?: string,
): Promise<void> {
  const assetId = parseTagIconAssetId(icon ?? null);
  if (!assetId) return;

  const refs = countSidebarIconAssetRefs(config, assetId, excludeSectionId);
  if (refs > 0) return;

  const asset = await prisma.asset.findFirst({
    where: { id: assetId, campaignId, type: AssetTypes.SIDEBAR_ICON },
  });
  if (!asset) return;

  deleteAssetRecordFiles(asset);
  await prisma.asset.delete({ where: { id: assetId } });
}

export async function enrichSidebarConfigWithIconUrls(
  config: SidebarConfig,
): Promise<SidebarConfig> {
  const assetIds = collectSidebarIconRefs(config)
    .map((icon) => parseTagIconAssetId(icon))
    .filter((id): id is string => Boolean(id));

  if (assetIds.length === 0) {
    return config;
  }

  const assets = await prisma.asset.findMany({
    where: { id: { in: assetIds } },
    select: { id: true, url: true },
  });
  const urlById = new Map(assets.map((asset) => [asset.id, asset.url]));

  const worldLoreOrder = config.worldLoreOrder.map((item) => {
    const assetId = parseTagIconAssetId(item.icon);
    if (!assetId) return item;
    return { ...item, iconAssetUrl: urlById.get(assetId) ?? null };
  });

  const playOrder = config.playOrder.map((item) => {
    const assetId = parseTagIconAssetId(item.icon);
    if (!assetId) return item;
    return { ...item, iconAssetUrl: urlById.get(assetId) ?? null };
  });

  const toolsOrder = config.toolsOrder.map((item) => {
    const assetId = parseTagIconAssetId(item.icon);
    if (!assetId) return item;
    return { ...item, iconAssetUrl: urlById.get(assetId) ?? null };
  });

  let fixedSectionIconAssetUrls: Partial<Record<string, string | null>> | undefined;
  if (config.fixedSectionIcons) {
    fixedSectionIconAssetUrls = {};
    for (const [sectionId, icon] of Object.entries(config.fixedSectionIcons)) {
      const assetId = parseTagIconAssetId(icon);
      if (assetId) {
        fixedSectionIconAssetUrls[sectionId] = urlById.get(assetId) ?? null;
      }
    }
    if (Object.keys(fixedSectionIconAssetUrls).length === 0) {
      fixedSectionIconAssetUrls = undefined;
    }
  }

  return {
    ...config,
    worldLoreOrder,
    playOrder,
    toolsOrder,
    ...(fixedSectionIconAssetUrls ? { fixedSectionIconAssetUrls } : {}),
  };
}
