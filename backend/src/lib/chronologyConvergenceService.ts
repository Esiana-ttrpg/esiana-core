import { prisma } from './prisma.js';
import { canManageChronology, normalizeCampaignMemberRole } from './acl.js';
import { chronologyVisibilityFilter } from './chronologyVisibility.js';
import {
  advanceCalendarDate,
  getMonthLengthsForYear,
  resolveEventStartCoordinates,
  type CalendarRowForResolve,
} from './chronologyOccurrences.js';
import { resolveCampaignChronologyNow } from './chronologyDefaults.js';
import { getContentPresenceStateMap } from './contentPresenceService.js';
import { parseSessionNoteMetadata } from './sessionNoteMetadata.js';
import { parseOrganizationMetadata, isOrganizationMetadataPresent } from './organizationMetadata.js';
import { buildCategoryIndexWhereClause } from './wikiCategoryEntityIndex.js';
import { ContentPresenceEntityType } from '../../../shared/contentPresence.js';
import {
  anchorFromFactionControl,
  anchorFromMapKeyframe,
  anchorFromOrgRelationEvent,
  anchorFromSessionTimelinePoint,
  anchorFromTimelineOccurrence,
  anchorFromWorldAdvanceEffect,
  ChronologyDomainKind,
  type CanonicalChronologyAnchor,
  type ChronologyDomainKindValue,
  type ChronologyWindowQuery,
} from '../../../shared/chronologyTypes.js';
import { parseMapObjectOverlayStyle } from '../../../shared/mapOverlayTypes.js';
import {
  WORLD_ADVANCE_CATEGORY,
  parseWorldAdvanceBatchPayload,
} from '../../../shared/worldAdvance.js';
import {
  buildConvergenceEntry,
  buildProjectionContextHash,
  capConvergenceEntries,
  CONVERGENCE_BUNDLE_VERSION,
  CONVERGENCE_MAX_ENTRIES,
  filterEntriesByDomains,
  filterEntriesByWindow,
  filterEntriesForViewer,
  filterEntriesSessionLinkedOnly,
  mergeAndSortEntries,
  type ConvergenceOverlayBundle,
  type ConvergenceTimelineEntry,
} from '../../../shared/chronologyConvergence.js';
import {
  buildNarrativeViewerContext,
  type NarrativeViewerContext,
} from '../../../shared/narrativeProjection.js';
import { collectDowntimePeriodAnchors } from './downtimePeriodProjectionService.js';
import { buildWikiPagePathMap } from './wikiPageHrefSelect.js';

const MAX_GENERATED_PER_EVENT = 100;
const MAX_GENERATED_TOTAL = 2000;

type BuildOverlayInput = {
  campaignId: string;
  campaignHandle: string;
  role: string | null;
  allowPlayerChronologyManagement: boolean;
  window: ChronologyWindowQuery;
  domains: ChronologyDomainKindValue[] | null;
  sessionLinkedOnly: boolean;
  includeSuppressed: boolean;
};

type BaseEvent = {
  id: string;
  calendarId: string;
  categoryId: string | null;
  prerequisiteId: string | null;
  visibility: string;
  title: string;
  description: string | null;
  duration: number;
  isRepeating: boolean;
  repeatInterval: number | null;
  repeatUnit: string | null;
  limitRepetitions: number | null;
  targetYear: number | null;
  targetMonth: number | null;
  targetDay: number | null;
  targetEpochMinute: bigint | null;
};

function addRepeatUnit(
  year: number | null,
  month: number | null,
  day: number | null,
  unit: string,
  interval: number,
  monthLengths: number[],
): { year: number | null; month: number | null; day: number | null } {
  if (year === null || month === null || day === null) {
    return { year, month, day };
  }
  let nextYear = year;
  let nextMonth = month;
  let nextDay = day;
  if (unit === 'DAYS') nextDay += interval;
  else if (unit === 'MONTHS') nextMonth += interval;
  else if (unit === 'YEARS' || unit === 'ERAS') nextYear += interval;
  while (nextMonth >= monthLengths.length && monthLengths.length > 0) {
    nextMonth -= monthLengths.length;
    nextYear += 1;
  }
  const monthLength = monthLengths[nextMonth] ?? 30;
  if (nextDay > monthLength) nextDay = monthLength;
  return { year: nextYear, month: nextMonth, day: nextDay };
}

function expandOccurrences(
  baseEvents: BaseEvent[],
  calendarsById: Map<string, CalendarRowForResolve>,
  campaignEpochMinute: bigint | null,
): Array<{
  occurrenceId: string;
  baseEventId: string;
  title: string;
  description: string | null;
  visibility: string;
  categoryId: string | null;
  prerequisiteBaseEventId: string | null;
  sourceType: string;
  start: {
    year: number | null;
    month: number | null;
    day: number | null;
    epochMinute: string | null;
  };
}> {
  const occurrences: Array<{
    occurrenceId: string;
    baseEventId: string;
    title: string;
    description: string | null;
    visibility: string;
    categoryId: string | null;
    prerequisiteBaseEventId: string | null;
    sourceType: string;
    start: {
      year: number | null;
      month: number | null;
      day: number | null;
      epochMinute: string | null;
    };
  }> = [];

  for (const event of baseEvents) {
    const calendarRow = calendarsById.get(event.calendarId);
    const limit = Math.min(event.limitRepetitions ?? MAX_GENERATED_PER_EVENT, MAX_GENERATED_PER_EVENT);
    let generatedForEvent = 0;
    const resolved = resolveEventStartCoordinates(event, calendarRow, campaignEpochMinute);
    let state = {
      year: resolved.year,
      month: resolved.month,
      day: resolved.day,
      epochMinute: resolved.epochMinute,
    };
    const maxIterations = event.isRepeating ? limit : 1;
    for (let i = 0; i < maxIterations; i += 1) {
      if (generatedForEvent >= MAX_GENERATED_PER_EVENT || occurrences.length >= MAX_GENERATED_TOTAL) {
        break;
      }
      const duration = Math.max(1, event.duration ?? 1);
      for (let dayOffset = 0; dayOffset < duration; dayOffset += 1) {
        if (occurrences.length >= MAX_GENERATED_TOTAL) break;
        const startCoords = advanceCalendarDate(
          calendarRow,
          state.year,
          state.month,
          state.day,
          dayOffset,
        );
        if (
          startCoords.year === null ||
          startCoords.month === null ||
          startCoords.day === null
        ) {
          continue;
        }
        occurrences.push({
          occurrenceId: `occ_${event.id}_${i}_${dayOffset}`,
          baseEventId: event.id,
          title: event.title,
          description: event.description,
          visibility: event.visibility,
          categoryId: event.categoryId,
          prerequisiteBaseEventId: event.prerequisiteId,
          sourceType: event.isRepeating ? 'REPEATING' : 'STATIC',
          start: {
            year: startCoords.year,
            month: startCoords.month,
            day: startCoords.day,
            epochMinute: state.epochMinute?.toString() ?? null,
          },
        });
      }
      generatedForEvent += 1;
      if (!event.isRepeating || !event.repeatUnit || !event.repeatInterval) break;
      const monthLengths =
        calendarRow && state.year !== null
          ? getMonthLengthsForYear(calendarRow, state.year)
          : [];
      const next = addRepeatUnit(
        state.year,
        state.month,
        state.day,
        event.repeatUnit,
        event.repeatInterval,
        monthLengths,
      );
      state = { ...state, year: next.year, month: next.month, day: next.day };
    }
  }
  return occurrences;
}

async function collectWorldAnchors(
  campaignId: string,
  canManage: boolean,
): Promise<CanonicalChronologyAnchor[]> {
  const [campaign, calendars, events] = await Promise.all([
    prisma.campaign.findUnique({
      where: { id: campaignId },
      select: { currentEpochMinute: true },
    }),
    prisma.fantasyCalendar.findMany({
      where: { campaignId },
      select: {
        id: true,
        epochOffset: true,
        weekdays: true,
        months: true,
        seasons: true,
        moons: true,
        leapDays: true,
      },
    }),
    prisma.calendarEvent.findMany({
      where: {
        calendar: { campaignId },
        ...chronologyVisibilityFilter(canManage),
      },
      select: {
        id: true,
        calendarId: true,
        categoryId: true,
        prerequisiteId: true,
        visibility: true,
        title: true,
        description: true,
        duration: true,
        isRepeating: true,
        repeatInterval: true,
        repeatUnit: true,
        limitRepetitions: true,
        targetYear: true,
        targetMonth: true,
        targetDay: true,
        targetEpochMinute: true,
      },
    }),
  ]);

  const calendarsById = new Map<string, CalendarRowForResolve>(
    calendars.map((row) => [row.id, row]),
  );
  const occurrences = expandOccurrences(
    events as BaseEvent[],
    calendarsById,
    campaign?.currentEpochMinute ?? null,
  );
  return occurrences.map((occ) => anchorFromTimelineOccurrence(occ));
}

async function collectSessionAnchors(
  campaignId: string,
): Promise<CanonicalChronologyAnchor[]> {
  const points = await (prisma as any).campaignSessionTimeline.findMany({
    where: { campaignId },
    orderBy: { sequenceOrder: 'asc' },
    select: {
      id: true,
      wikiPageId: true,
      sequenceOrder: true,
      wikiPage: { select: { title: true, metadata: true } },
      schedule: { select: { plannedStartAt: true } },
    },
  });

  return points.map(
    (row: {
      id: string;
      wikiPageId: string;
      sequenceOrder: number;
      wikiPage: { title: string; metadata: unknown };
      schedule: { plannedStartAt: Date | null } | null;
    }) => {
      const meta = parseSessionNoteMetadata(row.wikiPage.metadata);
      return anchorFromSessionTimelinePoint({
        timelinePointId: row.id,
        wikiPageId: row.wikiPageId,
        sequenceOrder: row.sequenceOrder,
        title: row.wikiPage.title,
        summary: null,
        fantasyEpochMinute: meta.fantasyEpochMinute ?? null,
        plannedStartAt: row.schedule?.plannedStartAt?.toISOString() ?? null,
      });
    },
  );
}

async function collectMapKeyframeAnchors(
  campaignId: string,
): Promise<CanonicalChronologyAnchor[]> {
  const keyframes = await prisma.mapObjectKeyframe.findMany({
    where: {
      sceneObject: { campaignId },
    },
    select: {
      id: true,
      effectiveEpochMinute: true,
      visibilityOverride: true,
      revelationOverride: true,
      sceneObject: {
        select: {
          id: true,
          label: true,
          mapAssetId: true,
        },
      },
    },
    take: CONVERGENCE_MAX_ENTRIES,
  });

  return keyframes.map((kf) =>
    anchorFromMapKeyframe({
      keyframeId: kf.id,
      sceneObjectId: kf.sceneObject.id,
      mapId: kf.sceneObject.mapAssetId,
      sceneId: kf.sceneObject.mapAssetId,
      objectLabel: kf.sceneObject.label,
      effectiveEpochMinute: kf.effectiveEpochMinute,
      visibilityOverride: kf.visibilityOverride,
      revelationOverride: kf.revelationOverride,
    }),
  );
}

async function collectFactionControlAnchors(
  campaignId: string,
): Promise<CanonicalChronologyAnchor[]> {
  const objects = await prisma.mapSceneObject.findMany({
    where: {
      campaignId,
      kind: { in: ['region', 'path'] },
    },
    select: {
      id: true,
      label: true,
      mapAssetId: true,
      style: true,
      visibleFromEpochMinute: true,
    },
    take: CONVERGENCE_MAX_ENTRIES,
  });

  const anchors: CanonicalChronologyAnchor[] = [];
  for (const obj of objects) {
    const overlay = parseMapObjectOverlayStyle(obj.style);
    if (!overlay.controllingOrgPageId && overlay.semanticRole !== 'political_border') {
      continue;
    }
    const epoch = obj.visibleFromEpochMinute;
    if (epoch === null) continue;
    anchors.push(
      anchorFromFactionControl({
        sceneObjectId: obj.id,
        mapId: obj.mapAssetId,
        orgPageId: overlay.controllingOrgPageId ?? null,
        controlKind: overlay.semanticRole === 'claim' ? 'claims' : 'occupies',
        objectLabel: obj.label,
        effectiveEpochMinute: epoch,
      }),
    );
  }
  return anchors;
}

async function collectOrgRelationAnchors(
  campaignId: string,
): Promise<CanonicalChronologyAnchor[]> {
  const orgPages = await prisma.wikiPage.findMany({
    where: {
      campaignId,
      ...buildCategoryIndexWhereClause('Organizations'),
    },
    select: {
      id: true,
      title: true,
      metadata: true,
    },
    take: 500,
  });

  const anchors: CanonicalChronologyAnchor[] = [];
  for (const page of orgPages) {
    if (!isOrganizationMetadataPresent(page.metadata)) continue;
    const org = parseOrganizationMetadata(page.metadata);
    for (const rel of org.relations) {
      for (const event of rel.history) {
        anchors.push(
          anchorFromOrgRelationEvent({
            orgPageId: page.id,
            orgTitle: page.title,
            targetOrgId: rel.targetOrgId,
            relationId: rel.id,
            eventId: event.id,
            effectiveDate: event.effectiveDate,
            relationType: event.relationType,
            stance: event.stance,
            visibility: event.visibility,
            sourceEventIds: event.sourceEventIds ?? [],
            note: event.note ?? null,
          }),
        );
      }
    }
  }
  return anchors;
}

async function collectWorldAdvanceAnchors(
  campaignId: string,
): Promise<CanonicalChronologyAnchor[]> {
  const category = await prisma.calendarEventCategory.findFirst({
    where: { campaignId, name: WORLD_ADVANCE_CATEGORY },
    select: { id: true },
  });
  if (!category) return [];

  const events = await prisma.calendarEvent.findMany({
    where: { categoryId: category.id },
    select: {
      id: true,
      description: true,
      targetEpochMinute: true,
    },
    take: 200,
    orderBy: { targetEpochMinute: 'desc' },
  });

  const anchors: CanonicalChronologyAnchor[] = [];
  for (const ev of events) {
    let payload = null;
    try {
      payload = parseWorldAdvanceBatchPayload(JSON.parse(ev.description ?? '{}'));
    } catch {
      payload = null;
    }
    if (!payload) continue;
    const synthesisHeadline = payload.synthesisProjection?.headline ?? null;
    for (const effect of payload.effects) {
      anchors.push(
        anchorFromWorldAdvanceEffect({
          chronologyEventId: ev.id,
          batchId: payload.batchId,
          effectId: effect.id,
          effectType: effect.type,
          projectionDomain: effect.domain,
          summary: `${effect.domain}: ${effect.type}`,
          targetEpochMinute: ev.targetEpochMinute ?? payload.nextEpochMinute,
          synthesisHeadline,
        }),
      );
    }
  }
  return anchors;
}

function domainEnabled(
  domains: ChronologyDomainKindValue[] | null,
  kind: ChronologyDomainKindValue,
): boolean {
  if (!domains) return true;
  return domains.includes(kind);
}

export async function buildConvergenceOverlay(
  input: BuildOverlayInput,
): Promise<ConvergenceOverlayBundle> {
  const canManage = canManageChronology(
    normalizeCampaignMemberRole(input.role),
    input.allowPlayerChronologyManagement,
  );
  const includeSuppressed = input.includeSuppressed && canManage;

  const [dateParts, campaign] = await Promise.all([
    resolveCampaignChronologyNow(input.campaignId),
    prisma.campaign.findUnique({
      where: { id: input.campaignId },
      select: { currentEpochMinute: true },
    }),
  ]);

  const viewerCtx: NarrativeViewerContext = buildNarrativeViewerContext({
    role: input.role,
    campaignNow: {
      epochMinute: campaign?.currentEpochMinute ?? 0n,
      dateParts,
    },
    allowPlayerChronologyManagement: input.allowPlayerChronologyManagement,
  });

  const anchors: CanonicalChronologyAnchor[] = [];
  const sourcesIncluded: ChronologyDomainKindValue[] = [];

  if (domainEnabled(input.domains, ChronologyDomainKind.WORLD_EVENT)) {
    anchors.push(...(await collectWorldAnchors(input.campaignId, canManage)));
    sourcesIncluded.push(ChronologyDomainKind.WORLD_EVENT);
  }
  if (domainEnabled(input.domains, ChronologyDomainKind.SESSION_CHRONICLE)) {
    anchors.push(...(await collectSessionAnchors(input.campaignId)));
    sourcesIncluded.push(ChronologyDomainKind.SESSION_CHRONICLE);
  }
  if (domainEnabled(input.domains, ChronologyDomainKind.MAP_KEYFRAME)) {
    anchors.push(...(await collectMapKeyframeAnchors(input.campaignId)));
    sourcesIncluded.push(ChronologyDomainKind.MAP_KEYFRAME);
  }
  if (domainEnabled(input.domains, ChronologyDomainKind.ORG_RELATION)) {
    anchors.push(...(await collectOrgRelationAnchors(input.campaignId)));
    sourcesIncluded.push(ChronologyDomainKind.ORG_RELATION);
  }
  if (domainEnabled(input.domains, ChronologyDomainKind.FACTION_CONTROL)) {
    anchors.push(...(await collectFactionControlAnchors(input.campaignId)));
    sourcesIncluded.push(ChronologyDomainKind.FACTION_CONTROL);
  }
  if (domainEnabled(input.domains, ChronologyDomainKind.WORLD_ADVANCE)) {
    anchors.push(...(await collectWorldAdvanceAnchors(input.campaignId)));
    sourcesIncluded.push(ChronologyDomainKind.WORLD_ADVANCE);
  }
  if (domainEnabled(input.domains, ChronologyDomainKind.DOWNTIME_PERIOD)) {
    anchors.push(...(await collectDowntimePeriodAnchors(input.campaignId)));
    sourcesIncluded.push(ChronologyDomainKind.DOWNTIME_PERIOD);
  }

  const sessionPoints = await (prisma as any).campaignSessionTimeline.findMany({
    where: { campaignId: input.campaignId },
    select: { id: true, sequenceOrder: true },
  });
  const sessionTimelinePointIds = new Set<string>(
    sessionPoints.map((p: { id: string }) => p.id),
  );
  const sessionSequenceByPointId = new Map<string, number>(
    sessionPoints.map((p: { id: string; sequenceOrder: number }) => [
      p.id,
      p.sequenceOrder,
    ]),
  );

  const entityIdsForPresence = new Set<string>();
  for (const a of anchors) {
    entityIdsForPresence.add(a.sourceEntityId);
  }

  const [timelinePresence, sessionPresence, mapPresence] = await Promise.all([
    getContentPresenceStateMap(
      input.campaignId,
      ContentPresenceEntityType.TIMELINE_EVENT,
      [...entityIdsForPresence],
    ),
    getContentPresenceStateMap(
      input.campaignId,
      ContentPresenceEntityType.SESSION_NOTE,
      [...entityIdsForPresence],
    ),
    getContentPresenceStateMap(
      input.campaignId,
      ContentPresenceEntityType.MAP_OBJECT,
      [...entityIdsForPresence],
    ),
  ]);

  const mergedPresence = new Map<string, import('../../../shared/contentPresence.js').ContentRevelationState>();
  for (const [k, v] of timelinePresence) mergedPresence.set(k, v);
  for (const [k, v] of sessionPresence) mergedPresence.set(k, v);
  for (const [k, v] of mapPresence) mergedPresence.set(k, v);

  const convergenceWikiPageIds: string[] = [];
  for (const anchor of anchors) {
    const payload = anchor.domainPayload;
    if (payload.domain === ChronologyDomainKind.ORG_RELATION) {
      convergenceWikiPageIds.push(payload.payload.orgPageId);
    } else if (payload.domain === ChronologyDomainKind.LORE_REFERENCE) {
      convergenceWikiPageIds.push(payload.payload.pageId);
    }
  }
  const wikiPathMap = await buildWikiPagePathMap(
    input.campaignId,
    input.campaignHandle,
    convergenceWikiPageIds,
  );
  const linkCtx = {
    campaignHandle: input.campaignHandle,
    resolveWikiPagePath: (pageId: string) => wikiPathMap.get(pageId) ?? null,
  };
  let entries: ConvergenceTimelineEntry[] = anchors.map((anchor) =>
    buildConvergenceEntry(anchor, viewerCtx, linkCtx, mergedPresence, {
      sessionTimelinePointIds,
      sessionSequenceByPointId,
    }),
  );

  entries = filterEntriesByWindow(entries, input.window);
  if (input.sessionLinkedOnly) {
    entries = filterEntriesSessionLinkedOnly(entries);
  }
  entries = filterEntriesByDomains(entries, input.domains);
  entries = filterEntriesForViewer(entries, includeSuppressed);
  entries = mergeAndSortEntries(entries);

  const capped = capConvergenceEntries(entries, CONVERGENCE_MAX_ENTRIES);
  entries = capped.entries;

  const resolvedDomains =
    input.domains ??
    ([
      ChronologyDomainKind.WORLD_EVENT,
      ChronologyDomainKind.SESSION_CHRONICLE,
      ChronologyDomainKind.DOWNTIME_PERIOD,
      ChronologyDomainKind.MAP_KEYFRAME,
      ChronologyDomainKind.ORG_RELATION,
    ] as ChronologyDomainKindValue[]);

  return {
    bundleVersion: CONVERGENCE_BUNDLE_VERSION,
    evaluatedAt: new Date().toISOString(),
    projectionContextHash: buildProjectionContextHash(viewerCtx),
    campaignNowEpochMinute: (campaign?.currentEpochMinute ?? 0n).toString(),
    viewerRole: input.role,
    window: input.window,
    domains: resolvedDomains,
    sourcesIncluded,
    entries,
    truncation: {
      capped: capped.capped,
      maxEntries: CONVERGENCE_MAX_ENTRIES,
      totalCollected: capped.totalCollected,
    },
  };
}
