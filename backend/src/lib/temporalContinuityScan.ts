import { prisma } from './prisma.js';
import type { ChronologyDateParts } from './entityRelationTypes.js';
import { parseCharacterLineageMetadata } from './characterLineageMetadata.js';
import { parseOrganizationMetadata } from './organizationMetadata.js';
import { parseSessionNoteMetadata } from './sessionNoteMetadata.js';
import {
  isEventLorePageId,
  parseBaseEventIdFromLorePageId,
} from './eventLoreWiki.js';
import { extractAllWikiTargetsFromBlock } from './wikiLinkExtract.js';
import {
  calendarRowToLike,
  resolveEventStartCoordinates,
  type CalendarRowForResolve,
} from './chronologyOccurrences.js';
import { convertEpochToCalendarState } from './timeEngine.js';
import {
  chronologyInstantFromParts,
  formatChronologyDateLabel,
} from '../../../shared/chronologyTypes.js';
import type {
  DatedContentLinkRef,
  TemporalCharacterBoundary,
  TemporalContinuityIndex,
  TemporalOrgBoundary,
} from './buildTemporalContinuityIssues.js';

type WikiPageRow = {
  id: string;
  title: string;
  metadata: unknown;
  blocks: unknown;
};

function epochToDateParts(
  epochMinute: string,
  calendar: CalendarRowForResolve,
): ChronologyDateParts | null {
  try {
    const state = convertEpochToCalendarState(
      BigInt(epochMinute),
      calendarRowToLike(calendar),
    );
    return { year: state.year, month: state.monthIndex, day: state.day };
  } catch {
    return null;
  }
}

function coordsToDateParts(coords: {
  year: number | null;
  month: number | null;
  day: number | null;
}): ChronologyDateParts | null {
  if (coords.year === null && coords.month === null && coords.day === null) {
    return null;
  }
  return { year: coords.year, month: coords.month, day: coords.day };
}

function dateLabel(parts: ChronologyDateParts): string | null {
  return formatChronologyDateLabel(chronologyInstantFromParts(parts));
}

function extractDatedLinksFromPage(
  page: WikiPageRow,
  contentDate: ChronologyDateParts,
): DatedContentLinkRef[] {
  const links: DatedContentLinkRef[] = [];
  const blocks = Array.isArray(page.blocks)
    ? (page.blocks as Array<Record<string, unknown>>)
    : [];
  const label = dateLabel(contentDate);

  for (const block of blocks) {
    const blockId = typeof block.id === 'string' ? block.id : undefined;
    for (const target of extractAllWikiTargetsFromBlock(block)) {
      if (!target.targetPageId || target.isBrokenStub) continue;
      links.push({
        sourcePageId: page.id,
        sourceTitle: page.title,
        contentDate,
        contentDateLabel: label,
        targetPageId: target.targetPageId,
        blockId,
      });
    }
  }

  return links;
}

function resolveSessionNoteDate(
  page: WikiPageRow,
  masterCalendar: CalendarRowForResolve | null,
): ChronologyDateParts | null {
  const meta = parseSessionNoteMetadata(page.metadata);
  if (!meta.fantasyEpochMinute?.trim() || !masterCalendar) return null;
  return epochToDateParts(meta.fantasyEpochMinute, masterCalendar);
}

async function loadEventDatesByBaseId(
  campaignId: string,
  baseEventIds: string[],
  calendarsById: Map<string, CalendarRowForResolve>,
  campaignEpochMinute: bigint,
): Promise<Map<string, ChronologyDateParts>> {
  const out = new Map<string, ChronologyDateParts>();
  if (baseEventIds.length === 0) return out;

  const events = await prisma.calendarEvent.findMany({
    where: {
      id: { in: baseEventIds },
      calendar: { campaignId },
    },
    select: {
      id: true,
      calendarId: true,
      targetYear: true,
      targetMonth: true,
      targetDay: true,
      targetEpochMinute: true,
    },
  });

  for (const event of events) {
    const calendarRow = calendarsById.get(event.calendarId);
    const coords = resolveEventStartCoordinates(
      event,
      calendarRow,
      campaignEpochMinute,
    );
    const parts = coordsToDateParts(coords);
    if (parts) out.set(event.id, parts);
  }

  return out;
}

export async function buildTemporalContinuityIndex(
  campaignId: string,
): Promise<TemporalContinuityIndex> {
  const campaign = await prisma.campaign.findUnique({
    where: { id: campaignId },
    select: {
      currentEpochMinute: true,
      fantasyCalendars: {
        orderBy: [{ isMasterTime: 'desc' }, { name: 'asc' }],
      },
    },
  });

  const calendarsById = new Map<string, CalendarRowForResolve>();
  for (const cal of campaign?.fantasyCalendars ?? []) {
    calendarsById.set(cal.id, {
      id: cal.id,
      epochOffset: cal.epochOffset,
      weekdays: cal.weekdays,
      months: cal.months,
      seasons: cal.seasons,
      moons: cal.moons,
      leapDays: cal.leapDays,
    });
  }

  const masterCalendar =
    campaign?.fantasyCalendars.find((c) => c.isMasterTime) ??
    campaign?.fantasyCalendars[0];
  const masterCalendarRow = masterCalendar
    ? calendarsById.get(masterCalendar.id) ?? null
    : null;

  const pages = await prisma.wikiPage.findMany({
    where: { campaignId, deletedAt: null },
    select: { id: true, title: true, metadata: true, blocks: true },
  });

  const characters = new Map<string, TemporalCharacterBoundary>();
  const orgs = new Map<string, TemporalOrgBoundary>();
  const datedLinks: DatedContentLinkRef[] = [];

  for (const page of pages) {
    const lineage = parseCharacterLineageMetadata(page.metadata);
    if (lineage.deathDate) {
      characters.set(page.id, {
        pageId: page.id,
        title: page.title,
        deathDate: lineage.deathDate,
      });
    }

    const org = parseOrganizationMetadata(page.metadata);
    if (
      org.organizationStatus === 'DISSOLVED' &&
      org.statusEffectiveDate
    ) {
      orgs.set(page.id, {
        pageId: page.id,
        title: page.title,
        statusEffectiveDate: org.statusEffectiveDate,
      });
    }
  }

  const eventBaseIds = pages
    .filter((p) => isEventLorePageId(p.id))
    .map((p) => parseBaseEventIdFromLorePageId(p.id))
    .filter((id): id is string => Boolean(id));

  const eventDates = await loadEventDatesByBaseId(
    campaignId,
    eventBaseIds,
    calendarsById,
    campaign?.currentEpochMinute ?? 0n,
  );

  for (const page of pages) {
    let contentDate: ChronologyDateParts | null = null;

    const sessionDate = resolveSessionNoteDate(page, masterCalendarRow);
    if (sessionDate) {
      contentDate = sessionDate;
    } else if (isEventLorePageId(page.id)) {
      const baseEventId = parseBaseEventIdFromLorePageId(page.id);
      if (baseEventId) {
        contentDate = eventDates.get(baseEventId) ?? null;
      }
    }

    if (!contentDate) continue;
    datedLinks.push(...extractDatedLinksFromPage(page, contentDate));
  }

  return { characters, orgs, datedLinks };
}
