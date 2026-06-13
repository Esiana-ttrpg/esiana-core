import assert from 'node:assert/strict';
import { test } from 'node:test';
import type { ConvergenceTimelineEntry } from '../../../shared/chronologyConvergence.js';
import {
  adaptConvergenceEntryToNarrativeFeedCard,
  adaptVisibleNarrativeFeedCards,
  buildDowntimeSimulationSnapshot,
  buildDowntimeWorldEventsPayload,
} from './buildDowntimePresentation.js';

function mockEntry(
  overrides: Partial<ConvergenceTimelineEntry> = {},
): ConvergenceTimelineEntry {
  return {
    entryId: 'entry-1',
    sortOrdinal: '100',
    instant: {
      epochMinute: '1440',
      dateParts: { year: 1, month: 0, day: 2 },
    },
    display: {
      title: 'Border skirmish',
      summary: 'Tensions rose along the northern pass.',
      dateLabel: '2 Harvest, Year 1',
    },
    source: {
      domain: 'world_event',
      entityType: 'calendar_event',
      entityId: 'ev-1',
      subEntityId: null,
      collectorVersion: '1',
      collectedFrom: 'test',
    },
    domain: 'world_event',
    domainPayload: null,
    projection: {
      visible: true,
      visibilityTier: 'PARTY',
      revelationState: null,
      temporalMode: 'present_only',
      suppressReason: null,
    },
    links: [{ hrefKind: 'event_lore', path: '/campaigns/test/chronology' }],
    sessionLink: null,
    ...overrides,
  } as ConvergenceTimelineEntry;
}

test('adaptConvergenceEntryToNarrativeFeedCard adds relative timestamps', () => {
  const card = adaptConvergenceEntryToNarrativeFeedCard(mockEntry(), 2880n);
  assert.equal(card.relativeDateLabel, '1 day ago');
  assert.equal(card.calendarDateLabel, '2 Harvest, Year 1');
  assert.match(card.narrative ?? '', /northern pass/);
});

test('adaptConvergenceEntryToNarrativeFeedCard falls back to calendar date without epoch', () => {
  const card = adaptConvergenceEntryToNarrativeFeedCard(
    mockEntry({
      instant: {
        epochMinute: null,
        dateParts: { year: 1, month: 2, day: 5 },
      },
      display: {
        title: 'Corffee',
        summary: 'The festival begins.',
        dateLabel: 'Yr 1 · Harvest 5',
      },
    }),
    2880n,
  );
  assert.equal(card.relativeDateLabel, 'Yr 1 · Harvest 5');
  assert.equal(card.calendarDateLabel, undefined);
  assert.notEqual(card.relativeDateLabel, 'Undated');
});

test('adaptVisibleNarrativeFeedCards orders newest-first', () => {
  const older = mockEntry({
    entryId: 'older',
    sortOrdinal: '100',
    instant: { epochMinute: '1440', dateParts: null },
    display: {
      title: 'Older event',
      summary: 'Happened earlier.',
      dateLabel: 'Day 1',
    },
  });
  const newer = mockEntry({
    entryId: 'newer',
    sortOrdinal: '200',
    instant: { epochMinute: '2880', dateParts: null },
    display: {
      title: 'Newer event',
      summary: 'Happened later.',
      dateLabel: 'Day 2',
    },
  });
  const cards = adaptVisibleNarrativeFeedCards([older, newer], 4000n);
  assert.equal(cards.length, 2);
  assert.equal(cards[0]?.id, 'newer');
  assert.equal(cards[1]?.id, 'older');
});

test('buildDowntimeSimulationSnapshot returns newest world activity', () => {
  const entries = Array.from({ length: 6 }, (_, index) =>
    mockEntry({
      entryId: `entry-${index.toString()}`,
      sortOrdinal: (100 + index).toString(),
      instant: { epochMinute: String((index + 1) * 1440), dateParts: null },
      display: {
        title: `Event ${index.toString()}`,
        summary: `Summary ${index.toString()}`,
        dateLabel: `Day ${index.toString()}`,
      },
    }),
  );
  const snapshot = buildDowntimeSimulationSnapshot({
    campaignHandle: 'test-campaign',
    currentEpochMinute: 10000n,
    chronometer: null,
    sinceEpochMinute: null,
    currentDowntimePeriod: null,
    overlayEntries: entries,
    creativeDrift: null,
    latestWorldAdvanceHeadline: null,
  });
  assert.equal(snapshot.recentWorldActivity.length, 5);
  assert.equal(snapshot.recentWorldActivity[0]?.id, 'entry-5');
  assert.ok(snapshot.recentWorldActivity[0]?.relativeDateLabel);
});

test('buildDowntimeWorldEventsPayload builds narrative feed', () => {
  const payload = buildDowntimeWorldEventsPayload(
    'test-campaign',
    [mockEntry()],
    2880n,
  );
  assert.equal(payload.feed.length, 1);
  assert.equal(payload.feed[0]?.relativeDateLabel, '1 day ago');
  assert.equal(payload.chronologyHref, '/campaigns/test-campaign/chronology?view=feed');
});
