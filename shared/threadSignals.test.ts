import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { computeThreadSignals, THREAD_STALE_DAYS_THRESHOLD } from './threadSignals.js';

describe('computeThreadSignals', () => {
  it('flags dangling foreshadowing without payoff', () => {
    const signals = computeThreadSignals({
      threadKind: 'foreshadowing',
      threadStatus: 'OPEN',
      payoffPageId: null,
      playerSubmitted: false,
      updatedAt: new Date(),
      lastAdvancedSessionId: null,
    });
    assert.ok(signals.includes('dangling_foreshadowing'));
  });

  it('flags stale OPEN threads past threshold without session anchor', () => {
    const old = new Date(
      Date.now() - (THREAD_STALE_DAYS_THRESHOLD + 1) * 24 * 60 * 60 * 1000,
    );
    const signals = computeThreadSignals({
      threadKind: 'mystery',
      threadStatus: 'OPEN',
      payoffPageId: null,
      playerSubmitted: false,
      updatedAt: old,
      lastAdvancedSessionId: null,
    });
    assert.ok(signals.includes('stale'));
  });

  it('flags theory_contradiction when resolved with payoff', () => {
    const signals = computeThreadSignals({
      threadKind: 'theory',
      threadStatus: 'RESOLVED',
      payoffPageId: 'page-1',
      playerSubmitted: true,
      updatedAt: new Date(),
      lastAdvancedSessionId: null,
    });
    assert.ok(signals.includes('theory_contradiction'));
  });
});
