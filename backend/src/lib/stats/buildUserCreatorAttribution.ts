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
    return {
      computedAt: new Date().toISOString(),
      refreshCadence: 'realtime',
      metrics: {
        'attribution.totalWordsCreated': metricValue(0),
        'attribution.pagesCreated': metricValue(0),
        'attribution.totalEdits': metricValue(0),
        'attribution.charactersCreated': metricValue(0),
        'attribution.locationsCreated': metricValue(0),
        'attribution.organizationsCreated': metricValue(0),
        'attribution.connectionsCreated': metricValue(0),
        'attribution.campaignsContributedCount': metricValue(0),
      },
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

  const totalWords = createdPages.reduce(
    (sum, page) => sum + (page.stats?.wordCount ?? 0),
    0,
  );

  const contributedCampaignIdSet = new Set<string>();
  for (const page of createdPages) {
    contributedCampaignIdSet.add(page.campaignId);
  }
  for (const row of contributedCampaignIds) {
    contributedCampaignIdSet.add(row.campaignId);
  }

  const metrics: Partial<Record<MetricId, ReturnType<typeof metricValue>>> = {
    'attribution.totalWordsCreated': metricValue(totalWords),
    'attribution.pagesCreated': metricValue(createdPages.length),
    'attribution.totalEdits': metricValue(editCount),
    'attribution.charactersCreated': metricValue(
      countByCodexType(createdPages, 'CHARACTER'),
    ),
    'attribution.locationsCreated': metricValue(
      countByCodexType(createdPages, 'LOCATION'),
    ),
    'attribution.organizationsCreated': metricValue(
      countByCodexType(createdPages, 'ORGANIZATION'),
    ),
    'attribution.connectionsCreated': metricValue(linkCount),
    'attribution.campaignsContributedCount': metricValue(contributedCampaignIdSet.size),
  };

  const linkableCampaigns = await resolveLinkableCampaigns(userId, viewerUserId);

  return {
    computedAt: new Date().toISOString(),
    refreshCadence: 'realtime',
    metrics,
    worldbuildingMix: buildWorldbuildingMix(createdPages),
    linkableCampaigns,
  };
}
