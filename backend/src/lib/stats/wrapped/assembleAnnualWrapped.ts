import type { MetricId } from '../../../../../shared/metricRegistry.js';
import {
  metricUnavailable,
  metricValue,
  readMetricAmount,
  type MetricValue,
} from '../../../../../shared/metricValue.js';
import type { PersonalStatisticsResponse } from '../../../../../shared/statsTypes.js';
import {
  resolveEditionTier,
  selectWrappedSlideIds,
} from '../../../../../shared/wrapped/slideRegistry.js';
import type {
  WrappedCalculationV1,
  WrappedCoverageIndicator,
  WrappedCoverageStatus,
  WrappedTopCampaignSelectionReason,
} from '../../../../../shared/wrappedTypes.js';
import {
  WRAPPED_SCHEMA_VERSION,
  WRAPPED_WRITING_RELIABLE_FROM,
} from '../../../../../shared/wrappedTypes.js';
import { prisma } from '../../prisma.js';
import { resolveEffectiveTimezone } from '../../timezone.js';
import { getOrCreateSystemSettings } from '../../systemSettings.js';
import { queryPersonalStatistics } from '../personal/queryPersonalStatistics.js';
import { zonedParts, zonedTimeToUtc } from '../personal/zonedTime.js';
import { resolveWrappedEdition } from './editionState.js';

async function resolveReportingTimezone(userId: string): Promise<string> {
  const [user, settings] = await Promise.all([
    prisma.user.findUnique({
      where: { id: userId },
      select: { timezone: true },
    }),
    getOrCreateSystemSettings(),
  ]);
  return resolveEffectiveTimezone({
    userTimezone: user?.timezone ?? null,
    systemDefaultTimezone: settings.defaultTimezone,
  });
}

function metricFamilyFromPeriod(
  stats: PersonalStatisticsResponse,
  family: WrappedCoverageIndicator['family'],
): WrappedCoverageStatus {
  if (family === 'writing') {
    const words = stats.period['period.wordsAdded'];
    if (!words) return 'not_yet_tracked';
    if (words.status === 'unavailable') return words.reason;
    if (words.status === 'partial') return 'partial';
    if (words.status === 'estimated') return 'reconstructed';
    const viz = stats.visualizations?.heatmapDays;
    if (viz?.some((d) => d.completeness === 'partial')) return 'partial';
    return 'measured';
  }
  if (family === 'participation') {
    const row = stats.participation.find((p) => p.domain === 'sessionsAttended');
    if (!row) return 'not_yet_tracked';
    if (row.periodTotal.status === 'unavailable') return row.periodTotal.reason;
    return 'measured';
  }
  if (family === 'campaigns') {
    if (stats.activeCampaigns && stats.activeCampaigns.length > 0) return 'measured';
    const contributed = stats.period['attribution.campaignsContributedCount'];
    if (contributed && contributed.status !== 'unavailable') return 'measured';
    return 'not_yet_tracked';
  }
  if (family === 'worldbuilding') {
    const created = stats.period['period.pagesCreated'];
    if (!created) return 'not_yet_tracked';
    if (created.status === 'unavailable') return created.reason;
    return 'measured';
  }
  if (family === 'cartography') {
    const row = stats.cartography[0];
    if (!row) return 'not_yet_tracked';
    if (row.periodCreated.status === 'unavailable') return row.periodCreated.reason;
    return 'measured';
  }
  if (family === 'chronology') {
    const row = stats.chronology[0];
    if (!row) return 'not_yet_tracked';
    if (row.periodCreated.status === 'unavailable') return row.periodCreated.reason;
    return 'measured';
  }
  return 'unavailable';
}

function buildCoverage(
  stats: PersonalStatisticsResponse,
  sharedStatus: WrappedCoverageStatus,
  comparativeStatus: WrappedCoverageStatus,
  year: number,
): WrappedCoverageIndicator[] {
  const writing = metricFamilyFromPeriod(stats, 'writing');
  const writingFloorYear = Number(WRAPPED_WRITING_RELIABLE_FROM.slice(0, 4));
  const writingNote =
    year <= writingFloorYear && writing !== 'unavailable'
      ? `Writing coverage is partial for ${year}; reliable measured writing begins ${WRAPPED_WRITING_RELIABLE_FROM}.`
      : undefined;

  return [
    { family: 'writing', status: writing === 'measured' && year === writingFloorYear ? 'partial' : writing, note: writingNote },
    { family: 'worldbuilding', status: metricFamilyFromPeriod(stats, 'worldbuilding') },
    { family: 'cartography', status: metricFamilyFromPeriod(stats, 'cartography') },
    { family: 'chronology', status: metricFamilyFromPeriod(stats, 'chronology') },
    { family: 'participation', status: metricFamilyFromPeriod(stats, 'participation') },
    { family: 'campaigns', status: metricFamilyFromPeriod(stats, 'campaigns') },
    { family: 'sharedAttendance', status: sharedStatus },
    { family: 'comparative', status: comparativeStatus },
  ];
}

function pickParticipation(
  stats: PersonalStatisticsResponse,
): WrappedCalculationV1['metrics']['participation'] {
  const find = (domain: string) =>
    stats.participation.find((p) => p.domain === domain)?.periodTotal ??
    metricUnavailable('not_yet_tracked');
  return {
    sessionsAttended: find('sessionsAttended'),
    sessionsHosted: find('sessionsHosted'),
    campaignsParticipated: find('campaignsParticipated'),
  };
}

function topFromActiveCampaigns(
  stats: PersonalStatisticsResponse,
): WrappedTopCampaignSelectionReason | null {
  const top = stats.activeCampaigns?.[0];
  if (!top || top.contributions <= 0) return null;
  return {
    campaignId: top.id,
    activeDays: top.activeDays,
    contributions: top.contributions,
    pagesTouched: top.pagesTouched,
    ranking: 'active_campaigns_v1',
  };
}

function byCampaignFromActive(
  stats: PersonalStatisticsResponse,
): WrappedCalculationV1['metrics']['byCampaign'] {
  const out: WrappedCalculationV1['metrics']['byCampaign'] = {};
  for (const row of stats.activeCampaigns ?? []) {
    out[row.id] = {
      activeDays: row.activeDays,
      contributions: row.contributions,
      pagesTouched: row.pagesTouched,
    };
  }
  return out;
}

function monthlyFromVisualizations(
  stats: PersonalStatisticsResponse,
): WrappedCalculationV1['monthlyActivity'] {
  const days = stats.visualizations?.heatmapDays ?? [];
  const byMonth = new Map<number, { activeDays: number; contributions: number }>();
  for (let m = 1; m <= 12; m += 1) {
    byMonth.set(m, { activeDays: 0, contributions: 0 });
  }
  for (const day of days) {
    const month = Number(day.date.slice(5, 7));
    if (!Number.isFinite(month) || month < 1 || month > 12) continue;
    const bucket = byMonth.get(month)!;
    const active =
      day.wordsAdded > 0 ||
      day.wordsRemoved > 0 ||
      day.sessionCount > 0 ||
      day.sessionMinutes > 0;
    if (active) bucket.activeDays += 1;
    bucket.contributions += day.sessionCount + (day.wordsAdded > 0 ? 1 : 0);
  }
  return [...byMonth.entries()].map(([month, v]) => ({ month, ...v }));
}

function biggestMonthFrom(
  monthly: WrappedCalculationV1['monthlyActivity'],
): WrappedCalculationV1['biggestMonth'] {
  let best: WrappedCalculationV1['biggestMonth'] = null;
  for (const row of monthly) {
    if (row.activeDays <= 0 && row.contributions <= 0) continue;
    if (
      !best ||
      row.activeDays > best.activeDays ||
      (row.activeDays === best.activeDays && row.contributions > best.contributions) ||
      (row.activeDays === best.activeDays &&
        row.contributions === best.contributions &&
        row.month < best.month)
    ) {
      best = row;
    }
  }
  return best;
}

function deltaMetric(current: MetricValue | undefined, previous: MetricValue | undefined): MetricValue {
  const a = readMetricAmount(current);
  const b = readMetricAmount(previous);
  if (a == null || b == null) return metricUnavailable('insufficient_data');
  return metricValue(a - b);
}

const COMPARATIVE_METRIC_IDS: MetricId[] = [
  'period.wordsAdded',
  'period.pagesCreated',
  'period.pagesEdited',
];

/**
 * Count distinct other users who also ATTENDING the same COMPLETED sessions
 * the subject attended in the year window. Membership alone does not count.
 */
export async function assembleFellowAdventurers(input: {
  userId: string;
  campaignIds: string[];
  rangeStart: Date;
  rangeEnd: Date;
}): Promise<{
  fellowAdventurerCount: MetricValue;
  sessionsWithOthers: MetricValue;
  coverage: WrappedCoverageStatus;
}> {
  if (input.campaignIds.length === 0) {
    return {
      fellowAdventurerCount: metricUnavailable('not_yet_tracked'),
      sessionsWithOthers: metricUnavailable('not_yet_tracked'),
      coverage: 'not_yet_tracked',
    };
  }

  const myAttendance = await prisma.sessionAttendance.findMany({
    where: {
      userId: input.userId,
      status: 'ATTENDING',
      timelinePoint: {
        campaignId: { in: input.campaignIds },
        schedule: {
          status: 'COMPLETED',
          plannedStartAt: { gte: input.rangeStart, lt: input.rangeEnd },
        },
      },
    },
    select: { timelinePointId: true },
  });

  if (myAttendance.length === 0) {
    return {
      fellowAdventurerCount: metricValue(0),
      sessionsWithOthers: metricValue(0),
      coverage: 'measured',
    };
  }

  const pointIds = myAttendance.map((r) => r.timelinePointId);
  const others = await prisma.sessionAttendance.findMany({
    where: {
      timelinePointId: { in: pointIds },
      status: 'ATTENDING',
      userId: { not: input.userId },
    },
    select: { userId: true, timelinePointId: true },
  });

  const fellowIds = new Set(others.map((r) => r.userId));
  const sessionsWithOthers = new Set(others.map((r) => r.timelinePointId));

  return {
    fellowAdventurerCount: metricValue(fellowIds.size),
    sessionsWithOthers: metricValue(sessionsWithOthers.size),
    coverage: 'measured',
  };
}

export async function assembleAnnualWrapped(input: {
  userId: string;
  year: number;
  now?: Date;
}): Promise<WrappedCalculationV1> {
  const now = input.now ?? new Date();
  const timeZone = await resolveReportingTimezone(input.userId);
  const edition = resolveWrappedEdition({ year: input.year, timeZone, now });
  const yearStr = String(input.year);

  const [stats, previousStats] = await Promise.all([
    queryPersonalStatistics({
      userId: input.userId,
      viewerId: input.userId,
      visibility: 'owner',
      range: { mode: 'year', from: yearStr },
      includeHabits: true,
      includeVisualizations: true,
      now,
    }),
    input.year > 2000
      ? queryPersonalStatistics({
          userId: input.userId,
          viewerId: input.userId,
          visibility: 'owner',
          range: { mode: 'year', from: String(input.year - 1) },
          includeHabits: true,
          includeVisualizations: false,
          now,
        }).catch(() => null)
      : Promise.resolve(null),
  ]);

  const rangeStart = zonedTimeToUtc(timeZone, input.year, 1, 1);
  const rangeEndExclusive = zonedTimeToUtc(timeZone, input.year + 1, 1, 1);
  const rangeEnd = now < rangeEndExclusive ? now : rangeEndExclusive;

  const campaignIds = [
    ...new Set([
      ...(stats.activeCampaigns ?? []).map((c) => c.id),
      ...stats.linkableCampaigns.map((c) => c.id),
    ]),
  ];

  // Prefer membership-scoped campaigns from the stats query via active + linkable.
  // For fellow adventurers, use all owner-scoped campaign ids from byCampaign + memberships.
  const membershipCampaignIds =
    campaignIds.length > 0
      ? campaignIds
      : (
          await prisma.campaignMember.findMany({
            where: { userId: input.userId, campaign: { archivedAt: null } },
            select: { campaignId: true },
          })
        ).map((r) => r.campaignId);

  const fellows = await assembleFellowAdventurers({
    userId: input.userId,
    campaignIds: membershipCampaignIds,
    rangeStart,
    rangeEnd,
  });

  const byCampaign = byCampaignFromActive(stats);
  const topCampaign = topFromActiveCampaigns(stats);
  const monthlyActivity = monthlyFromVisualizations(stats);
  const biggestMonth = biggestMonthFrom(monthlyActivity);

  const previousEligible = previousStats != null && (
    (previousStats.activeCampaigns?.length ?? 0) > 0 ||
    readMetricAmount(previousStats.period['period.wordsAdded']) != null ||
    readMetricAmount(
      previousStats.participation.find((p) => p.domain === 'sessionsAttended')?.periodTotal,
    ) != null
  );

  const deltas: Partial<Record<MetricId, MetricValue>> = {};
  if (previousStats && previousEligible) {
    for (const id of COMPARATIVE_METRIC_IDS) {
      deltas[id] = deltaMetric(stats.period[id], previousStats.period[id]);
    }
  }

  const comparativeCoverage: WrappedCoverageStatus = previousEligible
    ? 'measured'
    : 'unavailable';

  const coverage = buildCoverage(stats, fellows.coverage, comparativeCoverage, input.year);
  const writingFloorYear = Number(WRAPPED_WRITING_RELIABLE_FROM.slice(0, 4));
  const isPartialYearWriting = input.year <= writingFloorYear;

  const draft: WrappedCalculationV1 = {
    schemaVersion: WRAPPED_SCHEMA_VERSION,
    year: input.year,
    timeZone,
    generatedAt: now.toISOString(),
    edition,
    slideIds: [],
    editionTier: 'unavailable',
    coverage,
    coverageDisclosure: {
      writingReliableFrom: isPartialYearWriting ? WRAPPED_WRITING_RELIABLE_FROM : null,
      isPartialYearWriting,
    },
    metrics: {
      personal: { ...stats.period },
      byCampaign,
      participation: pickParticipation(stats),
      shared: {
        fellowAdventurerCount: fellows.fellowAdventurerCount,
        sessionsWithOthers: fellows.sessionsWithOthers,
      },
      comparative: {
        previousYear: previousEligible ? input.year - 1 : null,
        previousEligible,
        deltas,
      },
    },
    topCampaign,
    referencedCampaignIds: Object.keys(byCampaign),
    archetypes: stats.archetypes
      ? {
          dominantId: stats.archetypes.dominantId,
          scores: stats.archetypes.scores.map((s) => ({
            id: s.id,
            score: s.score,
          })),
        }
      : null,
    biggestMonth,
    monthlyActivity,
  };

  const slideIds = selectWrappedSlideIds(draft);
  draft.slideIds = slideIds;
  draft.editionTier = resolveEditionTier(slideIds.length);

  // Ensure local civil year metadata is consistent with timezone.
  void zonedParts(now, timeZone);

  return draft;
}

export function isWrappedYearEligible(calc: WrappedCalculationV1): boolean {
  return calc.editionTier !== 'unavailable';
}
