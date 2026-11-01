import { prisma } from '../../prisma.js';
import { getOrCreateSystemSettings } from '../../systemSettings.js';
import { resolveEffectiveTimezone } from '../../timezone.js';
import { NarrativeEventType } from '../../narrativeEventService.js';
import { filterMetricsByPrivacy } from '../../../../../shared/metricRegistry.js';
import {
  metricPartial,
  metricUnavailable,
  metricValue,
} from '../../../../../shared/metricValue.js';
import type {
  CreatorAttributionResponse,
  PersonalStatisticsRangeMode,
  PersonalStatisticsResponse,
  PersonalStatisticsVisibility,
} from '../../../../../shared/statsTypes.js';
import { resolveLinkableCampaigns } from '../resolveLinkableCampaigns.js';
import {
  assembleLifetimeAttributionMetrics,
  buildWorldbuildingMix,
} from '../assembleLifetimeAttribution.js';
import { selectScopedCampaignIds } from './visibility.js';
import {
  createdAtFilter,
  lookbackInterval,
  resolveStatisticsRange,
  StatisticsRangeError,
} from './reportingRange.js';
import {
  assemblePeriodHabits,
  readNarrativeWordDelta,
  readWritingSessionContext,
  type ActivityPoint,
} from './assemblePeriodHabits.js';

export class StatisticsScopeError extends Error {
  constructor(message = 'Campaign is not available in this statistics context') {
    super(message);
    this.name = 'StatisticsScopeError';
  }
}

export { StatisticsRangeError };

export type QueryPersonalStatisticsInput = {
  userId: string;
  viewerId?: string | null;
  visibility: PersonalStatisticsVisibility;
  range: {
    mode: PersonalStatisticsRangeMode;
    from?: string | null;
    to?: string | null;
  };
  campaignId?: string | null;
  includeHabits?: boolean;
  now?: Date;
};

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

export async function queryPersonalStatistics(
  input: QueryPersonalStatisticsInput,
): Promise<PersonalStatisticsResponse> {
  const now = input.now ?? new Date();
  const timeZone = await resolveReportingTimezone(input.userId);
  const range = resolveStatisticsRange({
    mode: input.range.mode,
    timeZone,
    now,
    from: input.range.from,
    to: input.range.to,
  });

  const subjectMemberships = await prisma.campaignMember.findMany({
    where: {
      userId: input.userId,
      campaign: { archivedAt: null },
    },
    select: {
      campaignId: true,
      campaign: { select: { discoverability: true } },
    },
  });
  const viewerCampaignIds =
    input.visibility === 'viewerAuthorized' && input.viewerId
      ? (
          await prisma.campaignMember.findMany({
            where: {
              userId: input.viewerId,
              campaign: { archivedAt: null },
            },
            select: { campaignId: true },
          })
        ).map((row) => row.campaignId)
      : [];

  const scoped = selectScopedCampaignIds({
    subjectMemberships: subjectMemberships.map((row) => ({
      campaignId: row.campaignId,
      discoverability: row.campaign.discoverability,
    })),
    viewerCampaignIds,
    visibility: input.visibility,
    campaignId: input.campaignId,
  });
  if (scoped.unknownCampaign) {
    throw new StatisticsScopeError();
  }

  const campaignIds = scoped.campaignIds;
  const includeHabits = input.includeHabits === true;
  const linkableCampaigns = await resolveLinkableCampaigns(input.userId, input.viewerId);

  if (campaignIds.length === 0) {
    const snapshot = assembleLifetimeAttributionMetrics({
      createdPages: [],
      editCount: 0,
      linkCount: 0,
      actorEventCampaignIds: [],
    });
    return {
      version: 1,
      computedAt: now.toISOString(),
      refreshCadence: 'realtime',
      timeZone,
      visibilityContext: input.visibility,
      range: {
        mode: range.mode,
        start: range.start?.toISOString() ?? null,
        end: range.end.toISOString(),
      },
      campaignId: input.campaignId ?? null,
      snapshot: filterMetricsByPrivacy(snapshot, input.visibility === 'owner' ? 'ownerProfile' : 'publicProfile'),
      period: {},
      habits: includeHabits
        ? {
            'attribution.wordsAdded': metricUnavailable('not_yet_tracked'),
            'attribution.writingStreak': metricUnavailable('not_yet_tracked'),
            'attribution.writingCadence': metricUnavailable('not_yet_tracked'),
            'attribution.substantialRevisions': metricUnavailable('not_yet_tracked'),
            'attribution.favoriteWritingHour': metricUnavailable('not_yet_tracked'),
          }
        : {},
      worldbuildingMix: [],
      linkableCampaigns,
    };
  }

  const periodFilter = createdAtFilter(range);
  const habitWindow = lookbackInterval(now, timeZone, 30);
  const streakLookback = lookbackInterval(now, timeZone, 120);

  const [
    createdPages,
    editCount,
    linkCount,
    contributedCampaignIds,
    periodEvents,
    habitEvents,
    writingSessions,
  ] = await Promise.all([
    prisma.wikiPage.findMany({
      where: {
        campaignId: { in: campaignIds },
        createdByUserId: input.userId,
        deletedAt: null,
      },
      select: {
        id: true,
        campaignId: true,
        templateType: true,
        metadata: true,
        stats: { select: { wordCount: true } },
      },
    }),
    prisma.narrativeEvent.count({
      where: {
        campaignId: { in: campaignIds },
        actorUserId: input.userId,
        type: NarrativeEventType.PAGE_EDITED,
      },
    }),
    prisma.narrativeEvent.count({
      where: {
        campaignId: { in: campaignIds },
        actorUserId: input.userId,
        type: NarrativeEventType.LINK_CREATED,
      },
    }),
    prisma.narrativeEvent.findMany({
      where: {
        campaignId: { in: campaignIds },
        actorUserId: input.userId,
      },
      select: { campaignId: true },
      distinct: ['campaignId'],
    }),
    prisma.narrativeEvent.findMany({
      where: {
        campaignId: { in: campaignIds },
        actorUserId: input.userId,
        createdAt: periodFilter,
      },
      select: { type: true, createdAt: true, metadata: true, source: true },
    }),
    includeHabits
      ? prisma.narrativeEvent.findMany({
          where: {
            campaignId: { in: campaignIds },
            actorUserId: input.userId,
            source: 'user',
            createdAt: { gte: streakLookback.gte, lt: streakLookback.lt },
          },
          select: { type: true, createdAt: true, metadata: true, source: true },
        })
      : Promise.resolve([]),
    includeHabits
      ? prisma.campaignActivity.findMany({
          where: {
            campaignId: { in: campaignIds },
            userId: input.userId,
            entityType: 'WRITING_SESSION',
            createdAt: { gte: streakLookback.gte, lt: streakLookback.lt },
          },
          select: { createdAt: true, parentContext: true },
        })
      : Promise.resolve([]),
  ]);

  const snapshot = assembleLifetimeAttributionMetrics({
    createdPages,
    editCount,
    linkCount,
    actorEventCampaignIds: contributedCampaignIds.map((row) => row.campaignId),
  });

  let periodPagesCreated = 0;
  let periodPagesEdited = 0;
  let periodConnections = 0;
  let periodWordsAdded = 0;
  for (const event of periodEvents) {
    if (event.type === NarrativeEventType.PAGE_CREATED) periodPagesCreated += 1;
    if (event.type === NarrativeEventType.PAGE_EDITED) periodPagesEdited += 1;
    if (event.type === NarrativeEventType.LINK_CREATED) periodConnections += 1;
    if (event.source === 'user') {
      periodWordsAdded += readNarrativeWordDelta(event.metadata).wordsAdded;
    }
  }

  const period = filterMetricsByPrivacy(
    {
      'period.pagesCreated': metricValue(periodPagesCreated),
      'period.pagesEdited': metricValue(periodPagesEdited),
      'period.connectionsCreated': metricValue(periodConnections),
      'period.wordsAdded': metricPartial(periodWordsAdded),
    },
    input.visibility === 'owner' ? 'ownerProfile' : 'publicProfile',
  );

  let habits: PersonalStatisticsResponse['habits'] = {};
  if (includeHabits) {
    const points: ActivityPoint[] = [];
    for (const event of habitEvents) {
      const delta = readNarrativeWordDelta(event.metadata);
      points.push({
        at: event.createdAt,
        wordsAdded: delta.wordsAdded,
        editsCount: event.type === NarrativeEventType.PAGE_EDITED ? 1 : 0,
        sessionCount: 0,
        sessionMinutes: 0,
        substantialRevisions: delta.substantialRevision ? 1 : 0,
      });
    }
    for (const session of writingSessions) {
      const context = readWritingSessionContext(session.parentContext);
      points.push({
        at: session.createdAt,
        wordsAdded: Math.max(0, context.wordDelta),
        editsCount: 0,
        sessionCount: 1,
        sessionMinutes: Math.max(1, Math.round(context.durationMs / 60_000)),
        substantialRevisions: 0,
      });
    }
    const assembled = assemblePeriodHabits(points, {
      now,
      timeZone,
      windowStart: habitWindow.gte,
      streakLookbackStart: streakLookback.gte,
    });
    if (!assembled.hasActivityData) {
      habits = {
        'attribution.wordsAdded': metricUnavailable('not_yet_tracked'),
        'attribution.writingStreak': metricUnavailable('not_yet_tracked'),
        'attribution.writingCadence': metricUnavailable('not_yet_tracked'),
        'attribution.substantialRevisions': metricUnavailable('not_yet_tracked'),
        'attribution.favoriteWritingHour': metricUnavailable('not_yet_tracked'),
      };
    } else {
      habits = {
        'attribution.wordsAdded': metricPartial(assembled.wordsAdded),
        'attribution.writingStreak': metricValue(assembled.writingStreak),
        'attribution.writingCadence': metricValue(assembled.writingCadence),
        'attribution.substantialRevisions': metricValue(assembled.substantialRevisions),
        'attribution.favoriteWritingHour':
          assembled.favoriteWritingHour != null
            ? metricValue(assembled.favoriteWritingHour)
            : metricUnavailable('insufficient_data'),
      };
    }
  }

  const privacyContext = input.visibility === 'owner' ? 'ownerProfile' : 'publicProfile';
  return {
    version: 1,
    computedAt: now.toISOString(),
    refreshCadence: 'realtime',
    timeZone,
    visibilityContext: input.visibility,
    range: {
      mode: range.mode,
      start: range.start?.toISOString() ?? null,
      end: range.end.toISOString(),
    },
    campaignId: input.campaignId ?? null,
    snapshot: filterMetricsByPrivacy(snapshot, privacyContext),
    period,
    habits: includeHabits ? filterMetricsByPrivacy(habits, privacyContext) : {},
    worldbuildingMix: buildWorldbuildingMix(createdPages),
    linkableCampaigns,
  };
}

export function toCreatorAttributionResponse(
  payload: PersonalStatisticsResponse,
): CreatorAttributionResponse {
  const habits = { ...payload.habits };
  if (habits['attribution.wordsAdded']?.status === 'partial') {
    habits['attribution.wordsAdded'] = metricValue(
      habits['attribution.wordsAdded'].amount,
    );
  }
  return {
    computedAt: payload.computedAt,
    refreshCadence: payload.refreshCadence,
    metrics: {
      ...payload.snapshot,
      ...habits,
    },
    worldbuildingMix: payload.worldbuildingMix,
    linkableCampaigns: payload.linkableCampaigns,
  };
}
