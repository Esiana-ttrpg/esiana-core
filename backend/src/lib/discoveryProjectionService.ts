import { prisma } from './prisma.js';
import {
  ContentPresenceEntityType,
  ContentRevelationStates,
  type ContentRevelationState,
} from '../../../shared/contentPresence.js';
import {
  filterClaimsForPartyKnowledge,
  projectBrowseSummary,
  projectDiscoveryState,
  projectPageDiscovery,
  serializePresenceRevelation,
  type DiscoveryBrowseSummary,
  type DiscoveryProjection,
  type DiscoveryStateProjection,
  type RevelationProvenance,
} from '../../../shared/discoveryProjection.js';
import type { LoreClaimRecord, LoreInterpretationAccountRecord } from '../../../shared/loreKnowledge.js';
import {
  buildRevelationViewerContext,
  isPresenceVisibleToContext,
  projectRevelation,
  projectWikiPageVisibility,
  resolvePresenceState,
} from '../../../shared/narrativeProjection.js';
import {
  isRelationVisibleToViewer,
  type RelationVisibility,
} from './entityRelationTypes.js';
import {
  getContentPresenceMetaMap,
  getContentPresenceStateMap,
} from './contentPresenceService.js';
import { isElevatedWikiRole } from './wikiLinkService.js';

export async function buildPageDiscoveryMap(
  campaignId: string,
  pageIds: string[],
): Promise<Map<string, ContentRevelationState>> {
  if (pageIds.length === 0) return new Map();
  return getContentPresenceStateMap(
    campaignId,
    ContentPresenceEntityType.WIKI_PAGE,
    pageIds,
  );
}

export async function resolveCampaignNowEpochMinute(
  campaignId: string,
): Promise<number> {
  const campaign = await prisma.campaign.findUnique({
    where: { id: campaignId },
    select: { currentEpochMinute: true },
  });
  return Number(campaign?.currentEpochMinute ?? 0n);
}

export function projectPageDiscoveryFromMap(
  pageId: string,
  presenceMap: Map<string, ContentRevelationState>,
  isManagerView: boolean,
  revelation?: RevelationProvenance,
): DiscoveryProjection {
  return projectPageDiscovery(pageId, presenceMap, isManagerView, revelation);
}

export function projectBrowseDiscoverySummary<T extends { id: string }>(
  items: T[],
  presenceMap: Map<string, ContentRevelationState>,
  isManagerView: boolean,
): DiscoveryBrowseSummary {
  return projectBrowseSummary(items, presenceMap, isManagerView);
}

export type PagePresenceMeta = {
  state: ContentRevelationState;
  revelation: RevelationProvenance | null;
  availableFromEpochMinute: number | null;
};

export async function buildPagePresenceMetaMap(
  campaignId: string,
  pageIds: string[],
): Promise<Map<string, PagePresenceMeta>> {
  const metaMap = await getContentPresenceMetaMap(
    campaignId,
    ContentPresenceEntityType.WIKI_PAGE,
    pageIds,
  );
  const result = new Map<string, PagePresenceMeta>();
  for (const pageId of pageIds) {
    const meta = metaMap.get(pageId);
    const state = meta?.state ?? ContentRevelationStates.REVEALED;
    result.set(pageId, {
      state,
      availableFromEpochMinute: meta?.availableFromEpochMinute ?? null,
      revelation: serializePresenceRevelation({
        revealedAt: meta?.revealedAt ?? null,
        workflowKey: meta?.workflowKey ?? null,
        reason: meta?.reason ?? null,
      }),
    });
  }
  return result;
}

type BatchLoreInputs = {
  claimsByPageId: Map<string, LoreClaimRecord[]>;
  interpretationsByPageId: Map<string, LoreInterpretationAccountRecord[]>;
};

async function loadBatchLoreInputs(
  campaignId: string,
  pageIds: string[],
  role: string | null,
): Promise<BatchLoreInputs> {
  const cleanedIds = [...new Set(pageIds.map((id) => id.trim()).filter(Boolean))];
  const claimsByPageId = new Map<string, LoreClaimRecord[]>();
  const interpretationsByPageId = new Map<string, LoreInterpretationAccountRecord[]>();
  if (cleanedIds.length === 0) {
    return { claimsByPageId, interpretationsByPageId };
  }

  const isElevated = isElevatedWikiRole(role);
  const [claimRows, interpretationRows] = await Promise.all([
    prisma.loreClaim.findMany({
      where: { campaignId, pageId: { in: cleanedIds } },
      select: {
        id: true,
        stableKey: true,
        pageId: true,
        campaignId: true,
        statement: true,
        interpretationGroupId: true,
        confidence: true,
        visibility: true,
        narrativeWeight: true,
        gmResolution: true,
        knowledgeState: true,
        discoveredViaSessionId: true,
        discoveredViaType: true,
        discoveredViaRef: true,
        discoveredAt: true,
        sortOrder: true,
      },
      orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }, { createdAt: 'asc' }],
    }),
    prisma.loreInterpretationAccount.findMany({
      where: { campaignId, pageId: { in: cleanedIds } },
      select: {
        id: true,
        stableKey: true,
        pageId: true,
        campaignId: true,
        interpretationGroupId: true,
        title: true,
        narrative: true,
        accountKind: true,
        beliefRegion: true,
        sourceOrigin: true,
        confidence: true,
        visibility: true,
        narrativeWeight: true,
        gmResolution: true,
        sortOrder: true,
      },
      orderBy: [{ sortOrder: 'asc' }, { title: 'asc' }, { id: 'asc' }],
    }),
  ]);

  for (const row of claimRows) {
    if (
      !isElevated &&
      !isRelationVisibleToViewer(row.visibility as RelationVisibility, isElevated)
    ) {
      continue;
    }
    const claim = {
      id: row.id,
      stableKey: row.stableKey,
      pageId: row.pageId,
      campaignId: row.campaignId,
      statement: row.statement,
      interpretationGroupId: row.interpretationGroupId,
      confidence: row.confidence,
      visibility: row.visibility,
      narrativeWeight: row.narrativeWeight,
      gmResolution: isElevated ? row.gmResolution : null,
      knowledgeState: row.knowledgeState,
      discoveredViaSessionId: row.discoveredViaSessionId,
      discoveredViaType: row.discoveredViaType,
      discoveredViaRef: row.discoveredViaRef,
      discoveredAt: row.discoveredAt?.toISOString() ?? null,
      sortOrder: row.sortOrder,
    } as LoreClaimRecord;
    const list = claimsByPageId.get(row.pageId) ?? [];
    list.push(claim);
    claimsByPageId.set(row.pageId, list);
  }

  for (const row of interpretationRows) {
    if (
      !isElevated &&
      !isRelationVisibleToViewer(row.visibility as RelationVisibility, isElevated)
    ) {
      continue;
    }
    const account = {
      id: row.id,
      stableKey: row.stableKey,
      pageId: row.pageId,
      campaignId: row.campaignId,
      interpretationGroupId: row.interpretationGroupId,
      title: row.title,
      narrative: row.narrative,
      accountKind: row.accountKind,
      beliefRegion: row.beliefRegion,
      sourceOrigin: row.sourceOrigin,
      confidence: row.confidence,
      visibility: row.visibility,
      narrativeWeight: row.narrativeWeight,
      gmResolution: isElevated ? row.gmResolution : null,
      sortOrder: row.sortOrder,
    } as LoreInterpretationAccountRecord;
    const list = interpretationsByPageId.get(row.pageId) ?? [];
    list.push(account);
    interpretationsByPageId.set(row.pageId, list);
  }

  for (const [pageId, claims] of claimsByPageId) {
    claimsByPageId.set(
      pageId,
      filterClaimsForPartyKnowledge(claims, isElevated),
    );
  }

  return { claimsByPageId, interpretationsByPageId };
}

export async function buildPageDiscoveryProjectionMap(
  campaignId: string,
  pageIds: string[],
  options: {
    role: string | null;
    campaignNowEpochMinute?: number | null;
  },
): Promise<Map<string, DiscoveryStateProjection>> {
  const cleanedIds = [...new Set(pageIds.map((id) => id.trim()).filter(Boolean))];
  const result = new Map<string, DiscoveryStateProjection>();
  if (cleanedIds.length === 0) return result;

  const isManagerView = isElevatedWikiRole(options.role);
  const campaignNowEpochMinute =
    options.campaignNowEpochMinute
    ?? (await resolveCampaignNowEpochMinute(campaignId));

  const [presenceMeta, loreInputs] = await Promise.all([
    buildPagePresenceMetaMap(campaignId, cleanedIds),
    loadBatchLoreInputs(campaignId, cleanedIds, options.role),
  ]);

  for (const pageId of cleanedIds) {
    const meta = presenceMeta.get(pageId);
    const presenceState = meta?.state ?? ContentRevelationStates.REVEALED;
    result.set(
      pageId,
      projectDiscoveryState({
        presenceState,
        availableFromEpochMinute: meta?.availableFromEpochMinute ?? null,
        campaignNowEpochMinute,
        claims: loreInputs.claimsByPageId.get(pageId) ?? [],
        interpretations: loreInputs.interpretationsByPageId.get(pageId) ?? [],
        isManagerView,
      }),
    );
  }

  return result;
}

export function isPageVisibleToParty(
  presenceMap: Map<string, ContentRevelationState>,
  pageId: string,
  role: string | null = null,
): boolean {
  const ctx = buildRevelationViewerContext({ role, canManage: false });
  const state = resolvePresenceState(presenceMap, pageId);
  return isPresenceVisibleToContext(state, ctx);
}

export function isPageAvailableFromProjection(
  projection: DiscoveryStateProjection | undefined,
  presenceMap: Map<string, ContentRevelationState>,
  pageId: string,
  role: string | null = null,
): boolean {
  if (projection) return projection.available;
  return isPageVisibleToParty(presenceMap, pageId, role);
}

export function projectPageVisibilityFromMap(
  pageId: string,
  presenceMap: Map<string, ContentRevelationState>,
  isManagerView: boolean,
  revelation?: RevelationProvenance,
  role: string | null = null,
) {
  const ctx = buildRevelationViewerContext({
    role,
    isManagerView,
  });
  return projectWikiPageVisibility(pageId, presenceMap, ctx, revelation);
}

export function projectPageRevelationFromMap(
  pageId: string,
  presenceMap: Map<string, ContentRevelationState>,
  isManagerView: boolean,
  revelation?: RevelationProvenance,
  role: string | null = null,
) {
  const ctx = buildRevelationViewerContext({
    role,
    isManagerView,
  });
  const state = resolvePresenceState(presenceMap, pageId);
  return projectRevelation(state, ctx, revelation);
}
