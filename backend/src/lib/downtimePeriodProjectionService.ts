import { SnapshotKind } from '../../../shared/narrativeSnapshots.js';
import {
  anchorFromDowntimePeriod,
  type CanonicalChronologyAnchor,
  type ChronologyDateParts,
} from '../../../shared/chronologyTypes.js';
import {
  deriveDowntimePeriodGapsFromSessionEpochs,
  formatDowntimePeriodRollupHeadline,
  formatDowntimePeriodTitle,
  type DowntimePeriodEnrichmentCounts,
  type DowntimePeriodGapBounds,
} from '../../../shared/downtimePeriodProjection.js';
import type { DowntimeCurrentPeriod } from '../../../shared/downtimeHub.js';
import {
  chronologyInstantFromParts,
  formatChronologyRangeDateLabel,
} from '../../../shared/chronologyTypes.js';
import {
  calendarRowToLike,
  type CalendarRowForResolve,
} from './chronologyOccurrences.js';
import { parseSessionNoteMetadata } from './sessionNoteMetadata.js';
import { prisma } from './prisma.js';
import { convertEpochToCalendarState } from './timeEngine.js';
import { buildMergedGapAnnotations } from './downtimeAnnotationDerivation.js';
import { loadDowntimeGapOverlays } from './downtimeGapOverlays.js';

function epochToDateParts(
  epochMinute: string,
  calendar: CalendarRowForResolve | null,
): ChronologyDateParts | null {
  if (!calendar) return null;
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

async function loadMasterCalendar(
  campaignId: string,
): Promise<CalendarRowForResolve | null> {
  const calendar = await prisma.fantasyCalendar.findFirst({
    where: { campaignId, isMasterTime: true },
    select: {
      id: true,
      epochOffset: true,
      weekdays: true,
      months: true,
      seasons: true,
      moons: true,
      leapDays: true,
    },
  });
  if (calendar) return calendar;
  const fallback = await prisma.fantasyCalendar.findFirst({
    where: { campaignId },
    orderBy: { name: 'asc' },
    select: {
      id: true,
      epochOffset: true,
      weekdays: true,
      months: true,
      seasons: true,
      moons: true,
      leapDays: true,
    },
  });
  return fallback;
}

async function loadFallbackStartEpochMinute(
  campaignId: string,
): Promise<string | null> {
  const snapshot = await prisma.narrativeStateSnapshot.findFirst({
    where: {
      campaignId,
      kind: {
        in: [
          SnapshotKind.MILESTONE,
          SnapshotKind.PARTY_VISIT,
          SnapshotKind.MANUAL,
        ],
      },
    },
    orderBy: { capturedAtEpochMinute: 'desc' },
    select: { capturedAtEpochMinute: true },
  });
  return snapshot?.capturedAtEpochMinute?.toString() ?? null;
}

async function loadSessionEpochs(campaignId: string): Promise<
  Array<{
    timelinePointId: string;
    sequenceOrder: number;
    epochMinute: string;
  }>
> {
  const points = await (prisma as any).campaignSessionTimeline.findMany({
    where: { campaignId },
    orderBy: { sequenceOrder: 'asc' },
    select: {
      id: true,
      sequenceOrder: true,
      wikiPage: { select: { metadata: true } },
    },
  });

  const sessions: Array<{
    timelinePointId: string;
    sequenceOrder: number;
    epochMinute: string;
  }> = [];

  for (const row of points as Array<{
    id: string;
    sequenceOrder: number;
    wikiPage: { metadata: unknown };
  }>) {
    const meta = parseSessionNoteMetadata(row.wikiPage.metadata);
    if (!meta.fantasyEpochMinute?.trim()) continue;
    sessions.push({
      timelinePointId: row.id,
      sequenceOrder: row.sequenceOrder,
      epochMinute: meta.fantasyEpochMinute.trim(),
    });
  }

  return sessions;
}

async function enrichGapCounts(
  campaignId: string,
  gap: DowntimePeriodGapBounds,
): Promise<DowntimePeriodEnrichmentCounts> {
  const start = BigInt(gap.startEpochMinute);
  const end = BigInt(gap.endEpochMinute);

  const [advanceRunCount, projectCompletions, projectFailures] = await Promise.all([
    prisma.timeAdvanceSimulationRun.count({
      where: {
        campaignId,
        nextEpochMinute: { gt: start, lte: end },
      },
    }),
    prisma.downtimeProject.count({
      where: {
        campaignId,
        status: 'COMPLETED',
        completedAtEpochMinute: { gt: start, lte: end },
      },
    }),
    prisma.downtimeProject.count({
      where: {
        campaignId,
        status: 'FAILED',
        completedAtEpochMinute: { gt: start, lte: end },
      },
    }),
  ]);

  return { advanceRunCount, projectCompletions, projectFailures };
}

export async function deriveDowntimePeriodGaps(
  campaignId: string,
): Promise<DowntimePeriodGapBounds[]> {
  const [campaign, sessions, fallbackStart] = await Promise.all([
    prisma.campaign.findUnique({
      where: { id: campaignId },
      select: { currentEpochMinute: true },
    }),
    loadSessionEpochs(campaignId),
    loadFallbackStartEpochMinute(campaignId),
  ]);

  const currentEpochMinute = (campaign?.currentEpochMinute ?? 0n).toString();

  return deriveDowntimePeriodGapsFromSessionEpochs({
    sessionEpochs: sessions,
    fallbackStartEpochMinute: fallbackStart,
    currentEpochMinute,
  });
}

export async function collectDowntimePeriodAnchors(
  campaignId: string,
): Promise<CanonicalChronologyAnchor[]> {
  const [gaps, masterCalendar, gapOverlays] = await Promise.all([
    deriveDowntimePeriodGaps(campaignId),
    loadMasterCalendar(campaignId),
    loadDowntimeGapOverlays(campaignId),
  ]);

  const anchors: CanonicalChronologyAnchor[] = [];

  for (const gap of gaps) {
    const counts = await enrichGapCounts(campaignId, gap);
    const startDateParts = epochToDateParts(gap.startEpochMinute, masterCalendar);
    const endDateParts = epochToDateParts(gap.endEpochMinute, masterCalendar);
    const rollupHeadline = formatDowntimePeriodRollupHeadline({
      isOpen: gap.isOpen,
      startEpochMinute: gap.startEpochMinute,
      endEpochMinute: gap.endEpochMinute,
      counts,
    });
    const title = formatDowntimePeriodTitle({
      isOpen: gap.isOpen,
      startEpochMinute: gap.startEpochMinute,
      endEpochMinute: gap.endEpochMinute,
      promotedLabel: gapOverlays[gap.gapId]?.promotedLabel,
    });

    const merged = await buildMergedGapAnnotations({
      campaignId,
      gap,
      startDateParts,
      endDateParts,
      overlay: gapOverlays[gap.gapId] ?? null,
    });

    anchors.push(
      anchorFromDowntimePeriod({
        gapId: gap.gapId,
        startEpochMinute: gap.startEpochMinute,
        endEpochMinute: gap.endEpochMinute,
        startDateParts,
        endDateParts,
        title,
        summary: rollupHeadline,
        sessionBeforeId: gap.sessionBeforeId,
        sessionAfterId: gap.sessionAfterId,
        sessionBeforeSequenceOrder: gap.sessionBeforeSequenceOrder,
        isOpen: gap.isOpen,
        advanceRunCount: counts.advanceRunCount,
        projectCompletions: counts.projectCompletions,
        projectFailures: counts.projectFailures,
        rollupHeadline,
        promotedLabel: merged.promotedLabel,
        annotations:
          merged.annotations.length > 0 ? merged.annotations : undefined,
        locationMentions:
          merged.locationMentions.length > 0 ? merged.locationMentions : undefined,
      }),
    );
  }

  return anchors;
}

export async function resolveCurrentDowntimePeriodGap(
  campaignId: string,
): Promise<DowntimePeriodGapBounds | null> {
  const gaps = await deriveDowntimePeriodGaps(campaignId);
  const open = gaps.filter((gap) => gap.isOpen);
  if (open.length === 0) return null;
  return open[open.length - 1] ?? null;
}

export async function buildCurrentDowntimePeriodPresentation(input: {
  campaignId: string;
  campaignHandle: string;
}): Promise<DowntimeCurrentPeriod | null> {
  const [gap, masterCalendar] = await Promise.all([
    resolveCurrentDowntimePeriodGap(input.campaignId),
    loadMasterCalendar(input.campaignId),
  ]);
  if (!gap) return null;

  const counts = await enrichGapCounts(input.campaignId, gap);
  const startDateParts = epochToDateParts(gap.startEpochMinute, masterCalendar);
  const endDateParts = epochToDateParts(gap.endEpochMinute, masterCalendar);
  const spanLabel = formatChronologyRangeDateLabel({
    start: chronologyInstantFromParts(startDateParts, gap.startEpochMinute),
    end: chronologyInstantFromParts(endDateParts, gap.endEpochMinute),
  });

  const rollupHeadline = formatDowntimePeriodRollupHeadline({
    isOpen: gap.isOpen,
    startEpochMinute: gap.startEpochMinute,
    endEpochMinute: gap.endEpochMinute,
    counts,
  });

  return {
    title: formatDowntimePeriodTitle({
      isOpen: gap.isOpen,
      startEpochMinute: gap.startEpochMinute,
      endEpochMinute: gap.endEpochMinute,
    }),
    spanLabel,
    rollupHeadline,
    isOpen: gap.isOpen,
    advanceRunCount: counts.advanceRunCount,
    projectCompletions: counts.projectCompletions,
    projectFailures: counts.projectFailures,
    chronologyFeedHref: `/campaigns/${input.campaignHandle}/chronology?view=feed&domains=downtime_period`,
  };
}
