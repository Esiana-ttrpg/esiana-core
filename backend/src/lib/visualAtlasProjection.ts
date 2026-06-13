import {
  coerceAssetReferenceUrl,
} from '../../../shared/assetReferenceValidation.js';
import {
  normalizeImageCredit,
  type ImageCredit,
} from '../../../shared/imageCredit.js';
import { prisma } from './prisma.js';
import { normalizeCodexAppearance } from './codexMetadataShared.js';
import { normalizeDashboardConfig } from './dashboardConfig.js';
import { normalizeEnsembleConfig } from './ensembleConfig.js';
import { readEntityCategoryFromMetadata } from './wikiCategoryEntityIndex.js';
import { canViewWikiPage } from './wikiTree.js';
import { canViewMapAsset } from './mapAssetVisibility.js';
import { AssetTypes, type CampaignMemberRole } from '../types/domain.js';

export type VisualAtlasFilter =
  | 'characters'
  | 'locations'
  | 'bestiary'
  | 'organizations'
  | 'resources';

export type VisualAtlasSourceKind =
  | 'portrait'
  | 'banner'
  | 'artwork'
  | 'map'
  | 'handout';

export interface VisualAtlasItem {
  id: string;
  imageUrl: string;
  thumbUrl?: string;
  caption?: string;
  imageCredit?: ImageCredit;
  sourceKind: VisualAtlasSourceKind;
  filter: VisualAtlasFilter | null;
  pageId: string;
  pageTitle: string;
  assetId?: string;
}

export interface VisualAtlasCampaignBanner {
  id: string;
  imageUrl: string;
  label: string;
  linkTarget: 'dashboard' | 'party';
}

export interface VisualAtlasPayload {
  campaignBanners: VisualAtlasCampaignBanner[];
  items: VisualAtlasItem[];
}

const SOURCE_PRIORITY: Record<VisualAtlasSourceKind, number> = {
  portrait: 0,
  banner: 1,
  artwork: 2,
  map: 3,
  handout: 4,
};

type WikiPageRow = {
  id: string;
  title: string;
  visibility: string;
  metadata: unknown;
  blocks: unknown;
  featuredImageId: string | null;
  mapAssetId: string | null;
  templateType: string;
};

type MapAssetRow = {
  id: string;
  url: string;
  displayUrl: string | null;
  thumbnailUrl: string | null;
  visibility: string;
  imageCredit?: unknown;
};

function normalizeImageUrl(raw: string): string {
  return raw.trim().replace(/\/+$/, '');
}

function assetVariantUrl(assetId: string, variant: 'display' | 'thumb'): string {
  return `/api/assets/${assetId}?variant=${variant}`;
}

function resolveAssetUrls(asset: MapAssetRow): { imageUrl: string; thumbUrl?: string } {
  const imageUrl =
    asset.displayUrl?.trim() ||
    asset.url?.trim() ||
    assetVariantUrl(asset.id, 'display');
  const thumbUrl =
    asset.thumbnailUrl?.trim() ||
    assetVariantUrl(asset.id, 'thumb');
  return { imageUrl, thumbUrl };
}

function resolveFeaturedImageUrls(
  featuredImageId: string,
  assetsById: Map<string, MapAssetRow>,
): { imageUrl: string; thumbUrl?: string } | null {
  const asset = assetsById.get(featuredImageId);
  if (asset) return resolveAssetUrls(asset);
  return {
    imageUrl: assetVariantUrl(featuredImageId, 'display'),
    thumbUrl: assetVariantUrl(featuredImageId, 'thumb'),
  };
}

function resolveStructuredAssetReference(
  raw: string,
  assetsById: Map<string, MapAssetRow>,
): { imageUrl: string; thumbUrl?: string; assetId?: string } | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;

  const assetPathMatch = trimmed.match(/\/api\/assets\/([^/?#]+)/);
  if (!assetPathMatch?.[1]) {
    return null;
  }

  const assetId = assetPathMatch[1];
  const asset = assetsById.get(assetId);
  if (asset) {
    const urls = resolveAssetUrls(asset);
    return { ...urls, assetId };
  }
  return {
    imageUrl: assetVariantUrl(assetId, 'display'),
    thumbUrl: assetVariantUrl(assetId, 'thumb'),
    assetId,
  };
}

function resolveBlockVisibility(block: Record<string, unknown>): string {
  const visibility = block.visibility;
  if (typeof visibility === 'string' && visibility.trim()) {
    return visibility;
  }
  return block.isPrivate === true ? 'DM_Only' : 'Party';
}

function canViewBlock(block: Record<string, unknown>, role: CampaignMemberRole | null): boolean {
  return canViewWikiPage(resolveBlockVisibility(block), role);
}

export function classifyVisualAtlasFilter(page: {
  templateType: string;
  metadata: unknown;
}): VisualAtlasFilter | null {
  const entityCategory = readEntityCategoryFromMetadata(page.metadata);

  if (page.templateType === 'CHARACTER' || entityCategory === 'characters') {
    return 'characters';
  }
  if (page.templateType === 'LOCATION' || entityCategory === 'locations') {
    return 'locations';
  }
  if (entityCategory === 'bestiary') {
    return 'bestiary';
  }
  if (page.templateType === 'ORGANIZATION' || entityCategory === 'organizations') {
    return 'organizations';
  }
  if (entityCategory === 'rules-resources') {
    return 'resources';
  }

  return null;
}

function readPortraitUrl(metadata: unknown): string | null {
  if (!metadata || typeof metadata !== 'object' || Array.isArray(metadata)) {
    return null;
  }
  const appearance = (metadata as Record<string, unknown>).appearance;
  return normalizeCodexAppearance(appearance).portraitUrl;
}

export function readPortraitCredit(metadata: unknown): ImageCredit | null {
  if (!metadata || typeof metadata !== 'object' || Array.isArray(metadata)) {
    return null;
  }
  const appearance = (metadata as Record<string, unknown>).appearance;
  return normalizeCodexAppearance(appearance).portraitCredit;
}

export function collectImageDisplayBlocks(
  blocks: unknown,
  role: CampaignMemberRole | null,
): Array<{ imageUrl: string; caption?: string; imageCredit?: ImageCredit }> {
  if (!Array.isArray(blocks)) return [];
  const results: Array<{ imageUrl: string; caption?: string; imageCredit?: ImageCredit }> = [];

  for (const raw of blocks) {
    if (!raw || typeof raw !== 'object') continue;
    const block = raw as Record<string, unknown>;
    if (block.type !== 'image-display') continue;
    if (!canViewBlock(block, role)) continue;

    const content = block.content;
    if (!content || typeof content !== 'object') continue;
    const imageUrl = coerceAssetReferenceUrl(
      (content as { imageUrl?: unknown }).imageUrl,
    );
    if (!imageUrl) continue;

    const captionRaw = (content as { caption?: unknown }).caption;
    const caption =
      typeof captionRaw === 'string' && captionRaw.trim() ? captionRaw.trim() : undefined;
    const imageCredit = normalizeImageCredit(
      (content as { imageCredit?: unknown }).imageCredit,
    );

    results.push({
      imageUrl,
      caption,
      ...(imageCredit ? { imageCredit } : {}),
    });
  }

  return results;
}

function buildDedupeKey(pageId: string, imageUrl: string): string {
  return `${pageId}::${normalizeImageUrl(imageUrl)}`;
}

function upsertItem(
  map: Map<string, VisualAtlasItem>,
  candidate: VisualAtlasItem,
): void {
  const key = buildDedupeKey(candidate.pageId, candidate.imageUrl);
  const existing = map.get(key);
  if (!existing) {
    map.set(key, candidate);
    return;
  }
  if (SOURCE_PRIORITY[candidate.sourceKind] < SOURCE_PRIORITY[existing.sourceKind]) {
    map.set(key, {
      ...candidate,
      caption: candidate.caption ?? existing.caption,
      imageCredit: candidate.imageCredit ?? existing.imageCredit,
      thumbUrl: candidate.thumbUrl ?? existing.thumbUrl,
      assetId: candidate.assetId ?? existing.assetId,
    });
  }
}

function sortItems(items: VisualAtlasItem[]): VisualAtlasItem[] {
  return [...items].sort((a, b) => {
    const titleCmp = a.pageTitle.localeCompare(b.pageTitle, undefined, { sensitivity: 'base' });
    if (titleCmp !== 0) return titleCmp;
    return SOURCE_PRIORITY[a.sourceKind] - SOURCE_PRIORITY[b.sourceKind];
  });
}

export async function buildVisualAtlasProjection(
  campaignId: string,
  role: CampaignMemberRole | null,
): Promise<VisualAtlasPayload> {
  const [campaign, pages, assets] = await Promise.all([
    prisma.campaign.findUnique({
      where: { id: campaignId },
      select: { dashboardConfig: true, ensembleConfig: true },
    }),
    prisma.wikiPage.findMany({
      where: { campaignId },
      select: {
        id: true,
        title: true,
        visibility: true,
        metadata: true,
        blocks: true,
        featuredImageId: true,
        mapAssetId: true,
        templateType: true,
      },
    }),
    prisma.asset.findMany({
      where: { campaignId },
      select: {
        id: true,
        url: true,
        displayUrl: true,
        thumbnailUrl: true,
        type: true,
        visibility: true,
        imageCredit: true,
      },
    }),
  ]);

  const campaignBanners: VisualAtlasCampaignBanner[] = [];

  if (campaign) {
    const dashboard = normalizeDashboardConfig(campaign.dashboardConfig);
    const ensemble = normalizeEnsembleConfig(campaign.ensembleConfig);

    if (dashboard.hero.coverImageUrl) {
      campaignBanners.push({
        id: 'campaign-dashboard-banner',
        imageUrl: dashboard.hero.coverImageUrl,
        label: 'Dashboard',
        linkTarget: 'dashboard',
      });
    }
    if (ensemble.bannerImageUrl) {
      campaignBanners.push({
        id: 'campaign-party-banner',
        imageUrl: ensemble.bannerImageUrl,
        label: 'Party',
        linkTarget: 'party',
      });
    }
  }

  const assetsById = new Map<string, MapAssetRow>(
    assets.map((asset) => [asset.id, asset]),
  );

  const itemMap = new Map<string, VisualAtlasItem>();

  for (const page of pages as WikiPageRow[]) {
    if (!canViewWikiPage(page.visibility, role)) continue;

    const filter = classifyVisualAtlasFilter(page);
    const portraitUrl = readPortraitUrl(page.metadata);
    const portraitCredit = readPortraitCredit(page.metadata);

    if (portraitUrl) {
      const resolved = resolveStructuredAssetReference(portraitUrl, assetsById);
      if (resolved) {
        upsertItem(itemMap, {
          id: `${page.id}:portrait`,
          imageUrl: resolved.imageUrl,
          thumbUrl: resolved.thumbUrl,
          ...(portraitCredit ? { imageCredit: portraitCredit } : {}),
          sourceKind: 'portrait',
          filter,
          pageId: page.id,
          pageTitle: page.title,
          assetId: resolved.assetId,
        });
      }
    }

    if (page.featuredImageId) {
      const resolved = resolveFeaturedImageUrls(page.featuredImageId, assetsById);
      if (resolved) {
        upsertItem(itemMap, {
          id: `${page.id}:banner`,
          imageUrl: resolved.imageUrl,
          thumbUrl: resolved.thumbUrl,
          sourceKind: 'banner',
          filter,
          pageId: page.id,
          pageTitle: page.title,
          assetId: page.featuredImageId,
        });
      }
    }

    const imageBlocks = collectImageDisplayBlocks(page.blocks, role);
    let handoutCoverUsed = false;

    for (const block of imageBlocks) {
      const resolved = resolveStructuredAssetReference(block.imageUrl, assetsById);
      if (!resolved) continue;

      let sourceKind: VisualAtlasSourceKind = 'artwork';
      if (filter === 'resources' && !handoutCoverUsed) {
        sourceKind = 'handout';
        handoutCoverUsed = true;
      }

      upsertItem(itemMap, {
        id: `${page.id}:${sourceKind}:${normalizeImageUrl(resolved.imageUrl)}`,
        imageUrl: resolved.imageUrl,
        thumbUrl: resolved.thumbUrl,
        caption: block.caption,
        ...(block.imageCredit ? { imageCredit: block.imageCredit } : {}),
        sourceKind,
        filter,
        pageId: page.id,
        pageTitle: page.title,
        assetId: resolved.assetId,
      });
    }

    if (page.mapAssetId) {
      const mapAsset = assetsById.get(page.mapAssetId);
      if (mapAsset && canViewMapAsset(mapAsset.visibility, role)) {
        const urls = resolveAssetUrls(mapAsset);
        const mapCredit = normalizeImageCredit(mapAsset.imageCredit);
        upsertItem(itemMap, {
          id: `${page.id}:map:${page.mapAssetId}`,
          imageUrl: urls.imageUrl,
          thumbUrl: urls.thumbUrl,
          ...(mapCredit ? { imageCredit: mapCredit } : {}),
          sourceKind: 'map',
          filter: filter === 'locations' ? 'locations' : filter,
          pageId: page.id,
          pageTitle: page.title,
          assetId: page.mapAssetId,
        });
      }
    }
  }

  for (const asset of assets) {
    if (asset.type !== AssetTypes.MAP) continue;
    if (!canViewMapAsset(asset.visibility, role)) continue;

    const linkedPage = (pages as WikiPageRow[]).find(
      (page) =>
        page.mapAssetId === asset.id && canViewWikiPage(page.visibility, role),
    );
    if (!linkedPage) continue;

    const filter = classifyVisualAtlasFilter(linkedPage);
    const urls = resolveAssetUrls(asset);
    const mapCredit = normalizeImageCredit(asset.imageCredit);
    upsertItem(itemMap, {
      id: `${linkedPage.id}:map:${asset.id}`,
      imageUrl: urls.imageUrl,
      thumbUrl: urls.thumbUrl,
      ...(mapCredit ? { imageCredit: mapCredit } : {}),
      sourceKind: 'map',
      filter: filter === 'locations' ? 'locations' : filter,
      pageId: linkedPage.id,
      pageTitle: linkedPage.title,
      assetId: asset.id,
    });
  }

  return {
    campaignBanners,
    items: sortItems([...itemMap.values()]),
  };
}
