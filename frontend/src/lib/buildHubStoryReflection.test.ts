import assert from 'node:assert/strict';
import test from 'node:test';

import type { CreatorAttributionResponse } from '@shared/statsTypes';
import { metricUnavailable, metricValue } from '@shared/metricValue';
import {
  buildHubStoryReflection,
  HUB_STORY_METRIC_ORDER,
  streakUnitForCount,
} from './buildHubStoryReflection.ts';

function attribution(
  overrides: CreatorAttributionResponse['metrics'] = {},
): CreatorAttributionResponse {
  return {
    computedAt: '2026-10-02T00:00:00.000Z',
    refreshCadence: 'realtime',
    metrics: overrides,
    worldbuildingMix: [],
    linkableCampaigns: [],
  };
}

test('returns null when reflection data is absent', () => {
  assert.equal(buildHubStoryReflection(null), null);
  assert.equal(buildHubStoryReflection(undefined), null);
});

test('orders the four lifetime metrics with streak first', () => {
  const reflection = buildHubStoryReflection(
    attribution({
      'attribution.writingStreak': metricValue(4),
      'attribution.pagesCreated': metricValue(12),
      'attribution.charactersCreated': metricValue(7),
      'attribution.totalWordsCreated': metricValue(3200),
    }),
  );

  assert.ok(reflection);
  assert.deepEqual(
    reflection.metrics.map((m) => m.id),
    [...HUB_STORY_METRIC_ORDER],
  );
  assert.deepEqual(
    reflection.metrics.map((m) => m.amount),
    [4, 12, 7, 3200],
  );
});

test('keeps a zero-day streak in the first position', () => {
  const reflection = buildHubStoryReflection(
    attribution({
      'attribution.writingStreak': metricValue(0),
      'attribution.pagesCreated': metricValue(2),
      'attribution.charactersCreated': metricValue(1),
      'attribution.totalWordsCreated': metricValue(40),
    }),
  );

  assert.ok(reflection);
  assert.equal(reflection.metrics[0]?.id, 'streak');
  assert.equal(reflection.metrics[0]?.amount, 0);
  assert.equal(streakUnitForCount(0), 'days');
});

test('treats missing or unavailable metric values as zero without dropping the strip', () => {
  const reflection = buildHubStoryReflection(
    attribution({
      'attribution.writingStreak': metricUnavailable('not_yet_tracked'),
      'attribution.pagesCreated': metricValue(3),
    }),
  );

  assert.ok(reflection);
  assert.deepEqual(
    reflection.metrics.map((m) => m.amount),
    [0, 3, 0, 0],
  );
});

test('streak unit is singular only for exactly one day', () => {
  assert.equal(streakUnitForCount(1), 'day');
  assert.equal(streakUnitForCount(2), 'days');
  assert.equal(streakUnitForCount(0), 'days');
});
