import fs from 'node:fs';
import path from 'node:path';
import { prisma } from '../prisma.js';
import { env } from '../../config/env.js';
import { uploadFilenameFromUrl } from '../campaignMediaSize.js';
import { buildWikiTreePaths } from './buildWikiTreePaths.js';
import {
  isFolderOnlyWikiPage,
  wikiPageToMarkdown,
} from './wikiPageToMarkdown.js';
import {
  CAMPAIGN_BACKUP_FORMAT,
  type CampaignBackupExportKind,
  type SovereignExportFile,
  type SovereignExportResult,
  type SovereignMediaAssetEntry,
  type SovereignRelations,
} from './types.js';
import {
  buildOperationalPayload,
  SOVEREIGN_OPERATIONAL_PATH,
} from './sovereignOperational.js';
import {
  buildKnowledgePayload,
  SOVEREIGN_KNOWLEDGE_PATH,
} from './sovereignKnowledge.js';

const SKIP_ASSET_TYPES = new Set(['campaign-import-zip', 'campaign-backup-zip']);

function mediaFilenameForAsset(assetId: string, originalUrl: string): string {
  const ext = path.extname(uploadFilenameFromUrl(originalUrl) ?? originalUrl) || '.bin';
  return `${assetId}${ext.toLowerCase()}`;
}

export async function buildSovereignExport(
  campaignId: string,
  exportKind: CampaignBackupExportKind = 'sovereign',
): Promise<SovereignExportResult | null> {
  const campaign = await prisma.campaign.findUnique({
    where: { id: campaignId },
    select: {
      id: true,
      name: true,
      handle: true,
      gameSystem: true,
      customGameSystemName: true,
      language: true,
      members: {
        select: {
          role: true,
          user: { select: { email: true } },
        },
      },
    },
  });

  if (!campaign) return null;

  const [wikiPages, wikiLinks, tags, assets, mapPins] =
    await Promise.all([
      prisma.wikiPage.findMany({
        where: { campaignId },
        include: { tags: { select: { name: true, label: true } } },
        orderBy: [{ parentId: 'asc' }, { title: 'asc' }],
      }),
      prisma.wikiLink.findMany({
        where: { campaignId },
        include: {
          sourcePage: { select: { id: true, title: true } },
          targetPage: { select: { id: true, title: true } },
        },
      }),
      prisma.tag.findMany({
        where: { campaignId },
        include: { pages: { select: { id: true } } },
      }),
      prisma.asset.findMany({ where: { campaignId } }),
      prisma.mapPin.findMany({
        where: { asset: { campaignId } },
      }),
    ]);

  const pageTitleById = new Map(wikiPages.map((page) => [page.id, page.title]));
  const folderOnlyIds = new Set(
    wikiPages.filter((page) => isFolderOnlyWikiPage(page.blocks)).map((page) => page.id),
  );

  const pathByPageId = buildWikiTreePaths(
    wikiPages.map((page) => ({
      id: page.id,
      title: page.title,
      parentId: page.parentId,
    })),
    folderOnlyIds,
  );

  const mediaEntries: SovereignMediaAssetEntry[] = [];
  const mediaBuffers = new Map<string, Buffer>();
  const assetIdToMediaFile = new Map<string, string>();
  const uploadNameToMediaFile = new Map<string, string>();

  for (const asset of assets) {
    if (SKIP_ASSET_TYPES.has(asset.type)) continue;
    const uploadName = uploadFilenameFromUrl(asset.url);
    if (!uploadName) continue;
    const filePath = path.join(env.uploadsDir, uploadName);
    if (!fs.existsSync(filePath)) continue;

    const filename = mediaFilenameForAsset(asset.id, asset.url);
    mediaEntries.push({
      id: asset.id,
      filename,
      type: asset.type,
      originalUrl: asset.url,
    });
    mediaBuffers.set(filename, fs.readFileSync(filePath));
    assetIdToMediaFile.set(asset.id, filename);
    uploadNameToMediaFile.set(uploadName, filename);
  }

  const assetLookup = {
    resolveMediaFilename: (assetIdOrFilename: string) =>
      assetIdToMediaFile.get(assetIdOrFilename) ??
      uploadNameToMediaFile.get(assetIdOrFilename) ??
      null,
  };

  const pageLookup = {
    resolveTitle: (pageId: string) => pageTitleById.get(pageId) ?? null,
  };

  const files: SovereignExportFile[] = [];

  for (const page of wikiPages) {
    const pathInfo = pathByPageId.get(page.id);
    if (!pathInfo) continue;

    const { markdown, relativePath } = wikiPageToMarkdown(
      {
        id: page.id,
        title: page.title,
        parentId: page.parentId,
        templateType: page.templateType,
        visibility: page.visibility,
        blocks: page.blocks,
        metadata: page.metadata,
        tagNames: page.tags.map((tag) => tag.label || tag.name),
        createdAt: page.createdAt,
        updatedAt: page.updatedAt,
      },
      pathInfo.relativePath,
      page.parentId,
      assetLookup,
      pageLookup,
    );

    files.push({ path: relativePath, content: markdown });
  }

  const relations: SovereignRelations = {
    links: wikiLinks.map((link) => ({
      sourcePageId: link.sourcePageId,
      targetPageId: link.targetPageId,
      sourceTitle: link.sourcePage.title,
      targetTitle: link.targetPage.title,
    })),
    tags: tags.flatMap((tag) =>
      tag.pages.map((page) => ({
        pageId: page.id,
        tagName: tag.name,
        tagLabel: tag.label,
        tagIcon: tag.icon,
        tagColor: tag.color,
      })),
    ),
    tree: wikiPages.map((page) => {
      const pathInfo = pathByPageId.get(page.id);
      return {
        pageId: page.id,
        parentId: page.parentId,
        title: page.title,
        path: pathInfo?.relativePath.replace(/^sovereign\/wiki\//, '') ?? page.title,
        mapAssetId: page.mapAssetId,
      };
    }),
    mapPins: mapPins.map((pin) => ({
      id: pin.id,
      assetId: pin.assetId,
      targetPageId: pin.targetPageId,
      targetAssetId: pin.targetAssetId,
      label: pin.label,
      pinType: pin.pinType,
      x_coordinate: pin.x_coordinate,
      y_coordinate: pin.y_coordinate,
    })),
  };

  files.push({
    path: 'sovereign/relations.json',
    content: JSON.stringify(relations, null, 2),
  });

  const [operational, knowledge] = await Promise.all([
    buildOperationalPayload(campaignId),
    buildKnowledgePayload(campaignId),
  ]);
  files.push({
    path: SOVEREIGN_OPERATIONAL_PATH,
    content: JSON.stringify(operational, null, 2),
  });

  if (
    (knowledge.historicalAliases?.length ?? 0) > 0 ||
    (knowledge.loreClaims?.length ?? 0) > 0
  ) {
    files.push({
      path: SOVEREIGN_KNOWLEDGE_PATH,
      content: JSON.stringify(knowledge, null, 2),
    });
  }

  files.push({
    path: 'sovereign/media/manifest.json',
    content: JSON.stringify({ assets: mediaEntries }, null, 2),
  });

  for (const [filename, buffer] of mediaBuffers) {
    files.push({
      path: `sovereign/media/${filename}`,
      content: buffer,
    });
  }

  const manifest = {
    format: CAMPAIGN_BACKUP_FORMAT,
    exportKind,
    exportedAt: new Date().toISOString(),
    campaign: {
      id: campaign.id,
      name: campaign.name,
      handle: campaign.handle,
      gameSystem: campaign.gameSystem,
      customGameSystemName: campaign.customGameSystemName ?? null,
      language: campaign.language,
      version: 1,
    },
    ...(exportKind === 'full'
      ? {
          exportedMemberEmails: campaign.members.map((member) => member.user.email),
        }
      : {}),
  };

  files.unshift({
    path: 'manifest.json',
    content: JSON.stringify(manifest, null, 2),
  });

  return { manifest, files };
}
