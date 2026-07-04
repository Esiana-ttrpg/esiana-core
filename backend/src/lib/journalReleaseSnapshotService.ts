/**
 * Reference-driven builder for the journal release snapshot.
 *
 * Gathers ONLY the facts referenced by the rules being evaluated (no
 * full-table scans), batched by id, one shared snapshot per invocation. The
 * pure evaluator (shared/journalReleaseRule.ts) then reads these facts.
 *
 * Evaluation uses canonical (elevated) truth so auto-release is deterministic
 * regardless of who triggers it. Missing references are flagged
 * deleted/unresolved with a best-known label so diagnostics never leak a UUID.
 */
import { prisma } from './prisma.js';
import {
  collectRuleReferences,
  type JournalReleaseSnapshot,
  type PageVisibilityLevel,
  type ReleaseMissingReason,
  type ReleaseNode,
  type SnapshotFact,
} from '../../../shared/journalReleaseRule.js';
import { parseCampaignReputationState } from '../../../shared/reputationMetadata.js';
import {
  getPageNarrativeStatusMap,
  resolveEffectivePageNarrativeStatus,
} from './pageNarrativeStatusService.js';
import { getLifecycleStates } from './narrativeLifecycleService.js';
import { NarrativeLifecycleSubjectKinds } from '../../../shared/narrativeLifecycle.js';

type PageRow = {
  id: string;
  title: string;
  deletedAt: Date | null;
  visibility: string;
  metadata: unknown;
};

function okFact<T>(value: T, label?: string): SnapshotFact<T> {
  return label ? { status: 'ok', value, label } : { status: 'ok', value };
}

function missingFact<T>(
  reason: ReleaseMissingReason,
  label?: string,
): SnapshotFact<T> {
  return label
    ? { status: 'missing', missingReason: reason, label }
    : { status: 'missing', missingReason: reason };
}

function toVisibilityLevel(visibility: string): PageVisibilityLevel {
  if (visibility === 'Public') return 'public';
  if (visibility === 'Party') return 'party';
  return 'dm';
}

function uniq(ids: string[]): string[] {
  return [...new Set(ids.map((id) => id.trim()).filter(Boolean))];
}

async function loadPageRows(
  campaignId: string,
  pageIds: string[],
): Promise<Map<string, PageRow>> {
  const ids = uniq(pageIds);
  if (ids.length === 0) return new Map();
  const rows = await prisma.wikiPage.findMany({
    where: { campaignId, id: { in: ids } },
    select: { id: true, title: true, deletedAt: true, visibility: true, metadata: true },
  });
  const map = new Map<string, PageRow>();
  for (const row of rows) map.set(row.id, row as PageRow);
  return map;
}

/**
 * Resolve a wiki-page-backed subsystem fact. `resolveValue` is called only when
 * the page exists and is live; returning null means "page is fine but has no
 * such subsystem state" (unresolved, mis-authored rule).
 */
function pageFact<T>(
  page: PageRow | undefined,
  resolveValue: (page: PageRow) => T | null,
): SnapshotFact<T> {
  if (!page) return missingFact('deleted');
  if (page.deletedAt) return missingFact('deleted', page.title);
  const value = resolveValue(page);
  if (value === null) return missingFact('unresolved', page.title);
  return okFact(value, page.title);
}

export interface BuildSnapshotParams {
  campaignId: string;
  rules: (ReleaseNode | null | undefined)[];
}

export async function buildJournalReleaseSnapshot(
  params: BuildSnapshotParams,
): Promise<JournalReleaseSnapshot> {
  const { campaignId } = params;

  const refs = {
    sessionPageIds: [] as string[],
    eventIds: [] as string[],
    suggestionIds: [] as string[],
    characterPageIds: [] as string[],
    questPageIds: [] as string[],
    pageIds: [] as string[],
    projectPageIds: [] as string[],
    havenPageIds: [] as string[],
    factionPageIds: [] as string[],
    regionPageIds: [] as string[],
    usesSeason: false,
    usesRealWorldClock: false,
  };
  for (const rule of params.rules) {
    const collected = collectRuleReferences(rule);
    refs.sessionPageIds.push(...collected.sessionPageIds);
    refs.eventIds.push(...collected.eventIds);
    refs.suggestionIds.push(...collected.suggestionIds);
    refs.characterPageIds.push(...collected.characterPageIds);
    refs.questPageIds.push(...collected.questPageIds);
    refs.pageIds.push(...collected.pageIds);
    refs.projectPageIds.push(...collected.projectPageIds);
    refs.havenPageIds.push(...collected.havenPageIds);
    refs.factionPageIds.push(...collected.factionPageIds);
    refs.regionPageIds.push(...collected.regionPageIds);
  }

  const campaign = await prisma.campaign.findUnique({
    where: { id: campaignId },
    select: { currentSession: true, currentEpochMinute: true },
  });
  const currentEpochMinute = campaign?.currentEpochMinute ?? 0n;
  const currentSession = campaign?.currentSession ?? 0;

  const allPageIds = uniq([
    ...refs.characterPageIds,
    ...refs.questPageIds,
    ...refs.pageIds,
    ...refs.projectPageIds,
    ...refs.havenPageIds,
    ...refs.factionPageIds,
    ...refs.regionPageIds,
  ]);

  const [
    pageRows,
    narrativeStatusMap,
    lifecycleMap,
    presenceRows,
    projectRows,
    havenRows,
    reputationRow,
    visitRows,
    eventRows,
    suggestionRows,
  ] = await Promise.all([
    loadPageRows(campaignId, allPageIds),
    getPageNarrativeStatusMap(campaignId, uniq(refs.characterPageIds)),
    getLifecycleStates(campaignId, NarrativeLifecycleSubjectKinds.QUEST, uniq(refs.questPageIds)),
    uniq(refs.pageIds).length
      ? prisma.contentPresenceState.findMany({
          where: {
            campaignId,
            entityType: 'wiki_page',
            entityId: { in: uniq(refs.pageIds) },
            subEntityId: null,
          },
          select: { entityId: true, state: true },
        })
      : Promise.resolve([] as { entityId: string; state: string }[]),
    uniq(refs.projectPageIds).length
      ? prisma.downtimeProject.findMany({
          where: { campaignId, wikiPageId: { in: uniq(refs.projectPageIds) } },
          select: { wikiPageId: true, status: true, progressPercent: true },
        })
      : Promise.resolve([] as { wikiPageId: string; status: string; progressPercent: number }[]),
    uniq(refs.havenPageIds).length
      ? prisma.downtimeHaven.findMany({
          where: { campaignId, wikiPageId: { in: uniq(refs.havenPageIds) } },
          select: { wikiPageId: true, status: true, scale: true },
        })
      : Promise.resolve([] as { wikiPageId: string; status: string; scale: string | null }[]),
    refs.factionPageIds.length
      ? prisma.campaignReputation.findUnique({
          where: { campaignId },
          select: { simulationState: true },
        })
      : Promise.resolve(null),
    uniq(refs.regionPageIds).length
      ? prisma.partyRegionVisit.findMany({
          where: { campaignId, locationPageId: { in: uniq(refs.regionPageIds) } },
          select: { locationPageId: true },
        })
      : Promise.resolve([] as { locationPageId: string }[]),
    uniq(refs.eventIds).length
      ? prisma.calendarEvent.findMany({
          where: { id: { in: uniq(refs.eventIds) }, calendar: { campaignId } },
          select: {
            id: true,
            title: true,
            targetEpochMinute: true,
            prerequisiteId: true,
            visibility: true,
          },
        })
      : Promise.resolve(
          [] as {
            id: string;
            title: string;
            targetEpochMinute: bigint | null;
            prerequisiteId: string | null;
            visibility: string;
          }[],
        ),
    uniq(refs.suggestionIds).length
      ? prisma.campaignWorldEventSuggestion.findMany({
          where: { campaignId, id: { in: uniq(refs.suggestionIds) } },
          select: { id: true, status: true, title: true },
        })
      : Promise.resolve([] as { id: string; status: string; title: string }[]),
  ]);

  // Resolve prerequisite events (a second targeted batch, still reference-driven).
  const prerequisiteIds = uniq(
    eventRows.map((e) => e.prerequisiteId).filter((id): id is string => Boolean(id)),
  );
  const prerequisiteEpochById = new Map<string, bigint | null>();
  if (prerequisiteIds.length) {
    const prereqRows = await prisma.calendarEvent.findMany({
      where: { id: { in: prerequisiteIds }, calendar: { campaignId } },
      select: { id: true, targetEpochMinute: true },
    });
    for (const row of prereqRows) prerequisiteEpochById.set(row.id, row.targetEpochMinute);
  }

  const presenceByPage = new Map(presenceRows.map((r) => [r.entityId, r.state]));
  const projectByPage = new Map(projectRows.map((r) => [r.wikiPageId, r]));
  const havenByPage = new Map(havenRows.map((r) => [r.wikiPageId, r]));
  const visitedRegions = new Set(visitRows.map((r) => r.locationPageId));
  const reputationState = parseCampaignReputationState(reputationRow?.simulationState ?? null);
  const eventById = new Map(eventRows.map((r) => [r.id, r]));
  const suggestionById = new Map(suggestionRows.map((r) => [r.id, r]));

  const snapshot: JournalReleaseSnapshot = {
    currentEpochMinute: currentEpochMinute.toString(),
    currentSession,
    currentSeasonId: null,
    nowIso: new Date().toISOString(),
    sessions: {},
    events: {},
    worldEventSuggestions: {},
    characters: {},
    quests: {},
    pages: {},
    projects: {},
    havens: {},
    factions: {},
    regions: {},
  };

  for (const id of uniq(refs.characterPageIds)) {
    const page = pageRows.get(id);
    snapshot.characters[id] = pageFact(page, (p) => ({
      status: resolveEffectivePageNarrativeStatus({
        stored: narrativeStatusMap.get(id) ?? null,
        metadata: p.metadata,
      }),
    }));
  }

  for (const id of uniq(refs.questPageIds)) {
    const page = pageRows.get(id);
    snapshot.quests[id] = pageFact(page, () => ({
      lifecycleState: lifecycleMap.get(id) ?? null,
    }));
  }

  for (const id of uniq(refs.pageIds)) {
    const page = pageRows.get(id);
    snapshot.pages[id] = pageFact(page, (p) => {
      const state = presenceByPage.get(id);
      const revealed = state === undefined || state === 'REVEALED';
      return { revealed, visibilityLevel: toVisibilityLevel(p.visibility) };
    });
  }

  for (const id of uniq(refs.projectPageIds)) {
    const page = pageRows.get(id);
    snapshot.projects[id] = pageFact(page, () => {
      const row = projectByPage.get(id);
      if (!row) return null;
      return { status: row.status, progressPercent: row.progressPercent };
    });
  }

  for (const id of uniq(refs.havenPageIds)) {
    const page = pageRows.get(id);
    snapshot.havens[id] = pageFact(page, () => {
      const row = havenByPage.get(id);
      if (!row) return null;
      return { status: row.status, scale: row.scale };
    });
  }

  for (const id of uniq(refs.factionPageIds)) {
    const page = pageRows.get(id);
    snapshot.factions[id] = pageFact(page, () => {
      const scores = reputationState.factions[id];
      return { trust: scores?.trust ?? 50, notoriety: scores?.notoriety ?? 50 };
    });
  }

  for (const id of uniq(refs.regionPageIds)) {
    const page = pageRows.get(id);
    snapshot.regions[id] = pageFact(page, () => ({ visited: visitedRegions.has(id) }));
  }

  for (const id of uniq(refs.eventIds)) {
    const event = eventById.get(id);
    if (!event) {
      snapshot.events[id] = missingFact('deleted');
      continue;
    }
    const occurred =
      event.targetEpochMinute !== null && event.targetEpochMinute <= currentEpochMinute;
    let prerequisiteMet = true;
    if (event.prerequisiteId) {
      const prereqEpoch = prerequisiteEpochById.get(event.prerequisiteId) ?? null;
      prerequisiteMet = prereqEpoch !== null && prereqEpoch <= currentEpochMinute;
    }
    snapshot.events[id] = okFact(
      {
        occurred,
        resolved: occurred,
        visible: event.visibility.toUpperCase() !== 'DM_ONLY',
        prerequisiteMet,
        targetEpochMinute:
          event.targetEpochMinute !== null ? event.targetEpochMinute.toString() : null,
      },
      event.title,
    );
  }

  for (const id of uniq(refs.suggestionIds)) {
    const suggestion = suggestionById.get(id);
    if (!suggestion) {
      snapshot.worldEventSuggestions[id] = missingFact('deleted');
      continue;
    }
    snapshot.worldEventSuggestions[id] = okFact(
      { accepted: suggestion.status === 'accepted' },
      suggestion.title,
    );
  }

  return snapshot;
}
