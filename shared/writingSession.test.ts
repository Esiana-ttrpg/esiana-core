import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  applyActivityInterval,
  canCountActivityHeartbeat,
  closeInstanceIntervals,
  isWritingSessionExpired,
  shouldSendActivityHeartbeat,
  unionIntervalDurationMs,
  WRITING_SESSION_HEARTBEAT_MIN_MS,
  WRITING_SESSION_IDLE_MS,
} from './writingSession.ts';

function at(iso: string): Date {
  return new Date(iso);
}

describe('writing session intervals', () => {
  it('does not count a single ping as duration', () => {
    const intervals = applyActivityInterval([], {
      clientInstanceKey: 'tab-a',
      at: at('2026-06-15T18:00:00.000Z'),
    });
    assert.equal(unionIntervalDurationMs(intervals), 0);
  });

  it('counts time between focused activity pings in one interval', () => {
    let intervals = applyActivityInterval([], {
      clientInstanceKey: 'tab-a',
      at: at('2026-06-15T18:00:00.000Z'),
    });
    intervals = applyActivityInterval(intervals, {
      clientInstanceKey: 'tab-a',
      at: at('2026-06-15T18:00:30.000Z'),
    });
    assert.equal(unionIntervalDurationMs(intervals), 30_000);
  });

  it('unions overlapping tabs instead of summing them', () => {
    let intervals = applyActivityInterval([], {
      clientInstanceKey: 'tab-a',
      at: at('2026-06-15T18:00:00.000Z'),
    });
    intervals = applyActivityInterval(intervals, {
      clientInstanceKey: 'tab-a',
      at: at('2026-06-15T18:01:00.000Z'),
    });
    intervals = applyActivityInterval(intervals, {
      clientInstanceKey: 'tab-b',
      at: at('2026-06-15T18:00:30.000Z'),
    });
    intervals = applyActivityInterval(intervals, {
      clientInstanceKey: 'tab-b',
      at: at('2026-06-15T18:01:30.000Z'),
    });
    assert.equal(unionIntervalDurationMs(intervals), 90_000);
  });

  it('excludes hidden or blurred gaps from active duration', () => {
    let intervals = applyActivityInterval([], {
      clientInstanceKey: 'tab-a',
      at: at('2026-06-15T18:00:00.000Z'),
    });
    intervals = applyActivityInterval(intervals, {
      clientInstanceKey: 'tab-a',
      at: at('2026-06-15T18:01:00.000Z'),
    });
    intervals = closeInstanceIntervals(intervals, 'tab-a');
    intervals = applyActivityInterval(intervals, {
      clientInstanceKey: 'tab-a',
      at: at('2026-06-15T18:10:00.000Z'),
    });
    intervals = applyActivityInterval(intervals, {
      clientInstanceKey: 'tab-a',
      at: at('2026-06-15T18:10:20.000Z'),
    });
    assert.equal(unionIntervalDurationMs(intervals), 80_000);
  });

  it('does not add idle tail when a tab blurs or hides', () => {
    let intervals = applyActivityInterval([], {
      clientInstanceKey: 'tab-a',
      at: at('2026-06-15T18:00:00.000Z'),
    });
    intervals = applyActivityInterval(intervals, {
      clientInstanceKey: 'tab-a',
      at: at('2026-06-15T18:01:00.000Z'),
    });
    const before = unionIntervalDurationMs(intervals);
    intervals = closeInstanceIntervals(intervals, 'tab-a');
    assert.equal(unionIntervalDurationMs(intervals), before);
    assert.equal(unionIntervalDurationMs(intervals), 60_000);
  });

  it('treats 15 minutes without activity as a session boundary, not as active time', () => {
    const last = at('2026-06-15T18:00:00.000Z');
    const stillOpen = at('2026-06-15T18:14:59.000Z');
    const expired = at('2026-06-15T18:15:00.000Z');
    assert.equal(isWritingSessionExpired(last, stillOpen), false);
    assert.equal(isWritingSessionExpired(last, expired), true);
    assert.equal(WRITING_SESSION_IDLE_MS, 15 * 60 * 1000);
  });

  it('throttles activity heartbeats and ignores hidden or disconnected time', () => {
    assert.equal(shouldSendActivityHeartbeat(null, 1_000), true);
    assert.equal(
      shouldSendActivityHeartbeat(1_000, 1_000 + WRITING_SESSION_HEARTBEAT_MIN_MS - 1),
      false,
    );
    assert.equal(
      shouldSendActivityHeartbeat(1_000, 1_000 + WRITING_SESSION_HEARTBEAT_MIN_MS),
      true,
    );
    assert.equal(
      canCountActivityHeartbeat({ focused: true, visible: true, online: true }),
      true,
    );
    assert.equal(
      canCountActivityHeartbeat({ focused: true, visible: false, online: true }),
      false,
    );
    assert.equal(
      canCountActivityHeartbeat({ focused: true, visible: true, online: false }),
      false,
    );
  });
});
