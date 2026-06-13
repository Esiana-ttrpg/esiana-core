import fs from 'node:fs/promises';
import fsSync from 'node:fs';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import type { Response } from 'express';
import { prisma } from '../lib/prisma.js';
import { env } from '../config/env.js';
import {
  applySidebarSectionIcon,
  normalizeSidebarConfig,
  parseSidebarConfigPayload,
} from '../lib/sidebarConfig.js';
import { enrichSidebarConfigWithIconUrls, releaseSidebarIconAsset } from '../lib/sidebarIconEnrich.js';
import { isSidebarSectionId } from '../lib/sidebarIconDefaults.js';
import { AssetTypes } from '../types/domain.js';
import {
  assertTagIconUploadMeta,
  sanitizeTagIconSvg,
} from '../lib/tagIconSvg.js';
import { UploadValidationError } from '../lib/uploadValidation.js';
import type { CampaignScopedRequest } from '../middleware/campaignScope.js';
import { buildCampaignSizeSnapshot } from '../lib/buildCampaignSizeSnapshot.js';
import {
  classifyCampaignTier,
  recommendedDeploymentForTier,
  tierLabel,
} from '../../../shared/campaignCapacityTiers.js';

export async function getCampaignStatus(
  req: CampaignScopedRequest,
  res: Response,
): Promise<void> {
  const campaignId = req.campaign!.campaignId;
  const campaign = await prisma.campaign.findUnique({
    where: { id: campaignId },
    select: {
      discoverability: true,
      language: true,
      gameSystem: true,
      customGameSystemName: true,
    },
  });

  if (!campaign) {
    res.status(404).json({ error: 'Campaign not found' });
    return;
  }

  const snapshot = await buildCampaignSizeSnapshot(campaignId);

  const wordCount = await prisma.wikiPage
    .findMany({
      where: { campaignId },
      select: { blocks: true },
    })
    .then((pages) =>
      pages.reduce((sum, page) => {
        const blocks = Array.isArray(page.blocks) ? page.blocks : [];
        const text = blocks
          .filter((block: unknown) => {
            return (
              typeof block === 'object' &&
              block !== null &&
              (block as Record<string, unknown>).type === 'text-tiptap'
            );
          })
          .map((block: unknown) => {
            const content = (block as { content?: { markdown?: string } }).content;
            return content?.markdown ?? '';
          })
          .join(' ');
        return sum + text.split(/\s+/).filter(Boolean).length;
      }, 0),
    );

  const pluginCount = await prisma.installedPlugin.count({
    where: { isEnabled: true },
  });

  res.json({
    wordCount,
    pageCount: snapshot.pageCount,
    mapCount: snapshot.mapCount,
    assetCount: snapshot.assetCount,
    assetStorageBytes: snapshot.assetStorageBytes,
    storageUsed: Math.ceil(snapshot.assetStorageBytes / 1024),
    pluginCount,
    discoverability: campaign.discoverability,
    language: campaign.language,
    gameSystem: campaign.gameSystem ?? null,
    customGameSystemName: campaign.customGameSystemName ?? null,
  });
}

export async function getCampaignCapacityHint(
  req: CampaignScopedRequest,
  res: Response,
): Promise<void> {
  const campaignId = req.campaign!.campaignId;
  const campaign = await prisma.campaign.findUnique({
    where: { id: campaignId },
    select: { id: true },
  });

  if (!campaign) {
    res.status(404).json({ error: 'Campaign not found' });
    return;
  }

  const snapshot = await buildCampaignSizeSnapshot(campaignId);
  const classification = classifyCampaignTier(snapshot);
  const recommendedDeployment = recommendedDeploymentForTier(classification.tier);

  res.json({
    snapshot,
    tier: classification.tier,
    tierLabel: tierLabel(classification.tier),
    headroom: classification.headroom,
    nextTier: classification.nextTier,
    recommendedDeployment,
    sizingDocPath: '/docs/self-hosting/capacity-and-sizing.md',
  });
}

export async function getCampaignFiles(
  req: CampaignScopedRequest,
  res: Response,
): Promise<void> {
  const campaignId = req.campaign!.campaignId;

  const assets = await prisma.asset.findMany({
    where: { campaignId },
  });

  const files = assets
    .map((asset) => {
      const filename = path.basename(asset.url);
      const filePath = path.join(env.uploadsDir, filename);
      const sizeBytes = fsSync.existsSync(filePath)
        ? fsSync.statSync(filePath).size
        : 0;
      return {
        name: filename,
        url: asset.url,
        sizeKB: Math.ceil(sizeBytes / 1024),
        sizeBytes,
      };
    })
    .sort((a, b) => b.sizeBytes - a.sizeBytes)
    .slice(0, 5);

  res.json({ files });
}

export async function updateCampaignSidebar(
  req: CampaignScopedRequest,
  res: Response,
): Promise<void> {
  const parsed = parseSidebarConfigPayload(req.body);
  if (!parsed) {
    res.status(400).json({
      error:
        'Invalid sidebar payload. Expected { headers, worldLoreOrder, playOrder, toolsOrder }.',
    });
    return;
  }

  const campaignId = req.campaign!.campaignId;
  const sidebarConfig = normalizeSidebarConfig(parsed);

  const updated = await prisma.campaign.update({
    where: { id: campaignId },
    data: { sidebarConfig: sidebarConfig as never },
    select: {
      id: true,
      handle: true,
      sidebarConfig: true,
    },
  });

  const normalized = normalizeSidebarConfig(updated.sidebarConfig);
  const enriched = await enrichSidebarConfigWithIconUrls(normalized);

  res.json({
    sidebarConfig: enriched,
  });
}

export async function uploadCampaignSidebarSectionIcon(
  req: CampaignScopedRequest,
  res: Response,
): Promise<void> {
  const campaignId = req.campaign!.campaignId;
  const sectionId = String(req.params.sectionId ?? '').trim();

  if (!isSidebarSectionId(sectionId)) {
    res.status(400).json({ error: 'Invalid sidebar section id' });
    return;
  }

  const file = req.file;
  if (!file?.buffer) {
    res.status(400).json({ error: 'SVG file is required' });
    return;
  }

  const campaign = await prisma.campaign.findUnique({
    where: { id: campaignId },
    select: { sidebarConfig: true },
  });
  if (!campaign) {
    res.status(404).json({ error: 'Campaign not found' });
    return;
  }

  let config = normalizeSidebarConfig(campaign.sidebarConfig);
  const previousIcon =
    config.worldLoreOrder.find((row) => row.id === sectionId)?.icon ??
    config.playOrder.find((row) => row.id === sectionId)?.icon ??
    config.toolsOrder.find((row) => row.id === sectionId)?.icon ??
    config.fixedSectionIcons?.[sectionId] ??
    null;

  try {
    assertTagIconUploadMeta(file.mimetype, file.originalname, file.size);
    const sanitized = sanitizeTagIconSvg(file.buffer);
    const { ingestSvgBuffer } = await import('../lib/assetIngest.js');
    const ingested = await ingestSvgBuffer({
      campaignId,
      buffer: sanitized,
      type: AssetTypes.SIDEBAR_ICON,
      uploadedByUserId: req.user?.id ?? null,
    });
    const asset = ingested.asset;

    const nextIcon = `asset:${asset.id}`;
    config = applySidebarSectionIcon(config, sectionId, nextIcon);

    const updated = await prisma.campaign.update({
      where: { id: campaignId },
      data: { sidebarConfig: config as never },
      select: { sidebarConfig: true },
    });

    if (
      previousIcon &&
      previousIcon !== nextIcon &&
      previousIcon.startsWith('asset:')
    ) {
      await releaseSidebarIconAsset(
        campaignId,
        config,
        previousIcon,
        sectionId,
      );
    }

    const normalized = normalizeSidebarConfig(updated.sidebarConfig);
    const enriched = await enrichSidebarConfigWithIconUrls(normalized);

    res.status(201).json({ sidebarConfig: enriched, asset });
  } catch (err) {
    if (err instanceof UploadValidationError) {
      res.status(400).json({ error: err.message });
      return;
    }
    console.error('[campaign] Sidebar icon upload failed', err);
    res.status(500).json({ error: 'Failed to upload sidebar icon' });
  }
}
