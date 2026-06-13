/**
 * Lightweight narrative health signals for thread hub (not full Layer 4 diagnostics).
 */
import type { ThreadKind, ThreadStatus } from './threadMetadata.js';

export const THREAD_SIGNAL_IDS = [
  'stale',
  'dangling_foreshadowing',
  'unresolved_promise',
  'theory_contradiction',
] as const;

export type ThreadSignalId = (typeof THREAD_SIGNAL_IDS)[number];

export const THREAD_STALE_DAYS_THRESHOLD = 60;

export interface ThreadSignalInput {
  threadKind: ThreadKind;
  threadStatus: ThreadStatus;
  payoffPageId: string | null;
  playerSubmitted: boolean;
  updatedAt: Date;
  lastAdvancedSessionId: string | null;
}

export function computeThreadSignals(input: ThreadSignalInput): ThreadSignalId[] {
  const signals: ThreadSignalId[] = [];
  const now = Date.now();
  const ageMs = now - input.updatedAt.getTime();
  const staleMs = THREAD_STALE_DAYS_THRESHOLD * 24 * 60 * 60 * 1000;

  if (
    input.threadStatus === 'OPEN' &&
    ageMs > staleMs &&
    !input.lastAdvancedSessionId
  ) {
    signals.push('stale');
  }

  if (input.threadKind === 'foreshadowing' && !input.payoffPageId) {
    signals.push('dangling_foreshadowing');
  }

  if (
    input.threadKind === 'promise' &&
    input.threadStatus === 'OPEN' &&
    ageMs > staleMs
  ) {
    signals.push('unresolved_promise');
  }

  if (
    input.threadKind === 'theory' &&
    input.payoffPageId &&
    input.threadStatus === 'RESOLVED'
  ) {
    signals.push('theory_contradiction');
  }

  return signals;
}

export const THREAD_SIGNAL_LABELS: Record<ThreadSignalId, string> = {
  stale: 'Stale',
  dangling_foreshadowing: 'No payoff linked',
  unresolved_promise: 'Long-running promise',
  theory_contradiction: 'Resolved theory',
};
