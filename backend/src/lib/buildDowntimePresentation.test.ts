import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import type { ConvergenceTimelineEntry } from '../../../shared/chronologyConvergence.js';
import {
  adaptConvergenceEntryToFeedCard,
  adaptConvergenceEntryToNarrativeFeedCard,
  adaptVisibleNarrativeFeedCards,
  buildDowntimePulse,
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
      temporalMode: 'present',
      suppressReason: null,
    },
    links: [{ hrefKind: 'event_lore', path: '/campaigns/test/chronology' }],
    sessionLink: null,
    ...overrides,
  };
}

describe('buildDowntimePresentation', () => {
  it('adapts convergence entries to feed cards without overlay types in output', () => {
    const card = adaptConvergenceEntryToFeedCard(mockEntry());
    assert.equal(card.title, 'Border skirmish');
    assert.match(card.summary, /northern pass/);
    assert.equal(card.dateLabel, '2 Harvest, Year 1');
    assert.equal(card.href, '/campaigns/test/chronology');
  });

  it('builds atmospheric pulse from elapsed time and pressure counts', () => {
    const pulse = buildDowntimePulse({
      elapsedDays: 12n,
      recentActivityCount: 0,
      creativeDriftActiveCount: null,
      continuityPressureCount: null,
      havenThreatCount: 1,
      stalledProjectCount: 2,
      factionPressureHint: null,
      latestWorldAdvanceHeadline: null,
    });
    assert.match(pulse.headline, /quiet for 12 days/);
    assert.ok(pulse.bullets.some((b) => b.includes('haven threat')));
    assert.ok(pulse.bullets.some((b) => b.includes('stalled')));
    assert.equal(pulse.bullets.length, 4);
  });

  it('sorts actionable event consequence cards before ambient drift', () => {
    const snapshot = buildDowntimeSimulationSnapshot({
      campaignHandle: 'test-campaign',
      currentEpochMinute: 1000n,
      chronometer: null,
      sinceEpochMinute: null,
      currentDowntimePeriod: null,
      overlayEntries: [],
      creativeDrift: {
        version: 'creative-drift-v1',
        buckets: [
          {
            id: 'reawakened',
            label: 'Reawakened',
            items: [
              {
                fingerprint: 'drift-1',
                title: 'Old thread',
                statusLabel: 'Still open',
                narrativeWeight: 'normal',
              },
            ],
          },
        ],
        summary: { totalActive: 1 },
        dispositions: {},
      },
      eventConsequenceCards: [
        {
          id: 'ec-1',
          title: 'Bridge seized',
          summary: 'Route disruption — pending',
          dateLabel: 'Awaiting apply',
          sourceType: 'event_consequence',
          priority: 'actionable',
        },
      ],
      pendingEventConsequenceCount: 1,
    });
    assert.equal(snapshot.recentConsequences[0]?.sourceType, 'event_consequence');
    assert.ok(snapshot.pulse.bullets.some((b) => b.includes('event consequence')));
  });

  it('adapts narrative feed cards with relative timestamps', () => {
    const card = adaptConvergenceEntryToNarrativeFeedCard(mockEntry(), 2880n);
    assert.equal(card.relativeDateLabel, '1 day ago');
    assert.equal(card.calendarDateLabel, '2 Harvest, Year 1');
    assert.match(card.narrative ?? '', /northern pass/);
  });

  it('uses calendar date when event has no epoch minute', () => {
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

  it('orders narrative feed cards newest-first', () => {
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

  it('returns newest world activity in overview snapshot', () => {
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

  it('builds world events payload with narrative feed', () => {
    const payload = buildDowntimeWorldEventsPayload(
      'test-campaign',
      [mockEntry()],
      2880n,
    );
    assert.equal(payload.feed.length, 1);
    assert.equal(payload.feed[0]?.relativeDateLabel, '1 day ago');
    assert.equal(payload.chronologyHref, '/campaigns/test-campaign/chronology?view=feed');
  });

  it('prioritizes pressure cards above quest_time and creative drift', () => {
    const snapshot = buildDowntimeSimulationSnapshot({
      campaignHandle: 'test-campaign',
      currentEpochMinute: 5000n,
      chronometer: null,
      sinceEpochMinute: null,
      currentDowntimePeriod: null,
      overlayEntries: [],
      creativeDrift: {
        summary: { totalActive: 1, byBucket: { dormant_plotlines: 1, unused_entities: 0, hanging_promises: 0, emotional_residue: 0 }, reawakenedCount: 0, acknowledgedCount: 0 },
        buckets: [{
          bucket: 'dormant_plotlines',
          label: 'Dormant plotlines',
          items: [{
            fingerprint: 'drift-1',
            bucket: 'dormant_plotlines',
            subjectKind: 'quest',
            subjectId: 'q1',
            title: 'Quiet quest',
            statusLabel: 'Quiet plotline',
            coolingBand: 'moderate',
            reactivationState: 'none',
            narrativeWeight: 'major',
            lastReferencedAt: null,
            introducedSessionId: null,
            linkedEntityIds: [],
          }],
        }],
        reawakened: [],
        dispositions: {},
      },
      latestWorldAdvanceHeadline: null,
      pressureCards: [{
        id: 'haven-threat:1:t1',
        title: 'Critical patrol',
        summary: 'Critical threat',
        dateLabel: 'Haven threat',
        sourceType: 'haven_threat',
        priority: 'critical',
      }],
      pressureCounts: {
        continuityPressureCount: 0,
        havenThreatCount: 1,
        stalledProjectCount: 0,
        actionableCount: 1,
      },
      questTimeFeedCards: [{
        id: 'quest-expired:q2:1000',
        title: 'Deadline passed',
        summary: 'Resolve or extend',
        dateLabel: 'Quest pressure',
        sourceType: 'quest_time',
        priority: 'actionable',
      }],
    });
    assert.equal(snapshot.recentConsequences[0]?.sourceType, 'haven_threat');
    assert.equal(snapshot.creativeDriftActiveCount, 1);
    assert.equal(snapshot.havenThreatCount, 1);
  });

  it('prioritizes quest_time feed cards above creative drift when no pressure cards', () => {
    const snapshot = buildDowntimeSimulationSnapshot({
      campaignHandle: 'test-campaign',
      currentEpochMinute: 5000n,
      chronometer: null,
      sinceEpochMinute: null,
      currentDowntimePeriod: null,
      overlayEntries: [],
      creativeDrift: {
        summary: { totalActive: 1, byBucket: { dormant_plotlines: 1, unused_entities: 0, hanging_promises: 0, emotional_residue: 0 }, reawakenedCount: 0, acknowledgedCount: 0 },
        buckets: [{
          bucket: 'dormant_plotlines',
          label: 'Dormant plotlines',
          items: [{
            fingerprint: 'drift-1',
            bucket: 'dormant_plotlines',
            subjectKind: 'quest',
            subjectId: 'q1',
            title: 'Quiet quest',
            statusLabel: 'Quiet plotline',
            coolingBand: 'moderate',
            reactivationState: 'none',
            narrativeWeight: 'major',
            lastReferencedAt: null,
            introducedSessionId: null,
            linkedEntityIds: [],
          }],
        }],
        reawakened: [],
        dispositions: {},
      },
      latestWorldAdvanceHeadline: null,
      questTimeFeedCards: [{
        id: 'quest-expired:q2:1000',
        title: 'Deadline passed',
        summary: 'Resolve or extend',
        dateLabel: 'Quest pressure',
        sourceType: 'quest_time',
        priority: 'actionable',
      }],
    });
    assert.equal(snapshot.recentConsequences[0]?.sourceType, 'quest_time');
  });

  it('returns simulation snapshot with planned operation counts', () => {
    const snapshot = buildDowntimeSimulationSnapshot({
      campaignHandle: 'test-campaign',
      currentEpochMinute: 20000n,
      chronometer: {
        masterCalendarId: 'cal-1',
        label: '5 Harvest, Year 1',
        season: 'Autumn',
        moonPhase: null,
        upcomingEvents: [],
      },
      sinceEpochMinute: 20000n - 12n * 1440n,
      currentDowntimePeriod: {
        title: 'Current downtime — 12 days since last session',
        spanLabel: '1-0-1 – 1-0-13',
        rollupHeadline: '12 days of downtime since the last session — relative calm.',
        isOpen: true,
        advanceRunCount: 0,
        projectCompletions: 0,
        projectFailures: 0,
        chronologyFeedHref: '/campaigns/test-campaign/chronology?view=feed&domains=downtime_period',
      },
      overlayEntries: [mockEntry()],
      creativeDrift: null,
      latestWorldAdvanceHeadline: null,
    });
    assert.match(snapshot.currentTimeLabel, /5 Harvest/);
    assert.equal(snapshot.recentWorldActivity.length, 1);
    assert.ok(snapshot.recentWorldActivity[0]?.relativeDateLabel);
    assert.equal(snapshot.activeOperationsSummary.projects.count, 0);
    assert.ok(snapshot.pulse.headline);
    assert.match(snapshot.currentDowntimePeriod?.title ?? '', /Current downtime/);
  });
});
