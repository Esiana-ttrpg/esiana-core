import assert from 'node:assert/strict';
import test from 'node:test';
import {
  deriveDowntimePeriodGapsFromSessionEpochs,
  formatDowntimePeriodRollupHeadline,
  formatDowntimePeriodTitle,
} from './downtimePeriodProjection.js';

test('deriveDowntimePeriodGapsFromSessionEpochs returns open period from fallback when no sessions', () => {
  const gaps = deriveDowntimePeriodGapsFromSessionEpochs({
    sessionEpochs: [],
    fallbackStartEpochMinute: '1000',
    currentEpochMinute: '5000',
  });
  assert.equal(gaps.length, 1);
  assert.equal(gaps[0]?.isOpen, true);
  assert.equal(gaps[0]?.startEpochMinute, '1000');
  assert.equal(gaps[0]?.endEpochMinute, '5000');
});

test('deriveDowntimePeriodGapsFromSessionEpochs builds between-session and open gaps', () => {
  const gaps = deriveDowntimePeriodGapsFromSessionEpochs({
    sessionEpochs: [
      { timelinePointId: 's1', sequenceOrder: 1, epochMinute: '1000' },
      { timelinePointId: 's2', sequenceOrder: 2, epochMinute: '3000' },
    ],
    fallbackStartEpochMinute: null,
    currentEpochMinute: '8000',
  });
  assert.equal(gaps.length, 2);
  assert.equal(gaps[0]?.isOpen, false);
  assert.equal(gaps[0]?.sessionBeforeId, 's1');
  assert.equal(gaps[0]?.sessionAfterId, 's2');
  assert.equal(gaps[1]?.isOpen, true);
  assert.equal(gaps[1]?.sessionBeforeId, 's2');
  assert.equal(gaps[1]?.sessionAfterId, null);
});

test('formatDowntimePeriodRollupHeadline prefers narrative calm when no activity', () => {
  const headline = formatDowntimePeriodRollupHeadline({
    isOpen: true,
    startEpochMinute: '0',
    endEpochMinute: String(21n * 1440n),
    counts: {
      advanceRunCount: 0,
      projectCompletions: 0,
      projectFailures: 0,
    },
  });
  assert.match(headline, /relative calm/);
});

test('formatDowntimePeriodTitle labels open periods', () => {
  const title = formatDowntimePeriodTitle({
    isOpen: true,
    startEpochMinute: '0',
    endEpochMinute: String(14n * 1440n),
  });
  assert.match(title, /Current downtime/);
  assert.match(title, /2 weeks/);
});
