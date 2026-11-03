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
    worldbuilding: [
      {
        domain: 'characters',
        created: metricValue(2),
        periodCreated: metricValue(1),
        periodEdited: metricValue(3),
        periodContributed: metricValue(40),
      },
    ],
    cartography: [
      {
        domain: 'maps',
        created: metricValue(1),
        periodCreated: metricValue(0),
        periodEdited: metricValue(2),
      },
    ],
    chronology: [
      {
        domain: 'events',
        created: metricValue(2),
        periodCreated: metricValue(1),
        periodEdited: metricValue(0),
      },
    ],
    participation: [
      {
        domain: 'sessionsAttended',
        total: metricValue(2),
        periodTotal: metricValue(1),
        plannedDurationMinutes: metricValue(240),
        periodPlannedDurationMinutes: metricValue(120),
        playedDurationMinutes: metricValue(0),
      },
    ],
    participationHistory: [
      {
        timelinePointId: 'tp-1',
        campaignId: 'camp-1',
        plannedStartAt: '2026-06-10T18:00:00.000Z',
        plannedEndAt: '2026-06-10T22:00:00.000Z',
        roles: ['attended', 'hosted'],
        plannedDurationMinutes: 240,
      },
    ],
    archetypes: {
      rulesetVersion: 1,
      dominantId: 'chronicler',
      scores: [
        { id: 'chronicler', score: 0.6, availability: 'measured' },
        { id: 'worldsmith', score: 0.4, availability: 'measured' },
        { id: 'cartographer', score: 0, availability: 'measured' },
        { id: 'timekeeper', score: null, availability: 'unavailable' },
        { id: 'storyweaver', score: 0, availability: 'measured' },
        { id: 'adventurer', score: 0, availability: 'measured' },
        { id: 'wanderer', score: 0, availability: 'measured' },
      ],
    },
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
    assert.equal(json.worldbuilding[0]?.domain, 'characters');
    assert.equal(json.cartography[0]?.domain, 'maps');
    assert.equal(json.chronology[0]?.domain, 'events');
    assert.equal(json.participation[0]?.domain, 'sessionsAttended');
    assert.equal(json.participationHistory[0]?.timelinePointId, 'tp-1');
    assert.equal(json.archetypes?.dominantId, 'chronicler');
    assert.equal(serialized.includes('Untitled map'), false);
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
    assert.ok(csv.includes('[worldbuilding]'));
    assert.ok(csv.includes('[cartography]'));
    assert.ok(csv.includes('[chronology]'));
    assert.ok(csv.includes('[participation]'));
    assert.ok(csv.includes('[participationHistory]'));
    assert.ok(csv.includes('[archetypes]'));
    assert.ok(csv.includes('chronicler'));
    assert.ok(csv.includes('characters'));
    assert.ok(csv.includes('maps'));
    assert.ok(csv.includes('events'));
    assert.ok(csv.includes('sessionsAttended'));
    assert.ok(csv.includes('tp-1'));
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
