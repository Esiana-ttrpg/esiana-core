/**
 * Layer 4 — foreshadowing progression state machine (pure).
 */
import type { ContinuityIssueSeverity, ContinuityIssueType } from './continuityIssue.js';
import type { ThreadKind, ThreadMetadataFields } from './threadMetadata.js';
export type ForeshadowingStage = 'introduced' | 'reinforced' | 'payoff_pending' | 'resolved' | 'abandoned';
export type ForeshadowingChainEntry = {
    threadPageId: string;
    threadKind: ThreadKind;
    stage: ForeshadowingStage;
    introducedSessionId: string | null;
    lastAdvancedSessionId: string | null;
    payoffPageId: string | null;
    resolvedSessionId: string | null;
};
export type ForeshadowingThreadRow = {
    threadPageId: string;
    title: string;
    thread: ThreadMetadataFields;
    updatedAtMs?: number;
};
export type ForeshadowingTrackerFinding = {
    ruleId: string;
    issueType: ContinuityIssueType;
    severity: ContinuityIssueSeverity;
    threadPageId: string;
    title: string;
    stage: ForeshadowingStage;
    threadKind: ThreadKind;
};
export declare const FORESHADOWING_STALE_MS: number;
export declare function deriveForeshadowingStage(thread: ThreadMetadataFields): ForeshadowingStage;
export declare function buildForeshadowingChainEntry(row: ForeshadowingThreadRow): ForeshadowingChainEntry;
export declare function detectForeshadowingIssues(input: {
    threads: readonly ForeshadowingThreadRow[];
    now?: Date;
    staleMs?: number;
}): ForeshadowingTrackerFinding[];
//# sourceMappingURL=narrativeForeshadowingTracker.d.ts.map