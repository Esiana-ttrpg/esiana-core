import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { metricValue } from '../../../../../shared/metricValue.js';
import type { PersonalStatisticsResponse } from '../../../../../shared/statsTypes.js';
import {
  assembleExportDailyAggregates,
  buildPersonalStatisticsExportJson,
  mergeExportContributionDetails,
  renderPersonalStatisticsExportCsv,
} from './exportPersonalStatistics.js';

describe('personal statistics export', () => {
  const payload: PersonalStatisticsResponse = {
    version: 1,
    computedAt: '2026-06-15T18:00:00.000Z',
    refreshCadence: 'realtime',
    timeZone: 'America/Chicago',
    visibilityContext: 'owner',
    range: { mode: 'month', start: '2026-06-01T05:00:00.000Z', end: '2026-06-15T18:00:00.000Z' },
    campaignId: null,
    snapshot: { 'attribution.pagesCreated': metricValue(3) },
    period: { 'period.wordsAdded': metricValue(40) },
    habits: { 'attribution.writingStreak': metricValue(2) },
    worldbuildingMix: [],
    linkableCampaigns: [],
  };

  const contributions = [
    {
      id: 'c1',
      occurredAt: new Date('2026-06-02T17:00:00.000Z'),
      campaignId: 'camp-1',
      documentId: 'page-1',
      sourceId: 'wiki.page',
      wordsAdded: 40,
      wordsRemoved: 5,
      netChange: 35,
      origin: 'human',
      availability: 'measured',
      writingSessionId: 'sess-1',
      narrativeEventId: 'ev-1',
    },
  ];
  const sessions = [
    {
      id: 'sess-1',
      campaignId: 'camp-1',
      startedAt: new Date('2026-06-02T16:30:00.000Z'),
      endedAt: new Date('2026-06-02T17:10:00.000Z'),
      activeDurationMs: 180_000,
      completeness: 'measured',
      documentIds: ['page-1'],
    },
  ];

  it('omits titles and campaign names from the portable JSON', () => {
    const json = buildPersonalStatisticsExportJson({
      payload,
      exportedAt: new Date('2026-06-15T18:00:00.000Z'),
      contributions,
      sessions,
    });
    const serialized = JSON.stringify(json);
    assert.equal(json.contributions[0]?.documentId, 'page-1');
    assert.equal(json.writingSessions[0]?.documentIds[0], 'page-1');
    assert.equal(serialized.includes('Mira'), false);
    assert.ok(json.metricDefinitions.some((row) => row.id === 'attribution.pagesCreated'));
    assert.equal(json.dailyAggregates[0]?.wordsAdded, 40);
    assert.equal(json.dailyAggregates[0]?.sessionMinutes, 3);
  });

  it('renders CSV sections without private titles', () => {
    const json = buildPersonalStatisticsExportJson({
      payload,
      exportedAt: new Date('2026-06-15T18:00:00.000Z'),
      contributions,
      sessions,
    });
    const csv = renderPersonalStatisticsExportCsv(json);
    assert.ok(csv.includes('[metricDefinitions]'));
    assert.ok(csv.includes('[snapshot]'));
    assert.ok(csv.includes('[period]'));
    assert.ok(csv.includes('[habits]'));
    assert.ok(csv.includes('attribution.pagesCreated'));
    assert.ok(csv.includes('period.wordsAdded'));
    assert.ok(csv.includes('attribution.writingStreak'));
    assert.ok(csv.includes('[contributions]'));
    assert.ok(csv.includes('[dailyAggregates]'));
    assert.ok(csv.includes('[writingSessions]'));
    assert.ok(csv.includes('page-1'));
    assert.equal(csv.includes('Mira at the quay'), false);
  });

  it('reconstructs unmatched historical wordDelta events and keeps measured rows', () => {
    const merged = mergeExportContributionDetails({
      contributions,
      events: [
        {
          id: 'ev-1',
          type: 'PAGE_EDITED',
          createdAt: new Date('2026-06-02T17:00:00.000Z'),
          metadata: { wordDelta: 35 },
          campaignId: 'camp-1',
          pageId: 'page-1',
        },
        {
          id: 'ev-old',
          type: 'PAGE_EDITED',
          createdAt: new Date('2026-06-03T17:00:00.000Z'),
          metadata: { wordDelta: 20 },
          campaignId: 'camp-1',
          pageId: 'page-2',
        },
      ],
      start: new Date('2026-06-01T05:00:00.000Z'),
      end: new Date('2026-06-15T18:00:00.000Z'),
    });
    assert.equal(merged.length, 2);
    assert.equal(merged[0]?.id, 'c1');
    assert.equal(merged[0]?.wordsAdded, 40);
    assert.equal(merged[1]?.id, 'reconstructed:ev-old');
    assert.equal(merged[1]?.availability, 'reconstructed');
    assert.equal(merged[1]?.wordsAdded, 20);
    assert.equal(merged[1]?.wordsRemoved, 0);
    assert.equal(merged[1]?.documentId, 'page-2');
  });

  it('aggregates only days that have activity', () => {
    const rows = assembleExportDailyAggregates({
      timeZone: 'America/Chicago',
      contributions,
      sessions,
    });
    assert.equal(rows.length, 1);
    assert.equal(rows[0]?.date, '2026-06-02');
    assert.equal(rows[0]?.netChange, 35);
  });
});
