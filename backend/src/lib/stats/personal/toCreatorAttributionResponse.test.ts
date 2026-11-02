import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { metricPartial, metricValue } from '../../../../../shared/metricValue.js';
import type { PersonalStatisticsResponse } from '../../../../../shared/statsTypes.js';
import { toCreatorAttributionResponse } from './queryPersonalStatistics.js';

describe('toCreatorAttributionResponse', () => {
  it('maps snapshot plus habits onto the compatibility payload and normalizes partial words', () => {
    const payload: PersonalStatisticsResponse = {
      version: 1,
      computedAt: '2026-06-15T18:00:00.000Z',
      refreshCadence: 'realtime',
      timeZone: 'America/Chicago',
      visibilityContext: 'owner',
      range: { mode: 'all_time', start: null, end: '2026-06-15T18:00:00.000Z' },
      campaignId: null,
      snapshot: {
        'attribution.totalWordsCreated': metricValue(120),
        'attribution.pagesCreated': metricValue(3),
      },
      period: { 'period.wordsAdded': metricPartial(20) },
      habits: {
        'attribution.wordsAdded': metricPartial(20),
        'attribution.writingStreak': metricValue(4),
        'attribution.wordsAddedMeasured': metricValue(8),
      },
      worldbuildingMix: [],
      worldbuilding: [],
      linkableCampaigns: [],
    };

    const compat = toCreatorAttributionResponse(payload);
    assert.equal(compat.metrics['attribution.totalWordsCreated']?.status, 'value');
    assert.equal(compat.metrics['attribution.wordsAdded']?.status, 'value');
    assert.equal(compat.metrics['attribution.writingStreak']?.status, 'value');
    assert.equal(compat.metrics['period.wordsAdded'], undefined);
    assert.equal(compat.metrics['attribution.wordsAddedMeasured'], undefined);
    assert.equal(compat.timeZone, undefined);
  });
});
