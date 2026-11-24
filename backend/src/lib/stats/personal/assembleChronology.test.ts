import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readMetricAmount, type MetricValue } from '../../../../../shared/metricValue.js';
import { assembleChronologyStats } from './assembleChronology.js';

function unavailableReason(value: MetricValue | undefined): string | null {
  return value?.status === 'unavailable' ? value.reason : null;
}

const start = new Date('2026-06-01T00:00:00.000Z');
const end = new Date('2026-07-01T00:00:00.000Z');

describe('assembleChronologyStats', () => {
  it('counts events, eras, timeline-linked events, and time advances by createdAt', () => {
    const stats = assembleChronologyStats({
      events: [
        { createdAt: new Date('2026-06-10T00:00:00.000Z') },
        { createdAt: new Date('2026-05-01T00:00:00.000Z') },
      ],
      eras: [{ createdAt: new Date('2026-06-12T00:00:00.000Z') }],
      timelineContributions: [{ createdAt: new Date('2026-06-10T00:00:00.000Z') }],
      timeAdvances: [
        {
          createdAt: new Date('2026-06-15T00:00:00.000Z'),
          previousEpochMinute: 1000n,
          nextEpochMinute: 2440n,
        },
        {
          createdAt: new Date('2026-04-01T00:00:00.000Z'),
          previousEpochMinute: 0n,
          nextEpochMinute: 500n,
        },
      ],
      periodEditsByDomain: { events: 3, eras: 1 },
      hasEditInstrumentation: true,
      rangeStart: start,
      rangeEnd: end,
      skipPeriod: false,
      visibility: 'owner',
    });
    const byDomain = Object.fromEntries(stats.map((row) => [row.domain, row]));
    assert.equal(readMetricAmount(byDomain.events?.created), 2);
    assert.equal(readMetricAmount(byDomain.events?.periodCreated), 1);
    assert.equal(readMetricAmount(byDomain.events?.periodEdited), 3);
    assert.equal(readMetricAmount(byDomain.eras?.created), 1);
    assert.equal(readMetricAmount(byDomain.timelineContributions?.created), 1);
    assert.equal(
      unavailableReason(byDomain.timelineContributions?.periodEdited),
      'not_yet_tracked',
    );
    assert.equal(readMetricAmount(byDomain.timeAdvances?.created), 2);
    assert.equal(readMetricAmount(byDomain.timeAdvances?.periodCreated), 1);
    assert.equal(readMetricAmount(byDomain.timeAdvances?.minutesAdvanced), 1940);
    assert.equal(readMetricAmount(byDomain.timeAdvances?.periodMinutesAdvanced), 1440);
    assert.equal(unavailableReason(byDomain.timeAdvances?.periodEdited), 'not_yet_tracked');
  });

  it('marks pre-instrumentation chronology edits unavailable instead of zero', () => {
    const stats = assembleChronologyStats({
      events: [{ createdAt: start }],
      eras: [],
      timelineContributions: [],
      timeAdvances: [],
      periodEditsByDomain: {},
      hasEditInstrumentation: false,
      rangeStart: start,
      rangeEnd: end,
      skipPeriod: false,
      visibility: 'owner',
    });
    const events = stats.find((row) => row.domain === 'events');
    assert.equal(readMetricAmount(events?.created), 1);
    assert.equal(unavailableReason(events?.periodEdited), 'not_yet_tracked');
  });

  it('hides period chronology from public visibility', () => {
    const stats = assembleChronologyStats({
      events: [{ createdAt: start }],
      eras: [],
      timelineContributions: [],
      timeAdvances: [
        {
          createdAt: start,
          previousEpochMinute: 0n,
          nextEpochMinute: 100n,
        },
      ],
      periodEditsByDomain: { events: 2 },
      hasEditInstrumentation: true,
      rangeStart: start,
      rangeEnd: end,
      skipPeriod: false,
      visibility: 'public',
    });
    const events = stats.find((row) => row.domain === 'events');
    const advances = stats.find((row) => row.domain === 'timeAdvances');
    assert.equal(readMetricAmount(events?.created), 1);
    assert.equal(unavailableReason(events?.periodCreated), 'private');
    assert.equal(unavailableReason(events?.periodEdited), 'private');
    assert.equal(readMetricAmount(advances?.minutesAdvanced), 100);
    assert.equal(unavailableReason(advances?.periodMinutesAdvanced), 'private');
  });
});
