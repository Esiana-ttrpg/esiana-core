import type { Prisma } from '@prisma/client';
import { prisma } from './prisma.js';
import { DOWNTIME_HAVEN_TEMPLATE_TYPE, parseDowntimeHavenFields } from './havenMetadata.js';
import { DOWNTIME_PROJECT_TEMPLATE_TYPE, parseDowntimeProjectFields } from './projectMetadata.js';
import { fieldsToPrismaCreate as havenFieldsToPrisma } from './downtimeHavenFields.js';
import { fieldsToPrismaUpdate as projectFieldsToPrisma } from './downtimeProjectFields.js';
import {
  isPackAssetRef,
  resolveAppearanceAssetRefs,
  resolvePackAssetRef,
  resolvePageMetadataSlugRefs,
} from './pageMetadataRoundTrip.js';
import { reconcileCharacterIndexFromMetadata } from './characterMetadata.js';
import type { PackCampaignConfigV1 } from './packCampaignConfig.js';
import { normalizeDashboardConfig } from './dashboardConfig.js';

export async function buildPackSlugToPageIdMap(
  campaignId: string,
): Promise<Map<string, string>> {
  const pages = await prisma.wikiPage.findMany({
    where: { campaignId, deletedAt: null },
    select: { id: true, metadata: true },
  });
  const map = new Map<string, string>();
  for (const page of pages) {
    const meta = page.metadata as Record<string, unknown> | null;
    const packSlug =
      meta && typeof meta.packSlug === 'string' ? meta.packSlug.trim() : '';
    if (packSlug) map.set(packSlug, page.id);
  }
  return map;
}

async function resolvePackCampaignArcTitle(campaignId: string): Promise<string | null> {
  const arcPages = await prisma.wikiPage.findMany({
    where: { campaignId, deletedAt: null, templateType: 'ARC' },
    select: { title: true, metadata: true },
    orderBy: { createdAt: 'asc' },
    take: 12,
  });
  for (const page of arcPages) {
    const meta = page.metadata as Record<string, unknown> | null;
    const arcKind =
      meta && typeof meta.arcKind === 'string' ? meta.arcKind.trim() : '';
    if (arcKind === 'campaign_arc' || arcPages.length === 1) {
      return page.title.trim() || null;
    }
  }
  return arcPages[0]?.title?.trim() ?? null;
}

export async function applyPackCampaignConfig(
  campaignId: string,
  config: PackCampaignConfigV1,
  options?: { slugToPageId?: Map<string, string>; assetPathToId?: Map<string, string> },
): Promise<void> {
  const data: Prisma.CampaignUpdateInput = {};
  if (config.recruitmentTagline) {
    data.recruitmentTagline = config.recruitmentTagline;
  }
  if (config.description) {
    data.description = config.description;
  }

  const heroSummary =
    config.campaignHomeIntro?.trim() || config.description?.trim() || null;

  const campaign = await prisma.campaign.findUnique({
    where: { id: campaignId },
    select: { dashboardConfig: true },
  });
  const dashboardConfig = normalizeDashboardConfig(campaign?.dashboardConfig);
  const hero = { ...dashboardConfig.hero };
  let dashboardTouched = false;
  if (heroSummary && hero.summary !== heroSummary) {
    hero.summary = heroSummary;
    dashboardTouched = true;
  }
  if (!hero.currentArc?.trim()) {
    const arcTitle = await resolvePackCampaignArcTitle(campaignId);
    if (arcTitle) {
      hero.currentArc = arcTitle;
      dashboardTouched = true;
    }
  }
  const nextConfig = { ...dashboardConfig, hero };
  const startingSlug = config.startingLocationPageSlug?.trim();
  if (startingSlug && options?.slugToPageId) {
    const pageId = options.slugToPageId.get(startingSlug);
    if (pageId) {
      nextConfig.importManifest = {
        ...nextConfig.importManifest,
        startingLocationPageId: pageId,
      };
      dashboardTouched = true;
    }
  }
  const coverImagePath = config.coverImagePath?.trim();
  if (coverImagePath && options?.assetPathToId) {
    const existingCover =
      nextConfig.importManifest?.assets?.coverImageAssetId?.trim() ||
      hero.coverImageUrl?.trim();
    if (!existingCover) {
      const normalized = coverImagePath.replace(/^assets\//, '');
      const coverAssetId =
        options.assetPathToId.get(normalized) ??
        options.assetPathToId.get(coverImagePath) ??
        resolvePackAssetRef(
          coverImagePath.startsWith('asset:') ? coverImagePath : `asset:${normalized}`,
          options.assetPathToId,
        );
      if (coverAssetId) {
        nextConfig.importManifest = {
          ...nextConfig.importManifest,
          assets: {
            ...nextConfig.importManifest?.assets,
            coverImageAssetId: coverAssetId,
          },
        };
        dashboardTouched = true;
      }
    }
  }
  if (dashboardTouched) {
    data.dashboardConfig = nextConfig as unknown as Prisma.InputJsonValue;
  }

  if (Object.keys(data).length === 0) return;
  await prisma.campaign.update({ where: { id: campaignId }, data });
}

export async function bootstrapPackSatelliteRows(options: {
  campaignId: string;
  campaignHandle: string;
  actorUserId: string;
  slugToPageId: Map<string, string>;
  assetPathToId: Map<string, string>;
}): Promise<{ havenCount: number; projectCount: number; mapBindCount: number }> {
  const { campaignId, campaignHandle, actorUserId, slugToPageId, assetPathToId } =
    options;

  let havenCount = 0;
  let projectCount = 0;
  let mapBindCount = 0;

  const pages = await prisma.wikiPage.findMany({
    where: { campaignId, deletedAt: null },
    select: {
      id: true,
      title: true,
      templateType: true,
      visibility: true,
      metadata: true,
      mapAssetId: true,
    },
  });

  for (const page of pages) {
    let metadata =
      page.metadata && typeof page.metadata === 'object'
        ? { ...(page.metadata as Record<string, unknown>) }
        : {};

    metadata = resolvePageMetadataSlugRefs(metadata, slugToPageId);
    if (metadata.appearance) {
      metadata.appearance = resolveAppearanceAssetRefs(
        metadata.appearance,
        assetPathToId,
      );
    }

    const mapAssetPath =
      typeof metadata.mapAssetPath === 'string' ? metadata.mapAssetPath : null;
    const mapAssetFrontmatter =
      typeof metadata.mapAssetId === 'string' && isPackAssetRef(metadata.mapAssetId)
        ? metadata.mapAssetId
        : mapAssetPath && isPackAssetRef(mapAssetPath)
          ? mapAssetPath
          : null;

    let mapAssetId: string | null = page.mapAssetId;
    if (mapAssetFrontmatter) {
      const resolved = resolvePackAssetRef(mapAssetFrontmatter, assetPathToId);
      if (resolved) {
        mapAssetId = resolved;
        mapBindCount += 1;
      }
    }

    delete metadata.mapAssetPath;
    if (typeof metadata.mapAssetId === 'string' && isPackAssetRef(metadata.mapAssetId)) {
      delete metadata.mapAssetId;
    }

    const needsMetadataUpdate =
      JSON.stringify(metadata) !== JSON.stringify(page.metadata) ||
      mapAssetId !== page.mapAssetId;

    if (needsMetadataUpdate) {
      await prisma.wikiPage.update({
        where: { id: page.id },
        data: {
          metadata: metadata as Prisma.InputJsonValue,
          ...(mapAssetId ? { mapAssetId } : {}),
        },
      });
      if (page.templateType === 'CHARACTER') {
        reconcileCharacterIndexFromMetadata(metadata);
      }
    }
  }

  for (const page of pages) {
    const meta = page.metadata as Record<string, unknown> | null;
    if (!meta) continue;

    if (page.templateType === DOWNTIME_HAVEN_TEMPLATE_TYPE) {
      const existing = await prisma.downtimeHaven.findFirst({
        where: { campaignId, wikiPageId: page.id },
      });
      if (existing) continue;

      const rawFields = meta.havenFields ?? meta;
      const fields = parseDowntimeHavenFields(
        typeof rawFields === 'string' ? JSON.parse(rawFields) : rawFields,
      );
      const resolved = resolvePageMetadataSlugRefs(
        fields as unknown as Record<string, unknown>,
        slugToPageId,
      );
      const parsed = parseDowntimeHavenFields(resolved);

      await prisma.downtimeHaven.create({
        data: havenFieldsToPrisma(
          parsed,
          campaignId,
          page.id,
          actorUserId,
        ),
      });
      havenCount += 1;
    }

    if (page.templateType === DOWNTIME_PROJECT_TEMPLATE_TYPE) {
      const existing = await prisma.downtimeProject.findFirst({
        where: { campaignId, wikiPageId: page.id },
      });
      if (existing) continue;

      const rawFields = meta.projectFields ?? meta;
      const fields = parseDowntimeProjectFields(
        typeof rawFields === 'string' ? JSON.parse(rawFields) : rawFields,
      );
      const resolved = resolvePageMetadataSlugRefs(
        fields as unknown as Record<string, unknown>,
        slugToPageId,
      );
      const parsed = parseDowntimeProjectFields(resolved);

      const projectData = projectFieldsToPrisma(parsed, actorUserId);
      await prisma.downtimeProject.create({
        data: {
          campaignId,
          wikiPageId: page.id,
          ...projectData,
        } as Prisma.DowntimeProjectUncheckedCreateInput,
      });
      projectCount += 1;
    }
  }

  void campaignHandle;

  return { havenCount, projectCount, mapBindCount };
}
