/**
 * Lightweight narrative health signals for thread hub (not full Layer 4 diagnostics).
 */
import type { ThreadKind, ThreadStatus } from './threadMetadata.js';
export declare const THREAD_SIGNAL_IDS: readonly ["stale", "dangling_foreshadowing", "unresolved_promise", "theory_contradiction"];
export type ThreadSignalId = (typeof THREAD_SIGNAL_IDS)[number];
export declare const THREAD_STALE_DAYS_THRESHOLD = 60;
export interface ThreadSignalInput {
    threadKind: ThreadKind;
    threadStatus: ThreadStatus;
    payoffPageId: string | null;
    playerSubmitted: boolean;
    updatedAt: Date;
    lastAdvancedSessionId: string | null;
}
export declare function computeThreadSignals(input: ThreadSignalInput): ThreadSignalId[];
export declare const THREAD_SIGNAL_LABELS: Record<ThreadSignalId, string>;
//# sourceMappingURL=threadSignals.d.ts.map