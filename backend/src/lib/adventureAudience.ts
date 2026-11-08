import type { CampaignContext } from '../types/api.js';
import type { NarrativeViewerContext } from '../../../shared/narrativeProjection.js';
import { CampaignCapabilities, type CampaignCapability } from '../../../shared/campaignPolicy/capabilities.js';
import { canViewSharedPartyBaseline, canViewVisibility } from '../../../shared/campaignPolicy/resourceAccess.js';
import type { WikiVisibilityViewer } from './wikiTree.js';
import { prisma } from './prisma.js';
import { ContentPresenceEntityType, ContentRevelationStates } from '../../../shared/contentPresence.js';
import { parseSystemCategoryKey } from './wikiSystemCategory.js';
import { isWorkshopDraftMetadata, isWorkshopDraftsRootMetadata } from '../../../shared/workshopDocument.js';
import { ensureNarrativeScenesSystemCategoryKey } from './ensureNarrativeScenesSystemCategoryKey.js';
import { buildNarrativeScenesCategoryMetadata } from './wikiSystemCategory.js';

/** Keep only pages whose entire ancestry is visible to the effective audience. */
export function filterAdventureAudiencePages<T extends { id: string; parentId: string | null; visibility: string }>(
  rows: readonly T[], canView: (visibility: string) => boolean,
): T[] {
  const byId = new Map(rows.map(row => [row.id, row]));
  return rows.filter(row => {
    const seen = new Set<string>();
    let current: T | undefined = row;
    while (current) {
      if (seen.has(current.id) || !canView(current.visibility)) return false;
      seen.add(current.id);
      if (!current.parentId) return true;
      current = byId.get(current.parentId);
      if (!current) return false;
    }
    return false;
  });
}

/** Apply revelation, campaign time, lifecycle and ancestry before any preview derivation. */
export async function filterAdventurePreviewPages<T extends { id: string; parentId: string | null; visibility: string; metadata: unknown }>(
  campaignId: string, rows: readonly T[], canView: (visibility: string) => boolean,
): Promise<T[]> {
  const scenesRootId = await ensureNarrativeScenesSystemCategoryKey(campaignId);
  const normalizedRows = scenesRootId ? rows.map(row => row.id === scenesRootId
    ? { ...row, metadata: { ...(row.metadata && typeof row.metadata === 'object' && !Array.isArray(row.metadata)
      ? row.metadata as Record<string, unknown> : {}), ...buildNarrativeScenesCategoryMetadata() } } as T : row) : rows;
  const [presenceRows, lifecycleRows, now, secretPages] = await Promise.all([
    prisma.contentPresenceState.findMany({
      where: { campaignId, entityType: ContentPresenceEntityType.WIKI_PAGE, subEntityId: null },
      select: { entityId: true, state: true, availableFromEpochMinute: true },
    }),
    prisma.narrativeLifecycleState.findMany({ where: { campaignId }, select: { subjectId: true, subjectKind: true, lifecycleState: true } }),
    prisma.campaign.findUniqueOrThrow({ where: { id: campaignId }, select: { currentEpochMinute: true } }),
    prisma.pageNarrativeStatus.findMany({ where: { campaignId, status: 'SECRET' }, select: { wikiPageId: true } }),
  ]);
  const hidden = new Set(presenceRows.filter(row => row.state !== ContentRevelationStates.REVEALED ||
    (row.availableFromEpochMinute != null && row.availableFromEpochMinute > now.currentEpochMinute)).map(row => row.entityId));
  for (const row of lifecycleRows) if (row.lifecycleState === 'LOCKED') hidden.add(row.subjectId);
  for (const row of secretPages) hidden.add(row.wikiPageId);
  const scenesRoot = normalizedRows.find(row => parseSystemCategoryKey(row.metadata) === 'narrative_scenes');
  if (scenesRoot) {
    const parents = new Map(normalizedRows.map(row => [row.id, row.parentId]));
    const lifecycleIds = new Set(lifecycleRows.filter(row => row.subjectKind === 'scene').map(row => row.subjectId));
    for (const row of normalizedRows) {
      let parent = row.parentId;
      const seen = new Set<string>();
      while (parent && !seen.has(parent)) {
        if (parent === scenesRoot.id) { if (!lifecycleIds.has(row.id)) hidden.add(row.id); break; }
        seen.add(parent);
        parent = parents.get(parent) ?? null;
      }
    }
  }
  return filterAdventureAudiencePages(normalizedRows.filter(row => {
    if (hidden.has(row.id)) return false;
    if (isWorkshopDraftMetadata(row.metadata) || isWorkshopDraftsRootMetadata(row.metadata)) return false;
    const metadata = row.metadata;
    return !(metadata && typeof metadata === 'object' && !Array.isArray(metadata) &&
      (metadata as Record<string, unknown>).orchestrationOnly === true);
  }), canView);
}

/** Resolve once per request. A preview can only narrow the real campaign actor. */
export function resolveAdventureAudience(
  scope: CampaignContext,
  requested: unknown,
  viewer: NarrativeViewerContext | null,
) {
  const requestedParty = requested === 'true' || requested === '1';
  const preview = requestedParty && scope.actor.kind === 'member';
  if (!preview) return {
    preview: false,
    visibilityViewer: scope as WikiVisibilityViewer,
    narrativeViewer: viewer,
    canViewPage: (visibility: string) => canViewVisibility(scope.actor, visibility),
  };
  const capabilities = new Set<CampaignCapability>();
  if (canViewSharedPartyBaseline(scope.actor, 'Public')) capabilities.add(CampaignCapabilities.CAMPAIGN_VIEW);
  if (canViewSharedPartyBaseline(scope.actor, 'Party')) capabilities.add(CampaignCapabilities.WIKI_VIEW_PARTY);
  const narrativeViewer: NarrativeViewerContext | null = viewer ? {
    ...viewer,
    role: null,
    perspective: 'party',
    capabilities: {
      canManageChronology: false, canRevealContent: false, canUseGhostMode: false,
      isElevatedWiki: false, isElevatedMap: false,
    },
  } : null;
  return {
    preview: true,
    visibilityViewer: { capabilities } as WikiVisibilityViewer,
    narrativeViewer,
    canViewPage: (visibility: string) => canViewSharedPartyBaseline(scope.actor, visibility),
  };
}
