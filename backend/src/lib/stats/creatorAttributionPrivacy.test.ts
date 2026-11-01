import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  PERSONAL_ATTRIBUTION_METRIC_IDS,
  PUBLIC_PERSONAL_ATTRIBUTION_METRIC_IDS,
  filterMetricsByPrivacy,
  isMetricAllowedInContext,
} from '../../../../shared/metricRegistry.js';
import { metricValue } from '../../../../shared/metricValue.js';
import type { MetricId } from '../../../../shared/metricRegistry.js';
import type { MetricValue } from '../../../../shared/metricValue.js';

function fullOwnerPayload(): Partial<Record<MetricId, MetricValue>> {
  const metrics: Partial<Record<MetricId, MetricValue>> = {};
  for (const id of PERSONAL_ATTRIBUTION_METRIC_IDS) {
    metrics[id] = metricValue(id === 'attribution.favoriteWritingHour' ? 14 : 12);
  }
  return metrics;
}

describe('creator attribution privacy strip (controller contract)', () => {
  it('public profile keeps the seven public lifetime counts and hides edits plus habits', () => {
    const publicView = filterMetricsByPrivacy(fullOwnerPayload(), 'publicProfile');
    assert.deepEqual(
      Object.keys(publicView).sort(),
      [...PUBLIC_PERSONAL_ATTRIBUTION_METRIC_IDS].sort(),
    );
    assert.equal(publicView['attribution.totalEdits'], undefined);
    assert.equal(publicView['attribution.wordsAdded'], undefined);
    assert.equal(publicView['attribution.writingStreak'], undefined);
    assert.equal(publicView['attribution.writingCadence'], undefined);
    assert.equal(publicView['attribution.substantialRevisions'], undefined);
    assert.equal(publicView['attribution.favoriteWritingHour'], undefined);
  });

  it('owner profile keeps all 13 personal metrics', () => {
    const ownerView = filterMetricsByPrivacy(fullOwnerPayload(), 'ownerProfile');
    assert.equal(Object.keys(ownerView).length, PERSONAL_ATTRIBUTION_METRIC_IDS.length);
    for (const id of PERSONAL_ATTRIBUTION_METRIC_IDS) {
      assert.equal(isMetricAllowedInContext(id, 'ownerProfile'), true);
      assert.ok(ownerView[id]);
    }
  });

  it('documents that public totals are currently allowed even though they can include private campaigns', () => {
    for (const id of PUBLIC_PERSONAL_ATTRIBUTION_METRIC_IDS) {
      assert.equal(isMetricAllowedInContext(id, 'publicProfile'), true);
      assert.equal(isMetricAllowedInContext(id, 'publicApi'), true);
    }
  });
});
