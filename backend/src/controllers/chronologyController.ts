import type { Response } from 'express';
import { prisma } from '../lib/prisma.js';
import type { CampaignScopedRequest } from '../middleware/campaignScope.js';
import { canManageChronology } from '../lib/acl.js';
import { chronologyCanView, chronologyElevated } from '../lib/chronologyAccess.js';
import { ensureChronologyEras, listChronologyEras, eraMatchesMinute } from '../lib/chronologyEraService.js';
import { calendarEpochMinuteForDate } from '../lib/timeEngine.js';
import { type EraHistory } from '../lib/eraOccurrenceHistory.js';
import { chronologyVisibilityFilter } from '../lib/chronologyVisibility.js';
import { type CalendarRowForResolve } from '../lib/chronologyOccurrences.js';
import { getContentPresenceStateMap } from '../lib/contentPresenceService.js';
import { resolveCampaignChronologyNow } from '../lib/chronologyDefaults.js';
import { ContentPresenceEntityType } from '../../../shared/contentPresence.js';
import {
  buildNarrativeViewerContext,
  isTimelineEventVisible,
  projectTimelineEventVisibility,
} from '../../../shared/narrativeProjection.js';
import { parseDomainsQuery } from '../../../shared/chronologyConvergence.js';
import { buildConvergenceOverlay } from '../lib/chronologyConvergenceService.js';
import { buildCampaignNarrativeFeed } from '../lib/campaignNarrativeFeed.js';
import type { FeedImportance } from '../../../shared/campaignFeed.js';

import { buildOccurrences, type BaseEvent, MAX_GENERATED_PER_EVENT, MAX_GENERATED_TOTAL } from '../lib/buildChronologyOccurrences.js';

function extractHashtags(value: string | null): string[] {
  if (!value) return [];
  const matches = value.match(/#[a-z0-9][a-z0-9-_]*/gi) ?? [];
  return Array.from(new Set(matches.map((tag) => tag.toLowerCase())));
}

export async function getChronologyTimelineBundle(
  req: CampaignScopedRequest,
  res: Response,
): Promise<void> {
  const campaignId = req.campaign!.campaignId;
  const canManage = canManageChronology(
    req.campaign?.role ?? null,
    req.campaign?.allowPlayerChronologyManagement ?? false,
  );

  const windowMode = String(req.query.windowMode ?? 'YEAR_RANGE');
  const from = String(req.query.from ?? '0');
  const to = String(req.query.to ?? '9999');

  const [campaign, calendars, categories, events] = await Promise.all([
    prisma.campaign.findUnique({
      where: { id: campaignId },
      select: { currentEpochMinute: true },
    }),
    prisma.fantasyCalendar.findMany({
      where: { campaignId },
      orderBy: [{ isMasterTime: 'desc' }, { name: 'asc' }, { id: 'asc' }],
      select: {
        id: true,
        name: true,
        isMasterTime: true,
        epochOffset: true,
        weekdays: true,
        months: true,
        seasons: true,
        moons: true,
        leapDays: true,
      },
    }),
    prisma.calendarEventCategory.findMany({
      where: { campaignId },
      orderBy: [{ name: 'asc' }, { id: 'asc' }],
      select: {
        id: true,
        campaignId: true,
        name: true,
        color: true,
      },
    }),
    prisma.calendarEvent.findMany({
      where: {
        calendar: { campaignId },
        ...chronologyVisibilityFilter(chronologyElevated(req.campaign!)),
      },
      orderBy: [
        { targetEpochMinute: 'asc' },
        { targetYear: 'asc' },
        { targetMonth: 'asc' },
        { targetDay: 'asc' },
        { createdAt: 'asc' },
        { id: 'asc' },
      ],
      select: {
        id: true,
        calendarId: true,
        categoryId: true,
        prerequisiteId: true,
        visibility: true,
        importance: true,
        duration: true,
        isRepeating: true,
        repeatInterval: true,
        repeatUnit: true,
        limitRepetitions: true,
        conditions: true,
        moonOverrides: true,
        title: true,
        description: true,
        isRecurring: true,
        targetYear: true,
        targetMonth: true,
        targetDay: true,
        targetEpochMinute: true,
        recurrenceRule: true,
        createdAt: true,
        updatedAt: true,
      },
    }),
  ]);

  const chronologyPresenceState = await getContentPresenceStateMap(
    campaignId,
    ContentPresenceEntityType.TIMELINE_EVENT,
    events.map((event) => event.id),
  );
  const dateParts = await resolveCampaignChronologyNow(campaignId);
  const viewerCtx = buildNarrativeViewerContext({
    role: req.campaign?.role ?? null,
    campaignNow: {
      epochMinute: campaign?.currentEpochMinute ?? 0n,
      dateParts,
    },
    allowPlayerChronologyManagement:
      req.campaign?.allowPlayerChronologyManagement ?? false,
  });
  const visibleEvents = chronologyElevated(req.campaign!)
    ? events
    : events.filter((event) =>
        chronologyCanView(req.campaign!, event.visibility) && isTimelineEventVisible(
          projectTimelineEventVisibility(
            event.id,
            event.visibility,
            chronologyPresenceState,
            viewerCtx,
          ),
        ),
      );

  const visibleIds = new Set(visibleEvents.map(event => event.id));
  for (const event of visibleEvents) {
    if (event.prerequisiteId && !visibleIds.has(event.prerequisiteId)) event.prerequisiteId = null;
  }
  const baseEvents = visibleEvents.map((event) => ({
    ...event,
    targetEpochMinute: event.targetEpochMinute?.toString() ?? null,
    createdAt: event.createdAt.toISOString(),
    updatedAt: event.updatedAt.toISOString(),
    tags: Array.from(
      new Set([
        ...extractHashtags(event.title),
        ...extractHashtags(event.description),
      ]),
    ),
  }));

  const calendarsById = new Map<string, CalendarRowForResolve>(
    calendars.map((row) => [row.id, row]),
  );
  const campaignEpochMinute = campaign?.currentEpochMinute ?? null;
  await ensureChronologyEras(campaignId);
  const structuralEras = await prisma.campaignEra.findMany({ where: { campaignId } });
  const expanded = buildOccurrences(
    visibleEvents as BaseEvent[],
    calendarsById,
    campaignEpochMinute,
    structuralEras,
    ((await prisma.campaignMomentum.findUnique({ where: { campaignId }, select: { eraRecurrenceHistory: true } }))?.eraRecurrenceHistory ?? {}) as EraHistory,
  );

  const eras = await listChronologyEras(req.campaign!);
  for (const occurrence of expanded.occurrences) {
    const start = occurrence.start as { year: number | null; month: number | null; day: number | null; epochMinute: string | null };
    const track = calendarsById.get(String(occurrence.calendarId));
    const minute = start.epochMinute != null ? BigInt(start.epochMinute)
      : track && start.year != null && start.month != null && start.day != null ? calendarEpochMinuteForDate(track, start.year, start.month, start.day) : null;
    const matchingIds = new Set(structuralEras.filter(era => era.calendarId === occurrence.calendarId && minute != null && eraMatchesMinute(era, minute)).map(era => era.id));
    const matchingEras = eras.filter(era => matchingIds.has(era.id));
    occurrence.eraIds = matchingEras.map(era => era.id);
    occurrence.eraNames = matchingEras.map(era => `${era.name}${era.visibility === 'DM_ONLY' ? ' [DM]' : ''}`);
  }
  res.json({
    eras,
    calendars: calendars.map(({ id, name, isMasterTime }) => ({
      id,
      name,
      isMasterTime,
    })),
    categories,
    baseEvents,
    occurrences: expanded.occurrences,
    events: expanded.occurrences,
    expansionMetadata: {
      window: {
        mode: windowMode,
        from,
        to,
      },
      limits: {
        maxGeneratedPerBaseEvent: MAX_GENERATED_PER_EVENT,
        maxGeneratedTotal: MAX_GENERATED_TOTAL,
      },
      generated: {
        totalOccurrences: expanded.occurrences.length,
        totalBaseEventsConsidered: visibleEvents.length,
        truncated: expanded.truncatedBaseEventIds.length > 0,
        truncatedBaseEventIds: expanded.truncatedBaseEventIds,
      },
      warnings: expanded.warnings,
      evaluationVersion: 'v1',
    },
  });
}

export async function getChronologyOverlayBundle(
  req: CampaignScopedRequest,
  res: Response,
): Promise<void> {
  if (req.query.order !== undefined || req.query.importance !== undefined || req.query.includeFuture !== undefined) {
    const order = req.query.order ?? 'desc';
    const importance = req.query.importance === undefined ? ['MAJOR', 'MINOR', 'NOTICE'] : String(req.query.importance).split(',').filter(Boolean);
    if (!['asc', 'desc'].includes(String(order)) || importance.some(value => !['MAJOR', 'MINOR', 'NOTICE'].includes(value))
      || (req.query.includeFuture !== undefined && !['true', 'false'].includes(String(req.query.includeFuture)))) {
      res.status(400).json({ error: 'Invalid campaign feed filters.' }); return;
    }
    try {
      res.json(await buildCampaignNarrativeFeed(req.campaign!, {
        order: order as 'asc' | 'desc', importance: importance as FeedImportance[], includeFuture: req.query.includeFuture === 'true',
        from: req.query.from === undefined ? undefined : String(req.query.from), to: req.query.to === undefined ? undefined : String(req.query.to),
        domains: req.query.domains === undefined ? null : String(req.query.domains) === '' ? [] : parseDomainsQuery(String(req.query.domains)), sessionLinkedOnly: req.query.sessionLinkedOnly === 'true',
      }));
    } catch (error) {
      if (error instanceof Error && error.message === 'INVALID_FEED_RANGE') res.status(400).json({ error: 'Choose a valid half-open epoch range.' });
      else throw error;
    }
    return;
  }
  const campaignId = req.campaign!.campaignId;
  const campaignHandle =
    req.campaign!.campaignHandle ??
    String(req.params.campaignHandle ?? req.params.campaignId ?? '');
  const canManage = canManageChronology(
    req.campaign?.role ?? null,
    req.campaign?.allowPlayerChronologyManagement ?? false,
  );

  const windowMode = String(req.query.windowMode ?? 'YEAR_RANGE');
  const from = String(req.query.from ?? '0');
  const to = String(req.query.to ?? '9999');
  const sessionLinkedOnly = req.query.sessionLinkedOnly === 'true';
  const includeSuppressed =
    canManage && req.query.includeSuppressed === 'true';
  const domains = parseDomainsQuery(
    typeof req.query.domains === 'string' ? req.query.domains : undefined,
  );

  const bundle = await buildConvergenceOverlay({
    campaignId,
    campaignHandle,
    elevatedNarrativeView: chronologyElevated(req.campaign!),
    role: req.campaign?.role ?? null,
    allowPlayerChronologyManagement:
      req.campaign?.allowPlayerChronologyManagement ?? false,
    window: { mode: windowMode, from, to },
    domains,
    sessionLinkedOnly,
    includeSuppressed,
  });

  res.json(bundle);
}
