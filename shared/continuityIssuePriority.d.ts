/**
 * Layer 4 — priority-aware continuity issue truncation.
 */
import type { ContinuityIssue } from './continuityIssue.js';
export type TruncationContext = {
    /** Page IDs of ACTIVE quests and OPEN authored threads. */
    activeNarrativePageIds?: ReadonlySet<string>;
    /** Recency by pageId (epoch ms). */
    recencyByPageId?: ReadonlyMap<string, number>;
};
export declare function rankContinuityIssue(issue: ContinuityIssue, context?: TruncationContext): number;
export declare function truncateContinuityIssues(issues: ContinuityIssue[], cap: number, context?: TruncationContext): ContinuityIssue[];
export declare function truncateNarrativeContinuityIssues(issues: ContinuityIssue[], cap: number, context?: TruncationContext): ContinuityIssue[];
export declare const GLOBAL_NARRATIVE_CONTINUITY_CAP = 50;
//# sourceMappingURL=continuityIssuePriority.d.ts.map