import { prisma } from '../../prisma.js';
import { getOrCreateSystemSettings } from '../../systemSettings.js';
import { resolveEffectiveTimezone } from '../../timezone.js';
import { NarrativeEventType } from '../../narrativeEventService.js';
import {
  filterMetricsByPrivacy,
  PERSONAL_ATTRIBUTION_METRIC_IDS,
} from '../../../../../shared/metricRegistry.js';
import {
  metricPartial,
  metricUnavailable,
  metricValue,
  type MetricValue,
} from '../../../../../shared/metricValue.js';
import { aggregateWritingWords, listResolvedWritingWordRows } from '../writing/aggregateWritingWords.js';
import type {
  CreatorAttributionResponse,
  PersonalStatisticsRangeMode,
  PersonalStatisticsResponse,
  PersonalStatisticsVisibility,
} from '../../../../../shared/statsTypes.js';
import {
  assembleWorldbuildingStats,
  type WorldbuildingPageInput,
} from './assembleWorldbuilding.js';
import { resolveLinkableCampaigns } from '../resolveLinkableCampaigns.js';
import {
  assembleLifetimeAttributionMetrics,
  buildWorldbuildingMix,
} from '../assembleLifetimeAttribution.js';
import { selectScopedCampaignIds } from './visibility.js';
import { campaignFreeformPagePath } from '../../../../../shared/campaignWorkspaceRoutes.js';
import { uniqueDocumentIds } from '../../../../../shared/writingSession.js';
import { buildCampaignContextSync } from '../../campaignScopeContext.js';
import { canViewWikiPage, type WikiVisibilityViewer } from '../../wikiTree.js';
import {
  assembleWritingVisualizations,
  emptyWritingVisualizations,
} from './assembleWritingVisualizations.js';
import {
  contributionQueryWindow,
  createdAtFilter,
  lookbackInterval,
  resolveStatisticsRange,
  StatisticsRangeError,
  visualizationQueryWindow,
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

async function loadReferencedWorldbuildingPages(input: {
  campaignIds: string[];
  createdPages: WorldbuildingPageInput[];
  periodEvents: Array<{ pageId?: string | null }>;
  documentIds: Array<string | null | undefined>;
}): Promise<Map<string, WorldbuildingPageInput>> {
  const pagesById = new Map<string, WorldbuildingPageInput>();
  for (const page of input.createdPages) pagesById.set(page.id, page);
  const missing = new Set<string>();
  for (const event of input.periodEvents) {
    if (event.pageId && !pagesById.has(event.pageId)) missing.add(event.pageId);
  }
  for (const documentId of input.documentIds) {
    if (documentId && !pagesById.has(documentId)) missing.add(documentId);
  }
  if (missing.size === 0) return pagesById;
  const extra = await prisma.wikiPage.findMany({
    where: {
      id: { in: [...missing] },
      campaignId: { in: input.campaignIds },
    },
    select: {
      id: true,
      title: true,
      parentId: true,
      workspace: true,
      templateType: true,
      metadata: true,
    },
  });
  for (const page of extra) pagesById.set(page.id, page);
  return pagesById;
}

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
  /** Skip the period NarrativeEvent query when the caller discards period metrics. */
  skipPeriod?: boolean;
  /** Owner charts. Defaults on for owner queries that also load period metrics. */
  includeVisualizations?: boolean;
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
  const skipPeriod = input.skipPeriod === true;
  const includeVisualizations =
    input.visibility === 'owner' &&
    !skipPeriod &&
    input.includeVisualizations !== false;
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
      worldbuilding: assembleWorldbuildingStats({
        createdPages: [],
        pagesById: new Map(),
        periodEvents: [],
        wordRows: [],
        lifetimeLinkCount: 0,
        skipPeriod,
        visibility: input.visibility,
      }),
      linkableCampaigns,
      ...(includeVisualizations
        ? {
            visualizations: emptyWritingVisualizations(
              timeZone,
              visualizationQueryWindow({
                rangeStart: range.start,
                rangeEnd: range.end,
                timeZone,
              }),
            ),
          }
        : {}),
    };
  }

  const habitWindow = lookbackInterval(now, timeZone, 30);
  const streakLookback = lookbackInterval(now, timeZone, 120);
  const contributionWindow = contributionQueryWindow({
    includeHabits,
    skipPeriod,
    streakLookback,
    rangeStart: range.start,
    rangeEnd: range.end,
  });
  const loadContributions = contributionWindow != null;
  const vizWindow = includeVisualizations
    ? visualizationQueryWindow({
        rangeStart: range.start,
        rangeEnd: range.end,
        timeZone,
      })
    : null;

  const [
    createdPages,
    editCount,
    linkCount,
    contributedCampaignIds,
    periodEvents,
    habitEvents,
    writingSessions,
    inferredSessions,
    writingContributions,
    visualizationSessions,
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
        title: true,
        parentId: true,
        workspace: true,
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
    skipPeriod
      ? Promise.resolve([])
      : prisma.narrativeEvent.findMany({
          where: {
            campaignId: { in: campaignIds },
            actorUserId: input.userId,
            source: 'user',
            createdAt: createdAtFilter(range),
          },
          select: {
            id: true,
            type: true,
            createdAt: true,
            metadata: true,
            source: true,
            pageId: true,
          },
        }),
    includeHabits
      ? prisma.narrativeEvent.findMany({
          where: {
            campaignId: { in: campaignIds },
            actorUserId: input.userId,
            source: 'user',
            createdAt: { gte: streakLookback.gte, lt: streakLookback.lt },
          },
          select: { id: true, type: true, createdAt: true, metadata: true, source: true },
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
    includeHabits
      ? prisma.writingSession.findMany({
          where: {
            userId: input.userId,
            campaignId: { in: campaignIds },
            startedAt: { gte: streakLookback.gte, lt: streakLookback.lt },
            completeness: { not: 'unavailable' },
          },
          select: {
            startedAt: true,
            activeDurationMs: true,
            completeness: true,
          },
        })
      : Promise.resolve([]),
    loadContributions && contributionWindow
      ? prisma.writingContribution.findMany({
          where: {
            userId: input.userId,
            campaignId: { in: campaignIds },
            origin: 'human',
            occurredAt: {
              gte: contributionWindow.gte,
              lt: contributionWindow.lt,
            },
          },
          select: {
            narrativeEventId: true,
            occurredAt: true,
            wordsAdded: true,
            wordsRemoved: true,
            netChange: true,
            availability: true,
            origin: true,
            documentId: true,
          },
        })
      : Promise.resolve([]),
    vizWindow
      ? prisma.writingSession.findMany({
          where: {
            userId: input.userId,
            campaignId: { in: campaignIds },
            startedAt: { gte: vizWindow.gte, lt: vizWindow.lt },
            completeness: { not: 'unavailable' },
          },
          select: {
            id: true,
            startedAt: true,
            endedAt: true,
            activeDurationMs: true,
            completeness: true,
            documentIds: true,
          },
        })
      : Promise.resolve([]),
  ]);

  const worldbuildingPagesById = skipPeriod
    ? new Map(createdPages.map((page) => [page.id, page]))
    : await loadReferencedWorldbuildingPages({
        campaignIds,
        createdPages,
        periodEvents,
        documentIds: writingContributions.map((row) => row.documentId),
      });
  const worldbuilding = assembleWorldbuildingStats({
    createdPages,
    pagesById: worldbuildingPagesById,
    periodEvents,
    wordRows: skipPeriod
      ? []
      : listResolvedWritingWordRows({
          contributions: writingContributions,
          events: periodEvents,
          start: range.start ?? new Date(0),
          end: range.end,
        }),
    lifetimeLinkCount: linkCount,
    skipPeriod,
    visibility: input.visibility,
  });

  const snapshot = assembleLifetimeAttributionMetrics({
    createdPages,
    editCount,
    linkCount,
    actorEventCampaignIds: contributedCampaignIds.map((row) => row.campaignId),
  });

  let period: PersonalStatisticsResponse['period'] = {};
  if (!skipPeriod) {
    let periodPagesCreated = 0;
    let periodPagesEdited = 0;
    let periodConnections = 0;
    for (const event of periodEvents) {
      if (event.type === NarrativeEventType.PAGE_CREATED) periodPagesCreated += 1;
      if (event.type === NarrativeEventType.PAGE_EDITED) periodPagesEdited += 1;
      if (event.type === NarrativeEventType.LINK_CREATED) periodConnections += 1;
    }
    const periodWords = aggregateWritingWords({
      contributions: writingContributions,
      events: periodEvents,
      start: range.start ?? new Date(0),
      end: range.end,
    });

    period = filterMetricsByPrivacy(
      {
        'period.pagesCreated': metricValue(periodPagesCreated),
        'period.pagesEdited': metricValue(periodPagesEdited),
        'period.connectionsCreated': metricValue(periodConnections),
        'period.wordsAdded': wordsMetric(periodWords.wordsAdded, periodWords.completeness),
      },
      input.visibility === 'owner' ? 'ownerProfile' : 'publicProfile',
    );
  }

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
    for (const session of inferredSessions) {
      points.push({
        at: session.startedAt,
        wordsAdded: 0,
        editsCount: 0,
        sessionCount: 1,
        sessionMinutes: Math.max(0, Math.round(session.activeDurationMs / 60_000)),
        substantialRevisions: 0,
      });
    }
    for (const session of writingSessions) {
      const context = readWritingSessionContext(session.parentContext);
      if (context.writingSessionId) continue;
      points.push({
        at: session.createdAt,
        wordsAdded: 0,
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
    const habitWords = aggregateWritingWords({
      contributions: writingContributions,
      events: habitEvents,
      start: habitWindow.gte,
      end: now,
    });
    if (!assembled.hasActivityData && habitWords.completeness === 'none') {
      habits = {
        'attribution.wordsAdded': metricUnavailable('not_yet_tracked'),
        'attribution.writingStreak': metricUnavailable('not_yet_tracked'),
        'attribution.writingCadence': metricUnavailable('not_yet_tracked'),
        'attribution.substantialRevisions': metricUnavailable('not_yet_tracked'),
        'attribution.favoriteWritingHour': metricUnavailable('not_yet_tracked'),
      };
    } else {
      habits = {
        'attribution.wordsAdded': wordsMetric(habitWords.wordsAdded, habitWords.completeness),
        'attribution.wordsAddedMeasured':
          habitWords.measuredCount > 0
            ? metricValue(
                writingContributions
                  .filter(
                    (row) =>
                      row.availability === 'measured' &&
                      row.occurredAt >= habitWindow.gte &&
                      row.occurredAt < now,
                  )
                  .reduce((sum, row) => sum + row.wordsAdded, 0),
              )
            : metricUnavailable('not_yet_tracked'),
        'attribution.wordsRemoved': wordsMetric(
          habitWords.wordsRemoved,
          habitWords.completeness,
        ),
        'attribution.netChange': wordsMetric(habitWords.netChange, habitWords.completeness),
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
  const visualizations =
    includeVisualizations && vizWindow
      ? assembleWritingVisualizations({
          timeZone,
          window: vizWindow,
          contributions: writingContributions,
          sessions: visualizationSessions,
          documentsById: await resolveVisualizationDocuments(
            visualizationSessions,
            campaignIds,
            input.viewerId ?? input.userId,
          ),
        })
      : undefined;

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
    worldbuilding,
    linkableCampaigns,
    ...(visualizations ? { visualizations } : {}),
  };
}

export function selectVisibleVisualizationDocuments(
  pages: Array<{
    id: string;
    title: string;
    pathKey: string | null;
    visibility: string;
    campaignId: string;
    handle: string;
  }>,
  capabilitiesByCampaign: Map<string, WikiVisibilityViewer>,
) {
  const documents = new Map<
    string,
    { id: string; title: string; href: string }
  >();
  for (const page of pages) {
    const viewer = capabilitiesByCampaign.get(page.campaignId);
    if (!viewer || !canViewWikiPage(page.visibility, viewer)) continue;
    documents.set(page.id, {
      id: page.id,
      title: page.title,
      href: campaignFreeformPagePath(page.handle, page.pathKey ?? page.id),
    });
  }
  return documents;
}

async function loadViewerCapabilitiesByCampaign(
  viewerId: string,
  campaignIds: string[],
): Promise<Map<string, WikiVisibilityViewer>> {
  const result = new Map<string, WikiVisibilityViewer>();
  if (campaignIds.length === 0) return result;
  const [memberships, campaigns, overrides] = await Promise.all([
    prisma.campaignMember.findMany({
      where: { userId: viewerId, campaignId: { in: campaignIds } },
      select: {
        campaignId: true,
        role: true,
        chronologyContributor: true,
        partyId: true,
      },
    }),
    prisma.campaign.findMany({
      where: { id: { in: campaignIds } },
      select: {
        id: true,
        handle: true,
        campaignOwnerUserId: true,
        discoverability: true,
        allowPlayerChronologyManagement: true,
      },
    }),
    prisma.campaignRoleCapabilityOverride.findMany({
      where: { campaignId: { in: campaignIds } },
      select: { campaignId: true, role: true, capability: true, effect: true },
    }),
  ]);
  const membershipByCampaign = new Map(
    memberships.map((row) => [row.campaignId, row]),
  );
  const overridesByCampaign = new Map<string, typeof overrides>();
  for (const row of overrides) {
    const list = overridesByCampaign.get(row.campaignId) ?? [];
    list.push(row);
    overridesByCampaign.set(row.campaignId, list);
  }
  for (const campaign of campaigns) {
    const membership = membershipByCampaign.get(campaign.id);
    const context = buildCampaignContextSync({
      campaignId: campaign.id,
      campaignHandle: campaign.handle,
      campaignOwnerUserId: campaign.campaignOwnerUserId,
      discoverability: campaign.discoverability,
      allowPlayerChronologyManagement: campaign.allowPlayerChronologyManagement,
      userId: viewerId,
      membershipRole: membership?.role ?? null,
      chronologyContributor: membership?.chronologyContributor ?? false,
      partyId: membership?.partyId ?? null,
      roleCapabilityOverrides: overridesByCampaign.get(campaign.id) ?? [],
    });
    result.set(campaign.id, { capabilities: context.capabilities });
  }
  return result;
}

async function resolveVisualizationDocuments(
  sessions: Array<{ documentIds: unknown }>,
  campaignIds: string[],
  viewerId: string,
) {
  const ids = [
    ...new Set(sessions.flatMap((session) => uniqueDocumentIds(session.documentIds))),
  ];
  if (ids.length === 0 || campaignIds.length === 0) return new Map();
  const pages = await prisma.wikiPage.findMany({
    where: {
      id: { in: ids },
      campaignId: { in: campaignIds },
      deletedAt: null,
    },
    select: {
      id: true,
      title: true,
      pathKey: true,
      visibility: true,
      campaignId: true,
      campaign: { select: { handle: true } },
    },
  });
  const pageCampaignIds = [...new Set(pages.map((page) => page.campaignId))];
  const capabilitiesByCampaign = await loadViewerCapabilitiesByCampaign(
    viewerId,
    pageCampaignIds,
  );
  return selectVisibleVisualizationDocuments(
    pages.map((page) => ({
      id: page.id,
      title: page.title,
      pathKey: page.pathKey,
      visibility: page.visibility,
      campaignId: page.campaignId,
      handle: page.campaign.handle,
    })),
    capabilitiesByCampaign,
  );
}

function wordsMetric(
  amount: number,
  completeness: 'measured' | 'partial' | 'reconstructed' | 'none',
): MetricValue {
  if (completeness === 'measured' || completeness === 'none') return metricValue(amount);
  return metricPartial(amount);
}

export function toCreatorAttributionResponse(
  payload: PersonalStatisticsResponse,
): CreatorAttributionResponse {
  const merged = {
    ...payload.snapshot,
    ...payload.habits,
  };
  if (merged['attribution.wordsAdded']?.status === 'partial') {
    merged['attribution.wordsAdded'] = metricValue(
      merged['attribution.wordsAdded'].amount,
    );
  }
  const metrics: CreatorAttributionResponse['metrics'] = {};
  for (const id of PERSONAL_ATTRIBUTION_METRIC_IDS) {
    const value = merged[id];
    if (value) metrics[id] = value;
  }
  return {
    computedAt: payload.computedAt,
    refreshCadence: payload.refreshCadence,
    metrics,
    worldbuildingMix: payload.worldbuildingMix,
    linkableCampaigns: payload.linkableCampaigns,
  };
}
