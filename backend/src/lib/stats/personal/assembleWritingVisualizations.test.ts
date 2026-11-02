import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { assembleWritingVisualizations } from './assembleWritingVisualizations.js';
import { visualizationQueryWindow } from './reportingRange.js';

describe('assembleWritingVisualizations', () => {
  const timeZone = 'America/Chicago';
  const window = visualizationQueryWindow({
    rangeStart: new Date('2026-06-01T05:00:00.000Z'),
    rangeEnd: new Date('2026-06-08T05:00:00.000Z'),
    timeZone,
  });

  it('groups contributions and sessions onto reporting-timezone days', () => {
    const result = assembleWritingVisualizations({
      timeZone,
      window,
      contributions: [
        {
          occurredAt: new Date('2026-06-02T17:00:00.000Z'),
          wordsAdded: 40,
          wordsRemoved: 10,
          availability: 'measured',
          origin: 'human',
        },
        {
          occurredAt: new Date('2026-06-02T18:00:00.000Z'),
          wordsAdded: 12,
          wordsRemoved: 0,
          availability: 'reconstructed',
          origin: 'human',
        },
      ],
      sessions: [
        {
          id: 'sess-1',
          startedAt: new Date('2026-06-02T16:30:00.000Z'),
          endedAt: new Date('2026-06-02T17:10:00.000Z'),
          activeDurationMs: 120_000,
          completeness: 'measured',
          documentIds: ['page-1'],
        },
      ],
      documentsById: new Map([
        ['page-1', { id: 'page-1', title: 'Mira at the quay', href: '/campaigns/demo/pages/page-1' }],
      ]),
    });

    const day = result.heatmap.find((row) => row.date === '2026-06-02');
    assert.equal(day?.wordsAdded, 52);
    assert.equal(day?.wordsRemoved, 10);
    assert.equal(day?.sessionCount, 1);
    assert.equal(day?.sessionMinutes, 2);
    assert.equal(day?.completeness, 'partial');
    assert.equal(result.sessions[0]?.documents[0]?.title, 'Mira at the quay');
    assert.equal(result.hourly[12].wordsAdded, 40);
    assert.equal(result.hourly[13].wordsAdded, 12);
  });

  it('fills Monday-Sunday and 24-hour buckets even when a day is quiet', () => {
    const result = assembleWritingVisualizations({
      timeZone,
      window,
      contributions: [],
      sessions: [],
      documentsById: new Map(),
    });
    assert.equal(result.weeklyRhythm.length, 7);
    assert.equal(result.hourly.length, 24);
    assert.ok(result.heatmap.length >= 7);
    assert.equal(result.weeklyRhythm[0]?.weekday, 0);
    assert.equal(result.hourly[23]?.hour, 23);
  });
});
