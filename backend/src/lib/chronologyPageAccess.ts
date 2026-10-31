import type { CampaignContext } from '../types/api.js';
import { canViewWikiPage } from './wikiTree.js';
import { chronologyElevated } from './chronologyAccess.js';
import { buildPageDiscoveryMap, buildPageDiscoveryProjectionMap, isPageAvailableFromProjection } from './discoveryProjectionService.js';
import { findPrimaryDescriptionBlock, normalizeDescriptionMarkdown, type WikiBlockLike } from './eventLoreWiki.js';
import { getContentPresenceStateBySubEntityMap } from './contentPresenceService.js';
import { ContentPresenceEntityType, ContentRevelationStates } from '../../../shared/contentPresence.js';
import { buildRevelationViewerContext, isPresenceVisibleToContext } from '../../../shared/narrativeProjection.js';

/** Callers separately authorize the chronology record; its visibility never grants page access. */
export async function visibleChronologyPageIds(ctx: CampaignContext,
  pages: Array<{ id: string; visibility: string; deletedAt?: Date | null }>) {
  const eligible = pages.filter(page => !page.deletedAt && canViewWikiPage(page.visibility, ctx.role));
  if (chronologyElevated(ctx)) return new Set(eligible.map(page => page.id));
  const ids = eligible.map(page => page.id);
  const [presence, projections] = await Promise.all([
    buildPageDiscoveryMap(ctx.campaignId, ids),
    buildPageDiscoveryProjectionMap(ctx.campaignId, ids, { role: ctx.role }),
  ]);
  return new Set(ids.filter(id => isPageAvailableFromProjection(projections.get(id), presence, id, ctx.role)));
}

/** A legacy era description may be sourced from a page, but never from a restricted block. */
export async function chronologyPageDescriptions(ctx: CampaignContext,
  pages: Array<{ id: string; blocks: unknown }>, visible: Set<string>) {
  const primary = pages.filter(page => visible.has(page.id)).map(page => ({ id: page.id,
    block: findPrimaryDescriptionBlock(Array.isArray(page.blocks) ? page.blocks as WikiBlockLike[] : []) }));
  const presence = chronologyElevated(ctx) ? new Map() : await getContentPresenceStateBySubEntityMap(ctx.campaignId,
    primary.filter(row => row.block?.id).map(row => ({ entityType: ContentPresenceEntityType.WIKI_BLOCK, entityId: row.id, subEntityId: row.block!.id! })));
  const viewer = buildRevelationViewerContext({ role: ctx.role, canManage: chronologyElevated(ctx) });
  return new Map(primary.map(({ id, block }) => {
    const allowed = block && canViewWikiPage(block.isPrivate ? 'DM_Only' : block.visibility ?? 'Party', ctx.role)
      && isPresenceVisibleToContext(presence.get(`${ContentPresenceEntityType.WIKI_BLOCK}:${id}:${block.id}`) ?? ContentRevelationStates.REVEALED, viewer);
    return [id, allowed && typeof block.content?.markdown === 'string' ? normalizeDescriptionMarkdown(block.content.markdown) : null];
  }));
}
