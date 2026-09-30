import { coerceAssetReferenceUrl } from '../../../../shared/assetReferenceValidation.js';
import { normalizeCodexAppearance } from '../codexMetadataShared.js';
import { canViewMapAsset } from '../mapAssetVisibility.js';
import { canViewWikiPage } from '../wikiTree.js';
import type { CampaignMemberRole } from '../../types/domain.js';
import type { GlobalSearchImage } from '../../../../shared/globalSearch.js';

type AssetRow = {
  id: string;
  url: string;
  displayUrl: string | null;
  thumbnailUrl: string | null;
  visibility: string;
};

function assetVariantUrl(assetId: string, variant: 'display' | 'thumb'): string {
  return `/api/assets/${assetId}?variant=${variant}`;
}

function resolveAssetUrls(asset: AssetRow): GlobalSearchImage {
  const url =
    asset.displayUrl?.trim() ||
    asset.url?.trim() ||
    assetVariantUrl(asset.id, 'display');
  const thumbUrl =
    asset.thumbnailUrl?.trim() || assetVariantUrl(asset.id, 'thumb');
  return { url, thumbUrl };
}

function resolveStructuredAssetReference(
  raw: string,
  assetsById: Map<string, AssetRow>,
  role: CampaignMemberRole | null,
): GlobalSearchImage | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  const match = trimmed.match(/\/api\/assets\/([^/?#]+)/);
  if (!match?.[1]) return null;
  const assetId = match[1];
  const asset = assetsById.get(assetId);
  if (asset) {
    if (!canViewMapAsset(asset.visibility, role)) return null;
    return resolveAssetUrls(asset);
  }
  // Asset row missing — still emit reference URLs (delivery layer enforces ACL).
  return {
    url: assetVariantUrl(assetId, 'display'),
    thumbUrl: assetVariantUrl(assetId, 'thumb'),
  };
}

function resolveFeaturedImage(
  featuredImageId: string | null | undefined,
  assetsById: Map<string, AssetRow>,
  role: CampaignMemberRole | null,
): GlobalSearchImage | null {
  if (!featuredImageId) return null;
  const asset = assetsById.get(featuredImageId);
  if (asset) {
    if (!canViewMapAsset(asset.visibility, role)) return null;
    return resolveAssetUrls(asset);
  }
  return {
    url: assetVariantUrl(featuredImageId, 'display'),
    thumbUrl: assetVariantUrl(featuredImageId, 'thumb'),
  };
}

function readPortraitUrl(metadata: unknown): string | null {
  if (!metadata || typeof metadata !== 'object' || Array.isArray(metadata)) {
    return null;
  }
  const appearance = (metadata as Record<string, unknown>).appearance;
  return normalizeCodexAppearance(appearance).portraitUrl;
}

function readEmblemAssetId(metadata: unknown): string | null {
  if (!metadata || typeof metadata !== 'object' || Array.isArray(metadata)) {
    return null;
  }
  const raw = (metadata as Record<string, unknown>).emblemAssetId;
  return typeof raw === 'string' && raw.trim() ? raw.trim() : null;
}

function firstVisibleImageDisplay(
  blocks: unknown,
  role: CampaignMemberRole | null,
  assetsById: Map<string, AssetRow>,
): GlobalSearchImage | null {
  if (!Array.isArray(blocks)) return null;
  for (const raw of blocks) {
    if (!raw || typeof raw !== 'object') continue;
    const block = raw as Record<string, unknown>;
    if (block.type !== 'image-display') continue;
    const visibility =
      typeof block.visibility === 'string' && block.visibility.trim()
        ? block.visibility
        : block.isPrivate === true
          ? 'DM_Only'
          : 'Party';
    if (!canViewWikiPage(visibility, role)) continue;
    const content = block.content;
    if (!content || typeof content !== 'object') continue;
    const imageUrl = coerceAssetReferenceUrl(
      (content as { imageUrl?: unknown }).imageUrl,
    );
    if (!imageUrl) continue;
    return (
      resolveStructuredAssetReference(imageUrl, assetsById, role) ?? {
        url: imageUrl,
      }
    );
  }
  return null;
}

/**
 * Resolve a meaningful search result image for a wiki page.
 * Priority: portrait → org emblem → featured image → visible image-display → map asset.
 */
export function resolveSearchResultImage(input: {
  metadata: unknown;
  blocks: unknown;
  featuredImageId: string | null;
  mapAssetId: string | null;
  assetsById: Map<string, AssetRow>;
  role: CampaignMemberRole | null;
}): GlobalSearchImage | undefined {
  const portrait = readPortraitUrl(input.metadata);
  if (portrait) {
    const resolved = resolveStructuredAssetReference(
      portrait,
      input.assetsById,
      input.role,
    );
    if (resolved) return resolved;
    const coerced = coerceAssetReferenceUrl(portrait);
    if (coerced) return { url: coerced };
  }

  const emblemId = readEmblemAssetId(input.metadata);
  if (emblemId) {
    const featured = resolveFeaturedImage(emblemId, input.assetsById, input.role);
    if (featured) return featured;
  }

  const featured = resolveFeaturedImage(
    input.featuredImageId,
    input.assetsById,
    input.role,
  );
  if (featured) return featured;

  const fromBlock = firstVisibleImageDisplay(
    input.blocks,
    input.role,
    input.assetsById,
  );
  if (fromBlock) return fromBlock;

  if (input.mapAssetId) {
    const map = resolveFeaturedImage(
      input.mapAssetId,
      input.assetsById,
      input.role,
    );
    if (map) return map;
  }

  return undefined;
}
