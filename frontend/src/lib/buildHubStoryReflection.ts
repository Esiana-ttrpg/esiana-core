import type { CreatorAttributionResponse } from '@shared/statsTypes';
import { readMetricAmount } from '@shared/metricValue';

export const HUB_STORY_METRIC_ORDER = [
  'streak',
  'pagesCreated',
  'characters',
  'wordsWritten',
] as const;

export type HubStoryMetricId = (typeof HUB_STORY_METRIC_ORDER)[number];

export type HubStoryMetric = {
  id: HubStoryMetricId;
  amount: number;
};

export type HubStoryReflection = {
  metrics: HubStoryMetric[];
};

/** Singular/plural unit for the streak numeral (0 → days). */
export function streakUnitForCount(count: number): 'day' | 'days' {
  return count === 1 ? 'day' : 'days';
}

/**
 * Private owner reflection metrics for the Global Hub strip.
 * Returns null when attribution data is absent/unavailable.
 */
export function buildHubStoryReflection(
  attribution: CreatorAttributionResponse | null | undefined,
): HubStoryReflection | null {
  if (!attribution) return null;

  const streak = readMetricAmount(attribution.metrics['attribution.writingStreak']) ?? 0;
  const pagesCreated = readMetricAmount(attribution.metrics['attribution.pagesCreated']) ?? 0;
  const characters = readMetricAmount(attribution.metrics['attribution.charactersCreated']) ?? 0;
  const wordsWritten =
    readMetricAmount(attribution.metrics['attribution.totalWordsCreated']) ?? 0;

  return {
    metrics: [
      { id: 'streak', amount: streak },
      { id: 'pagesCreated', amount: pagesCreated },
      { id: 'characters', amount: characters },
      { id: 'wordsWritten', amount: wordsWritten },
    ],
  };
}
