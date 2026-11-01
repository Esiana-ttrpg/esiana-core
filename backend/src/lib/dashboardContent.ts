import { prisma } from './prisma.js';
import type { CampaignContext } from '../types/api.js';
import { CampaignCapabilities as C } from '../../../shared/campaignPolicy/capabilities.js';
import { buildPageDiscoveryProjectionMap } from './discoveryProjectionService.js';
import { getContentPresenceStateBySubEntityMap } from './contentPresenceService.js';
import { ContentPresenceEntityType as E, ContentRevelationStates } from '../../../shared/contentPresence.js';
import { buildRevelationViewerContext, isPresenceVisibleToContext } from '../../../shared/narrativeProjection.js';
import { extractWikiPageExcerpt } from './wikiExcerpt.js';
import { buildWikiPageHref } from './wikiLinkService.js';
import { resolveWikiCodexType } from './resolveWikiCodexType.js';
import { parseAssetReferenceId } from '../../../shared/assetReferenceValidation.js';
import type { DashboardPreview } from '../../../shared/dashboardCampaignFeatures.js';

export function dashboardVisibility(ctx: CampaignContext, upperCase = false): string[] {
  if (ctx.capabilities.has(C.NARRATIVE_ELEVATED_VIEW)) return upperCase ? ['PUBLIC', 'PARTY', 'DM_ONLY'] : ['Public', 'Party', 'DM_Only'];
  return ctx.capabilities.has(C.WIKI_VIEW_PARTY) ? (upperCase ? ['PUBLIC', 'PARTY'] : ['Public', 'Party']) : [upperCase ? 'PUBLIC' : 'Public'];
}
export async function dashboardVisiblePages(ctx: CampaignContext, ids?: string[]) {
  const rows = await prisma.wikiPage.findMany({ where: { campaignId: ctx.campaignId, deletedAt: null,
    visibility: { in: dashboardVisibility(ctx) }, ...(ids ? { id: { in: ids } } : {}) },
    select: { id: true, title: true, templateType: true, metadata: true, workspace: true, pathKey: true, mapAssetId: true, featuredImageId: true, createdAt: true },
  });
  if (ctx.capabilities.has(C.NARRATIVE_ELEVATED_VIEW)) return rows;
  const discovery = await buildPageDiscoveryProjectionMap(ctx.campaignId, rows.map(row => row.id), { role: null });
  return rows.filter(row => discovery.get(row.id)?.available === true);
}
async function safeThumbnail(ctx: CampaignContext, id: string | null): Promise<string | null> {
  if (!id || !ctx.isMember || !ctx.capabilities.has(C.ASSETS_VIEW)) return null;
  const asset = await prisma.asset.findFirst({ where: { id, campaignId: ctx.campaignId, visibility: { in: dashboardVisibility(ctx) },
    type: { in: ['map', 'scene', 'generic', 'campaign-cover'] }, OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }] }, select: { id: true, thumbnailUrl: true } });
  // The existing asset endpoint falls back to full-size files without a thumb.
  // Only request it when an existing thumbnail is recorded.
  return asset?.thumbnailUrl ? `/api/assets/${encodeURIComponent(asset.id)}?variant=thumb` : null;
}
export async function dashboardSpotlight(ctx: CampaignContext, pageId: unknown): Promise<DashboardPreview | null> {
  if (typeof pageId !== 'string' || !pageId) return null;
  const page = (await dashboardVisiblePages(ctx, [pageId]))[0];
  if (!page) return null;
  const row = await prisma.wikiPage.findFirst({ where: { id: page.id, campaignId: ctx.campaignId, deletedAt: null }, select: { blocks: true } });
  const blocks = Array.isArray(row?.blocks) ? row.blocks as Record<string, unknown>[] : [];
  const staff = ctx.capabilities.has(C.NARRATIVE_ELEVATED_VIEW);
  const state = staff ? new Map() : await getContentPresenceStateBySubEntityMap(ctx.campaignId,
    blocks.filter(block => typeof block.id === 'string').map(block => ({ entityType: E.WIKI_BLOCK, entityId: page.id, subEntityId: block.id as string })));
  const viewer = buildRevelationViewerContext({ role: null, canManage: staff });
  const visibleBlocks = blocks.filter(block => staff || (block.isPrivate !== true && block.visibility !== 'DM_Only' &&
    isPresenceVisibleToContext(state.get(`${E.WIKI_BLOCK}:${page.id}:${block.id}`) ?? ContentRevelationStates.REVEALED, viewer)));
  const metadata = page.metadata as Record<string, unknown> | null;
  const appearance = metadata?.appearance as { portraitUrl?: unknown } | undefined;
  const portraitId = typeof appearance?.portraitUrl === 'string' ? parseAssetReferenceId(appearance.portraitUrl) : null;
  return { id: page.id, title: page.title, type: resolveWikiCodexType(page), href: buildWikiPageHref(ctx.campaignHandle ?? ctx.campaignId, page),
    imageUrl: await safeThumbnail(ctx, page.featuredImageId ?? portraitId), excerpt: extractWikiPageExcerpt(visibleBlocks, { maxLength: 260, includeDmOnlyBlocks: staff }) || null };
}
export async function dashboardMaps(ctx: CampaignContext, selectedId: unknown, options = false) {
  if (!ctx.isMember || !ctx.capabilities.has(C.ASSETS_VIEW)) return { options: [], preview: null };
  const rows = await prisma.asset.findMany({ where: { campaignId: ctx.campaignId, type: 'map', visibility: { in: dashboardVisibility(ctx) },
    OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }], ...(options ? {} : { id: typeof selectedId === 'string' ? selectedId : '__none__' }) },
    select: { id: true, displayName: true, thumbnailUrl: true }, orderBy: { createdAt: 'desc' }, take: options ? 100 : 1 });
  // Keep an older saved choice available even when it falls outside the bank's
  // bounded list of recent maps.
  if (options && typeof selectedId === 'string' && !rows.some(row => row.id === selectedId)) {
    const selected = await prisma.asset.findFirst({ where: { id: selectedId, campaignId: ctx.campaignId, type: 'map', visibility: { in: dashboardVisibility(ctx) },
      OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }] }, select: { id: true, displayName: true, thumbnailUrl: true } });
    if (selected) rows.push(selected);
  }
  const linked = await prisma.wikiPage.findMany({ where: { campaignId: ctx.campaignId, deletedAt: null, mapAssetId: { in: rows.map(row => row.id) } }, select: { id: true, mapAssetId: true } });
  const visible = new Set((await dashboardVisiblePages(ctx, linked.map(page => page.id))).map(page => page.id));
  const maps = rows.filter(row => linked.filter(page => page.mapAssetId === row.id).every(page => visible.has(page.id)));
  const map = maps.find(row => row.id === selectedId);
  return {
    options: maps.map(row => ({ id: row.id, title: row.displayName?.trim() || 'Campaign map' })),
    preview: map ? { id: map.id, title: map.displayName?.trim() || 'Campaign map', type: 'map',
      href: `/campaigns/${encodeURIComponent(ctx.campaignHandle ?? ctx.campaignId)}/maps/${encodeURIComponent(map.id)}`,
      imageUrl: map.thumbnailUrl ? `/api/assets/${encodeURIComponent(map.id)}?variant=thumb` : null, excerpt: null } satisfies DashboardPreview : null,
  };
}
