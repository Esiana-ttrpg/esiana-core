import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { NarrativeLifecycleStates } from './narrativeLifecycle.js';
import {
  computeCreativeDriftScan,
  computeHangingPromiseFindings,
  detectReawakenedThreads,
  type DriftThreadScanRow,
} from './creativeDriftCompute.js';
import { driftFingerprint } from './creativeDriftFingerprint.js';
import { THREAD_STALE_DAYS_THRESHOLD } from './threadSignals.js';

function baseThread(overrides: Partial<DriftThreadScanRow> = {}): DriftThreadScanRow {
  return {
    id: 'thread-1',
    title: 'The Red Choir',
    updatedAt: new Date(),
    threadKind: 'mystery',
    threadStatus: 'OPEN',
    narrativeWeight: 'major',
    relatedPageIds: [],
    introducedSessionId: null,
    lastAdvancedSessionId: null,
    payoffPageId: null,
    playerSubmitted: false,
    emotionalResidueKind: null,
    lifecycleState: NarrativeLifecycleStates.ACTIVE,
    isAuthored: true,
    ...overrides,
  };
}

describe('driftFingerprint', () => {
  it('is stable for the same inputs', () => {
    const a = driftFingerprint('dormant_plotlines', 'open_thread', 'abc');
    const b = driftFingerprint('dormant_plotlines', 'open_thread', 'abc');
    assert.equal(a, b);
  });
});

describe('computeHangingPromiseFindings', () => {
  it('flags latent foreshadowing without payoff', () => {
    const findings = computeHangingPromiseFindings(
      {
        threads: [
          baseThread({
            threadKind: 'foreshadowing',
            payoffPageId: null,
          }),
        ],
        quests: [],
        entities: [],
        branches: [],
      },
      new Date(),
    );
    assert.equal(findings.length, 1);
    assert.equal(findings[0]?.statusLabel, 'Lingering foreshadowing');
    assert.equal(findings[0]?.bucket, 'hanging_promises');
  });
});

describe('detectReawakenedThreads', () => {
  it('detects thread advanced beyond introduction recently', () => {
    const items = detectReawakenedThreads(
      [
        baseThread({
          introducedSessionId: 'session-1',
          lastAdvancedSessionId: 'session-5',
          updatedAt: new Date(),
        }),
      ],
      new Date(),
    );
    assert.equal(items.length, 1);
    assert.match(
      items[0]?.reactivationCopy ?? '',
      /Back in recent play|Recently returned/i,
    );
  });
});

describe('computeCreativeDriftScan', () => {
  it('hides snoozed findings from active buckets', () => {
    const staleDate = new Date(
      Date.now() - (THREAD_STALE_DAYS_THRESHOLD + 5) * 24 * 60 * 60 * 1000,
    );
    const thread = baseThread({
      threadStatus: 'DORMANT',
      updatedAt: staleDate,
    });
    const findingFp = driftFingerprint(
      'dormant_plotlines',
      'open_thread',
      thread.id,
    );
    const until = new Date();
    until.setDate(until.getDate() + 30);

    const result = computeCreativeDriftScan({
      threads: [thread],
      quests: [],
      entities: [],
      branches: [],
      dispositions: {
        [findingFp]: {
          kind: 'snoozed',
          notedAt: new Date().toISOString(),
          snoozeUntil: until.toISOString(),
        },
      },
    });

    const dormant = result.buckets.find((b) => b.bucket === 'dormant_plotlines');
    assert.equal(dormant?.items.length, 0);
  });

  it('does not expose internal sort keys in bucket items', () => {
    const result = computeCreativeDriftScan({
      threads: [
        baseThread({
          threadStatus: 'DORMANT',
        }),
      ],
      quests: [],
      entities: [],
      branches: [],
    });
    for (const bucket of result.buckets) {
      for (const item of bucket.items) {
        assert.equal('_sortKey' in item, false);
      }
    }
  });
});
