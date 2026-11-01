import { prisma } from '../prisma.js';
import { resolveWikiCodexType } from '../resolveWikiCodexType.js';
import { NarrativeEventType } from '../narrativeEventService.js';
import type { MetricId } from '../../../../shared/metricRegistry.js';
import { metricValue } from '../../../../shared/metricValue.js';
import type {
  CreatorAttributionResponse,
  WorldbuildingMixEntry,
} from '../../../../shared/statsTypes.js';
import { resolveLinkableCampaigns } from './resolveLinkableCampaigns.js';
import { buildRollupHabits } from './buildRollupHabits.js';
import { metricUnavailable } from '../../../../shared/metricValue.js';

function countByCodexType(
  pages: Array<{ templateType: string; metadata: unknown }>,
  codexType: string,
): number {
  return pages.filter(
    (page) =>
      resolveWikiCodexType({
        templateType: page.templateType,
        metadata: page.metadata,
      }) === codexType,
  ).length;
}

export function assembleLifetimeAttributionMetrics(input: {
  createdPages: Array<{
    campaignId: string;
    templateType: string;
    metadata: unknown;
    stats?: { wordCount: number } | null;
  }>;
  editCount: number;
  linkCount: number;
  actorEventCampaignIds: string[];
}): Partial<Record<MetricId, ReturnType<typeof metricValue>>> {
  const totalWords = input.createdPages.reduce(
    (sum, page) => sum + (page.stats?.wordCount ?? 0),
    0,
  );

  const contributedCampaignIdSet = new Set<string>();
  for (const page of input.createdPages) {
    contributedCampaignIdSet.add(page.campaignId);
  }
  for (const campaignId of input.actorEventCampaignIds) {
    contributedCampaignIdSet.add(campaignId);
  }

  return {
    'attribution.totalWordsCreated': metricValue(totalWords),
    'attribution.pagesCreated': metricValue(input.createdPages.length),
    'attribution.totalEdits': metricValue(input.editCount),
    'attribution.charactersCreated': metricValue(
      countByCodexType(input.createdPages, 'CHARACTER'),
    ),
    'attribution.locationsCreated': metricValue(
      countByCodexType(input.createdPages, 'LOCATION'),
    ),
    'attribution.organizationsCreated': metricValue(
      countByCodexType(input.createdPages, 'ORGANIZATION'),
    ),
    'attribution.connectionsCreated': metricValue(input.linkCount),
    'attribution.campaignsContributedCount': metricValue(contributedCampaignIdSet.size),
  };
}

function buildWorldbuildingMix(
  pages: Array<{ templateType: string; metadata: unknown }>,
): WorldbuildingMixEntry[] {
  const counts = new Map<string, number>();
  for (const page of pages) {
    const codexType = resolveWikiCodexType({
      templateType: page.templateType,
      metadata: page.metadata,
    });
    if (codexType === 'DEFAULT' || codexType === 'SESSION_NOTE') continue;
    counts.set(codexType, (counts.get(codexType) ?? 0) + 1);
  }
  return [...counts.entries()]
    .map(([codexType, count]) => ({ codexType, count }))
    .sort((a, b) => b.count - a.count);
}

export async function buildUserCreatorAttribution(
  userId: string,
  viewerUserId?: string | null,
  options?: { includeOwnerHabits?: boolean },
): Promise<CreatorAttributionResponse> {
  const memberships = await prisma.campaignMember.findMany({
    where: {
      userId,
      campaign: { archivedAt: null },
    },
    select: { campaignId: true },
  });
  const campaignIds = memberships.map((m) => m.campaignId);

  if (campaignIds.length === 0) {
    const linkableCampaigns = await resolveLinkableCampaigns(userId, viewerUserId);
    const metrics = assembleLifetimeAttributionMetrics({
      createdPages: [],
      editCount: 0,
      linkCount: 0,
      actorEventCampaignIds: [],
    });

    const includeHabits =
      options?.includeOwnerHabits === true ||
      (viewerUserId != null && viewerUserId === userId);
    if (includeHabits) {
      metrics['attribution.wordsAdded'] = metricUnavailable('not_yet_tracked');
      metrics['attribution.writingStreak'] = metricUnavailable('not_yet_tracked');
      metrics['attribution.writingCadence'] = metricUnavailable('not_yet_tracked');
      metrics['attribution.substantialRevisions'] = metricUnavailable('not_yet_tracked');
      metrics['attribution.favoriteWritingHour'] = metricUnavailable('not_yet_tracked');
    }

    return {
      computedAt: new Date().toISOString(),
      refreshCadence: 'realtime',
      metrics,
      worldbuildingMix: [],
      linkableCampaigns,
    };
  }

  const [createdPages, editCount, linkCount, contributedCampaignIds] =
    await Promise.all([
      prisma.wikiPage.findMany({
        where: {
          campaignId: { in: campaignIds },
          createdByUserId: userId,
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
          actorUserId: userId,
          type: NarrativeEventType.PAGE_EDITED,
        },
      }),
      prisma.narrativeEvent.count({
        where: {
          campaignId: { in: campaignIds },
          actorUserId: userId,
          type: NarrativeEventType.LINK_CREATED,
        },
      }),
      prisma.narrativeEvent.findMany({
        where: {
          campaignId: { in: campaignIds },
          actorUserId: userId,
        },
        select: { campaignId: true },
        distinct: ['campaignId'],
      }),
    ]);

  const metrics = assembleLifetimeAttributionMetrics({
    createdPages,
    editCount,
    linkCount,
    actorEventCampaignIds: contributedCampaignIds.map((row) => row.campaignId),
  });

  const linkableCampaigns = await resolveLinkableCampaigns(userId, viewerUserId);

  const includeHabits =
    options?.includeOwnerHabits === true ||
    (viewerUserId != null && viewerUserId === userId);

  if (includeHabits) {
    const habits = await buildRollupHabits(userId);
    if (habits.hasRollupData) {
      metrics['attribution.wordsAdded'] = metricValue(habits.wordsAdded30d);
      metrics['attribution.writingStreak'] = metricValue(habits.writingStreak);
      metrics['attribution.writingCadence'] = metricValue(habits.writingCadence);
      metrics['attribution.substantialRevisions'] = metricValue(
        habits.substantialRevisions30d,
      );
      metrics['attribution.favoriteWritingHour'] =
        habits.favoriteWritingHour != null
          ? metricValue(habits.favoriteWritingHour)
          : metricUnavailable('insufficient_data');
    } else {
      metrics['attribution.wordsAdded'] = metricUnavailable('not_yet_tracked');
      metrics['attribution.writingStreak'] = metricUnavailable('not_yet_tracked');
      metrics['attribution.writingCadence'] = metricUnavailable('not_yet_tracked');
      metrics['attribution.substantialRevisions'] = metricUnavailable('not_yet_tracked');
      metrics['attribution.favoriteWritingHour'] = metricUnavailable('not_yet_tracked');
    }
  }

  return {
    computedAt: new Date().toISOString(),
    refreshCadence: 'realtime',
    metrics,
    worldbuildingMix: buildWorldbuildingMix(createdPages),
    linkableCampaigns,
  };
}
