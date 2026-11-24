import { resolveWikiCodexType } from '../resolveWikiCodexType.js';
import type { MetricId } from '../../../../shared/metricRegistry.js';
import { metricValue } from '../../../../shared/metricValue.js';
import type { WorldbuildingMixEntry } from '../../../../shared/statsTypes.js';

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

export function buildWorldbuildingMix(
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
