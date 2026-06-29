import { prisma } from '../prisma.js';
import { buildCampaignSizeSnapshot } from '../buildCampaignSizeSnapshot.js';
import { resolveWikiCodexType } from '../resolveWikiCodexType.js';
import {
  NarrativeEventType,
  getSpoilerSafeWorldActivitySummary,
} from '../narrativeEventService.js';
import type { MetricId } from '../../../../shared/metricRegistry.js';
import { metricValue } from '../../../../shared/metricValue.js';
import type { CampaignWorldStatsResponse } from '../../../../shared/statsTypes.js';
import { buildCampaignRecentEditors } from './buildCampaignRecentEditors.js';

function sumPositiveWordDeltasFromEvents(
  events: Array<{ metadata: unknown }>,
): number {
  let sum = 0;
  for (const event of events) {
    if (!event.metadata || typeof event.metadata !== 'object') continue;
    const raw = (event.metadata as Record<string, unknown>).wordDelta;
    if (typeof raw === 'number' && Number.isFinite(raw) && raw > 0) {
      sum += raw;
    }
  }
  return sum;
}

async function countPeriodEntityCreates(
  campaignId: string,
  since: Date,
  codexType: string,
): Promise<number> {
  const events = await prisma.narrativeEvent.findMany({
    where: {
      campaignId,
      type: NarrativeEventType.PAGE_CREATED,
      createdAt: { gte: since },
      pageId: { not: null },
    },
    select: { pageId: true },
  });
  const pageIds = events
    .map((event) => event.pageId)
    .filter((id): id is string => id != null);
  if (pageIds.length === 0) return 0;

  const pages = await prisma.wikiPage.findMany({
    where: { id: { in: pageIds }, deletedAt: null },
    select: { templateType: true, metadata: true },
  });

  return pages.filter(
    (page) =>
      resolveWikiCodexType({
        templateType: page.templateType,
        metadata: page.metadata,
      }) === codexType,
  ).length;
}

export async function buildCampaignWorldStats(
  campaignId: string,
  periodDays = 30,
): Promise<CampaignWorldStatsResponse> {
  const since = new Date(Date.now() - periodDays * 24 * 60 * 60 * 1000);

  const [sizeSnapshot, wordAgg, connectionCount, activity, editedEvents, recentEditors] =
    await Promise.all([
    buildCampaignSizeSnapshot(campaignId),
    prisma.wikiPageStats.aggregate({
      where: {
        campaignId,
        page: { deletedAt: null },
      },
      _sum: { wordCount: true },
    }),
    prisma.wikiLink.count({
      where: {
        sourcePage: { campaignId, deletedAt: null },
        targetPage: { deletedAt: null },
      },
    }),
    getSpoilerSafeWorldActivitySummary(campaignId, since),
    prisma.narrativeEvent.findMany({
      where: {
        campaignId,
        type: NarrativeEventType.PAGE_EDITED,
        source: 'user',
        createdAt: { gte: since },
      },
      select: { metadata: true },
    }),
    buildCampaignRecentEditors(campaignId, periodDays),
  ]);

  const snapshot: Partial<Record<MetricId, ReturnType<typeof metricValue>>> = {
    'snapshot.totalWords': metricValue(wordAgg._sum.wordCount ?? 0),
    'snapshot.pageCount': metricValue(sizeSnapshot.pageCount),
    'snapshot.characterCount': metricValue(sizeSnapshot.characterCount),
    'snapshot.locationCount': metricValue(sizeSnapshot.locationCount),
    'snapshot.organizationCount': metricValue(sizeSnapshot.organizationCount),
    'snapshot.connectionCount': metricValue(connectionCount),
    'snapshot.mapCount': metricValue(sizeSnapshot.mapCount),
  };

  const [charactersCreated, locationsCreated] = await Promise.all([
    countPeriodEntityCreates(campaignId, since, 'CHARACTER'),
    countPeriodEntityCreates(campaignId, since, 'LOCATION'),
  ]);

  const period: Partial<Record<MetricId, ReturnType<typeof metricValue>>> = {
    'period.pagesEdited': metricValue(activity.pagesEdited),
    'period.connectionsCreated': metricValue(activity.linksCreated),
    'period.pagesCreated': metricValue(0), // filled below if we can count PAGE_CREATED
    'period.wordsGrowthEstimate': metricValue(0),
    'period.wordsAdded': metricValue(sumPositiveWordDeltasFromEvents(editedEvents)),
    'period.charactersCreated': metricValue(charactersCreated),
    'period.locationsCreated': metricValue(locationsCreated),
  };

  const pagesCreated = await prisma.narrativeEvent.count({
    where: {
      campaignId,
      type: NarrativeEventType.PAGE_CREATED,
      createdAt: { gte: since },
    },
  });
  period['period.pagesCreated'] = metricValue(pagesCreated);

  // Approximate words added: sum current word counts on pages edited in period
  const editedPageStats = await prisma.wikiPageStats.findMany({
    where: {
      campaignId,
      lastEditedAt: { gte: since },
      page: { deletedAt: null },
    },
    select: { wordCount: true },
  });
  // Legacy estimate — superseded by period.wordsAdded when save deltas exist
  period['period.wordsGrowthEstimate'] = metricValue(
    editedPageStats.reduce((sum, row) => sum + row.wordCount, 0),
  );

  return {
    computedAt: new Date().toISOString(),
    refreshCadence: 'cached_5m',
    periodDays,
    snapshot,
    period,
    recentEditors,
  };
}

/** Sum word count for campaign status endpoint (replaces block rescan). */
export async function sumCampaignWordCount(campaignId: string): Promise<number> {
  const result = await prisma.wikiPageStats.aggregate({
    where: {
      campaignId,
      page: { deletedAt: null },
    },
    _sum: { wordCount: true },
  });
  return result._sum.wordCount ?? 0;
}
