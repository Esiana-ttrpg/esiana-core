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
  CartographyDomain,
  CartographyThumbnail,
  ChronologyDomain,
  CreatorAttributionResponse,
  PersonalStatisticsRangeMode,
  PersonalStatisticsResponse,
  PersonalStatisticsVisibility,
} from '../../../../../shared/statsTypes.js';
import {
  assembleWorldbuildingStats,
  worldbuildingDocumentId,
  type WorldbuildingPageInput,
} from './assembleWorldbuilding.js';
import { assembleCartographyStats } from './assembleCartography.js';
import { assembleChronologyStats } from './assembleChronology.js';
import {
  assembleParticipationStats,
  buildParticipationHistory,
  type ParticipationSessionRecord,
} from './assembleParticipation.js';
import { assembleArchetypes } from './assembleArchetypes.js';
import {
  MAP_ACTIVITY_ENTITY_TYPES,
  MapActivityEntity,
} from '../../mapAuthorship.js';
import {
  CHRONOLOGY_EDIT_ENTITY_TYPES,
  ChronologyActivityEntity,
} from '../../chronologyAuthorship.js';
import { AssetTypes } from '../../../types/domain.js';
import { WORLD_ADVANCE_CATEGORY } from '../../../../../shared/worldAdvance.js';
import { MembershipRoles } from '../../../../../shared/campaignPolicy/membershipRoles.js';
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

function emptyCartography(
  skipPeriod: boolean,
  visibility: PersonalStatisticsVisibility,
  rangeStart: Date | null,
  rangeEnd: Date,
) {
  return assembleCartographyStats({
    maps: [],
    markers: [],
    regions: [],
    layers: [],
    labels: [],
    periodEditsByDomain: {},
    hasEditInstrumentation: false,
    rangeStart,
    rangeEnd,
    skipPeriod,
    visibility,
  });
}

async function loadCartographyProjection(input: {
  userId: string;
  viewerId: string;
  campaignIds: string[];
  rangeStart: Date | null;
  rangeEnd: Date;
  skipPeriod: boolean;
  visibility: PersonalStatisticsVisibility;
  includeThumbnails: boolean;
}): Promise<{
  cartography: ReturnType<typeof assembleCartographyStats>;
  thumbnails: CartographyThumbnail[] | undefined;
}> {
  if (input.campaignIds.length === 0) {
    return {
      cartography: emptyCartography(
        input.skipPeriod,
        input.visibility,
        input.rangeStart,
        input.rangeEnd,
      ),
      thumbnails: input.includeThumbnails ? [] : undefined,
    };
  }

  const [
    maps,
    markers,
    layers,
    regions,
    labels,
    periodUpdates,
    instrumentation,
  ] = await Promise.all([
    prisma.asset.findMany({
      where: {
        campaignId: { in: input.campaignIds },
        type: AssetTypes.MAP,
        uploadedByUserId: input.userId,
      },
      select: {
        id: true,
        createdAt: true,
        visibility: true,
        thumbnailUrl: true,
        displayName: true,
        campaignId: true,
        campaign: { select: { handle: true } },
      },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.mapPin.findMany({
      where: {
        createdByUserId: input.userId,
        asset: { campaignId: { in: input.campaignIds } },
      },
      select: {
        createdAt: true,
        targetPage: {
          select: {
            id: true,
            title: true,
            parentId: true,
            workspace: true,
            templateType: true,
            metadata: true,
          },
        },
      },
    }),
    prisma.mapLayer.findMany({
      where: {
        createdByUserId: input.userId,
        campaignId: { in: input.campaignIds },
      },
      select: { createdAt: true },
    }),
    prisma.mapSceneObject.findMany({
      where: {
        createdByUserId: input.userId,
        campaignId: { in: input.campaignIds },
        kind: 'region',
      },
      select: { createdAt: true },
    }),
    prisma.mapSceneObject.findMany({
      where: {
        createdByUserId: input.userId,
        campaignId: { in: input.campaignIds },
        kind: 'label',
      },
      select: { createdAt: true },
    }),
    input.skipPeriod || input.visibility !== 'owner'
      ? Promise.resolve([])
      : prisma.campaignActivity.groupBy({
          by: ['entityType', 'entityId'],
          where: {
            userId: input.userId,
            campaignId: { in: input.campaignIds },
            entityType: { in: [...MAP_ACTIVITY_ENTITY_TYPES] },
            actionType: 'UPDATE',
            createdAt: {
              ...(input.rangeStart ? { gte: input.rangeStart } : {}),
              lt: input.rangeEnd,
            },
          },
          _count: { _all: true },
        }),
    prisma.campaignActivity.findFirst({
      where: {
        userId: input.userId,
        campaignId: { in: input.campaignIds },
        entityType: { in: [...MAP_ACTIVITY_ENTITY_TYPES] },
      },
      select: { id: true },
    }),
  ]);

  const sceneEditIds = [
    ...new Set(
      periodUpdates
        .filter((row) => row.entityType === MapActivityEntity.SCENE_OBJECT)
        .map((row) => row.entityId),
    ),
  ];
  const sceneKinds =
    sceneEditIds.length === 0
      ? []
      : await prisma.mapSceneObject.findMany({
          where: { id: { in: sceneEditIds }, campaignId: { in: input.campaignIds } },
          select: { id: true, kind: true },
        });
  const kindById = new Map(sceneKinds.map((row) => [row.id, row.kind]));
  const periodEditsByDomain: Partial<Record<CartographyDomain, number>> = {};
  for (const row of periodUpdates) {
    const count = row._count._all;
    if (row.entityType === MapActivityEntity.ASSET) {
      periodEditsByDomain.maps = (periodEditsByDomain.maps ?? 0) + count;
    } else if (row.entityType === MapActivityEntity.PIN) {
      periodEditsByDomain.markers = (periodEditsByDomain.markers ?? 0) + count;
    } else if (row.entityType === MapActivityEntity.LAYER) {
      periodEditsByDomain.layers = (periodEditsByDomain.layers ?? 0) + count;
    } else if (row.entityType === MapActivityEntity.SCENE_OBJECT) {
      const kind = kindById.get(row.entityId);
      if (kind === 'region') {
        periodEditsByDomain.regions = (periodEditsByDomain.regions ?? 0) + count;
      } else if (kind === 'label') {
        periodEditsByDomain.labels = (periodEditsByDomain.labels ?? 0) + count;
      }
    }
  }

  const cartography = assembleCartographyStats({
    maps,
    markers,
    regions,
    layers,
    labels,
    periodEditsByDomain,
    hasEditInstrumentation: instrumentation != null,
    rangeStart: input.rangeStart,
    rangeEnd: input.rangeEnd,
    skipPeriod: input.skipPeriod,
    visibility: input.visibility,
  });

  if (!input.includeThumbnails) {
    return { cartography, thumbnails: undefined };
  }

  const capabilities = await loadViewerCapabilitiesByCampaign(
    input.viewerId,
    input.campaignIds,
  );
  const thumbnails: CartographyThumbnail[] = [];
  for (const map of maps) {
    const viewer = capabilities.get(map.campaignId);
    if (!viewer || !canViewWikiPage(map.visibility, viewer)) continue;
    thumbnails.push({
      id: map.id,
      href: `/campaigns/${map.campaign.handle}/maps/${map.id}`,
      thumbnailUrl: map.thumbnailUrl,
      label: map.displayName?.trim() || 'Untitled map',
    });
    if (thumbnails.length >= 6) break;
  }

  return { cartography, thumbnails };
}

function emptyChronology(
  skipPeriod: boolean,
  visibility: PersonalStatisticsVisibility,
  rangeStart: Date | null,
  rangeEnd: Date,
) {
  return assembleChronologyStats({
    events: [],
    eras: [],
    timelineContributions: [],
    timeAdvances: [],
    periodEditsByDomain: {},
    hasEditInstrumentation: false,
    rangeStart,
    rangeEnd,
    skipPeriod,
    visibility,
  });
}

async function loadChronologyProjection(input: {
  userId: string;
  campaignIds: string[];
  rangeStart: Date | null;
  rangeEnd: Date;
  skipPeriod: boolean;
  visibility: PersonalStatisticsVisibility;
}): Promise<ReturnType<typeof assembleChronologyStats>> {
  if (input.campaignIds.length === 0) {
    return emptyChronology(
      input.skipPeriod,
      input.visibility,
      input.rangeStart,
      input.rangeEnd,
    );
  }

  const worldAdvanceCategories = await prisma.calendarEventCategory.findMany({
    where: {
      campaignId: { in: input.campaignIds },
      name: WORLD_ADVANCE_CATEGORY,
    },
    select: { id: true },
  });
  const worldAdvanceCategoryIds = worldAdvanceCategories.map((row) => row.id);

  const [events, eras, timeAdvances, periodUpdates, instrumentation] = await Promise.all([
    prisma.calendarEvent.findMany({
      where: {
        createdByUserId: input.userId,
        calendar: { campaignId: { in: input.campaignIds } },
        ...(worldAdvanceCategoryIds.length > 0
          ? {
              OR: [
                { categoryId: null },
                { categoryId: { notIn: worldAdvanceCategoryIds } },
              ],
            }
          : {}),
      },
      select: { createdAt: true, wikiPageId: true },
    }),
    prisma.campaignEra.findMany({
      where: {
        createdByUserId: input.userId,
        campaignId: { in: input.campaignIds },
      },
      select: { createdAt: true },
    }),
    prisma.timeAdvanceSimulationRun.findMany({
      where: {
        initiatedByUserId: input.userId,
        campaignId: { in: input.campaignIds },
      },
      select: {
        createdAt: true,
        previousEpochMinute: true,
        nextEpochMinute: true,
      },
    }),
    input.skipPeriod || input.visibility !== 'owner'
      ? Promise.resolve([])
      : prisma.campaignActivity.groupBy({
          by: ['entityType'],
          where: {
            userId: input.userId,
            campaignId: { in: input.campaignIds },
            entityType: { in: [...CHRONOLOGY_EDIT_ENTITY_TYPES] },
            actionType: 'UPDATE',
            createdAt: {
              ...(input.rangeStart ? { gte: input.rangeStart } : {}),
              lt: input.rangeEnd,
            },
          },
          _count: { _all: true },
        }),
    prisma.campaignActivity.findFirst({
      where: {
        userId: input.userId,
        campaignId: { in: input.campaignIds },
        entityType: { in: [...CHRONOLOGY_EDIT_ENTITY_TYPES] },
      },
      select: { id: true },
    }),
  ]);

  const periodEditsByDomain: Partial<Record<ChronologyDomain, number>> = {};
  for (const row of periodUpdates) {
    const count = row._count._all;
    if (row.entityType === ChronologyActivityEntity.EVENT) {
      periodEditsByDomain.events = (periodEditsByDomain.events ?? 0) + count;
    } else if (row.entityType === ChronologyActivityEntity.ERA) {
      periodEditsByDomain.eras = (periodEditsByDomain.eras ?? 0) + count;
    }
  }

  return assembleChronologyStats({
    events,
    eras,
    timelineContributions: events.filter((row) => row.wikiPageId != null),
    timeAdvances,
    periodEditsByDomain,
    hasEditInstrumentation: instrumentation != null,
    rangeStart: input.rangeStart,
    rangeEnd: input.rangeEnd,
    skipPeriod: input.skipPeriod,
    visibility: input.visibility,
  });
}

function emptyParticipation(
  skipPeriod: boolean,
  visibility: PersonalStatisticsVisibility,
  rangeStart: Date | null,
  rangeEnd: Date,
) {
  return assembleParticipationStats({
    participatedCampaigns: [],
    gmedCampaigns: [],
    sessionsAttended: [],
    sessionsHosted: [],
    rangeStart,
    rangeEnd,
    skipPeriod,
    visibility,
  });
}

function toParticipationSession(row: {
  timelinePointId: string;
  campaignId: string;
  plannedStartAt: Date | null;
  plannedEndAt: Date | null;
}): ParticipationSessionRecord {
  return {
    timelinePointId: row.timelinePointId,
    campaignId: row.campaignId,
    plannedStartAt: row.plannedStartAt,
    plannedEndAt: row.plannedEndAt,
  };
}

async function loadParticipationProjection(input: {
  userId: string;
  campaignIds: string[];
  rangeStart: Date | null;
  rangeEnd: Date;
  skipPeriod: boolean;
  visibility: PersonalStatisticsVisibility;
  includeHistory: boolean;
}): Promise<{
  participation: ReturnType<typeof assembleParticipationStats>;
  history: ReturnType<typeof buildParticipationHistory> | undefined;
}> {
  if (input.campaignIds.length === 0) {
    return {
      participation: emptyParticipation(
        input.skipPeriod,
        input.visibility,
        input.rangeStart,
        input.rangeEnd,
      ),
      history: input.includeHistory ? [] : undefined,
    };
  }

  const [attendanceRows, hostedRows, ownedCampaigns, gmMemberships] = await Promise.all([
    prisma.sessionAttendance.findMany({
      where: {
        userId: input.userId,
        status: 'ATTENDING',
        timelinePoint: {
          campaignId: { in: input.campaignIds },
          schedule: { status: 'COMPLETED' },
        },
      },
      select: {
        timelinePointId: true,
        timelinePoint: {
          select: {
            campaignId: true,
            schedule: {
              select: { plannedStartAt: true, plannedEndAt: true },
            },
          },
        },
      },
    }),
    prisma.campaignSessionTimeline.findMany({
      where: {
        authorId: input.userId,
        campaignId: { in: input.campaignIds },
        schedule: { status: 'COMPLETED' },
      },
      select: {
        id: true,
        campaignId: true,
        schedule: {
          select: { plannedStartAt: true, plannedEndAt: true },
        },
      },
    }),
    prisma.campaign.findMany({
      where: {
        id: { in: input.campaignIds },
        campaignOwnerUserId: input.userId,
        archivedAt: null,
      },
      select: { id: true, createdAt: true },
    }),
    prisma.campaignMember.findMany({
      where: {
        userId: input.userId,
        campaignId: { in: input.campaignIds },
        role: MembershipRoles.GAMEMASTER,
        campaign: { archivedAt: null },
      },
      select: { campaignId: true, createdAt: true },
    }),
  ]);

  const sessionsAttended = attendanceRows.map((row) =>
    toParticipationSession({
      timelinePointId: row.timelinePointId,
      campaignId: row.timelinePoint.campaignId,
      plannedStartAt: row.timelinePoint.schedule?.plannedStartAt ?? null,
      plannedEndAt: row.timelinePoint.schedule?.plannedEndAt ?? null,
    }),
  );
  const sessionsHosted = hostedRows.map((row) =>
    toParticipationSession({
      timelinePointId: row.id,
      campaignId: row.campaignId,
      plannedStartAt: row.schedule?.plannedStartAt ?? null,
      plannedEndAt: row.schedule?.plannedEndAt ?? null,
    }),
  );

  const participatedCampaigns = sessionsAttended
    .filter((row) => row.plannedStartAt != null)
    .map((row) => ({ campaignId: row.campaignId, at: row.plannedStartAt! }));
  // Undated completed sessions still count toward lifetime campaigns participated.
  for (const row of sessionsAttended) {
    if (row.plannedStartAt != null) continue;
    participatedCampaigns.push({
      campaignId: row.campaignId,
      at: new Date(0),
    });
  }

  const gmedByCampaign = new Map<string, Date>();
  for (const row of ownedCampaigns) {
    gmedByCampaign.set(row.id, row.createdAt);
  }
  for (const row of gmMemberships) {
    const existing = gmedByCampaign.get(row.campaignId);
    if (!existing || row.createdAt < existing) {
      gmedByCampaign.set(row.campaignId, row.createdAt);
    }
  }
  const gmedCampaigns = [...gmedByCampaign.entries()].map(([campaignId, at]) => ({
    campaignId,
    at,
  }));

  const participation = assembleParticipationStats({
    participatedCampaigns,
    gmedCampaigns,
    sessionsAttended,
    sessionsHosted,
    rangeStart: input.rangeStart,
    rangeEnd: input.rangeEnd,
    skipPeriod: input.skipPeriod,
    visibility: input.visibility,
  });

  if (!input.includeHistory) {
    return { participation, history: undefined };
  }

  return {
    participation,
    history: buildParticipationHistory({
      attended: sessionsAttended,
      hosted: sessionsHosted,
      limit: 20,
    }),
  };
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
      cartography: emptyCartography(skipPeriod, input.visibility, range.start, range.end),
      ...(input.visibility === 'owner' && !skipPeriod ? { cartographyThumbnails: [] } : {}),
      chronology: emptyChronology(skipPeriod, input.visibility, range.start, range.end),
      participation: emptyParticipation(skipPeriod, input.visibility, range.start, range.end),
      ...(input.visibility === 'owner' && !skipPeriod ? { participationHistory: [] } : {}),
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

  const worldbuildingWordRows = skipPeriod
    ? []
    : listResolvedWritingWordRows({
        contributions: writingContributions,
        events: periodEvents,
        start: range.start ?? new Date(0),
        end: range.end,
      });
  const worldbuildingPagesById = skipPeriod
    ? new Map(createdPages.map((page) => [page.id, page]))
    : await loadReferencedWorldbuildingPages({
        campaignIds,
        createdPages,
        periodEvents,
        documentIds: worldbuildingWordRows.map(worldbuildingDocumentId),
      });
  const worldbuilding = assembleWorldbuildingStats({
    createdPages,
    pagesById: worldbuildingPagesById,
    periodEvents,
    wordRows: worldbuildingWordRows,
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
  const [{ cartography, thumbnails }, chronology, { participation, history }] =
    await Promise.all([
      loadCartographyProjection({
        userId: input.userId,
        viewerId: input.viewerId ?? input.userId,
        campaignIds,
        rangeStart: range.start,
        rangeEnd: range.end,
        skipPeriod,
        visibility: input.visibility,
        includeThumbnails: input.visibility === 'owner' && !skipPeriod,
      }),
      loadChronologyProjection({
        userId: input.userId,
        campaignIds,
        rangeStart: range.start,
        rangeEnd: range.end,
        skipPeriod,
        visibility: input.visibility,
      }),
      loadParticipationProjection({
        userId: input.userId,
        campaignIds,
        rangeStart: range.start,
        rangeEnd: range.end,
        skipPeriod,
        visibility: input.visibility,
        includeHistory: input.visibility === 'owner' && !skipPeriod,
      }),
    ]);
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

  const archetypes =
    input.visibility === 'owner' && !skipPeriod
      ? assembleArchetypes({
          wordsAdded: period['period.wordsAdded'],
          pagesEdited: period['period.pagesEdited'],
          sessionMinutes: visualizationSessions.reduce(
            (sum, session) =>
              sum + Math.max(0, Math.round(session.activeDurationMs / 60_000)),
            0,
          ),
          worldbuilding,
          cartography,
          chronology,
          participation,
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
    cartography,
    ...(thumbnails ? { cartographyThumbnails: thumbnails } : {}),
    chronology,
    participation,
    ...(history ? { participationHistory: history } : {}),
    ...(archetypes ? { archetypes } : {}),
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
