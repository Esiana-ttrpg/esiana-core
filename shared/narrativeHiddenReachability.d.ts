import type { ContinuityIssueCategory, ContinuityIssueSeverity, ContinuityIssueType } from './continuityIssue.js';
import type { BranchCondition } from './narrativeBranch.js';
import { type NarrativeLifecycleState } from './narrativeLifecycle.js';
import { type NarrativeDeadEndScanRow } from './narrativeDeadEnd.js';
export type ActivationConditionIndex = {
    existingPageIds: ReadonlySet<string>;
    lifecycleBySubjectId: ReadonlyMap<string, NarrativeLifecycleState>;
    calendarEventIds: ReadonlySet<string>;
    liveGraphEdges: ReadonlySet<string>;
};
export type HiddenReachabilityFinding = {
    ruleId: string;
    issueCategory: ContinuityIssueCategory;
    issueType: ContinuityIssueType;
    severity: ContinuityIssueSeverity;
    subjectPageId: string;
    branchNodeId?: string;
    messageParts: Record<string, string>;
};
export type DetectHiddenReachabilityInput = {
    subjects: NarrativeDeadEndScanRow[];
    conditionIndex: ActivationConditionIndex;
    now?: Date;
    staleEdgeWindowMs?: number;
};
export declare function isBranchConditionSatisfiable(condition: BranchCondition | undefined, index: ActivationConditionIndex): boolean;
export declare function detectHiddenReachabilityIssues(input: DetectHiddenReachabilityInput): HiddenReachabilityFinding[];
//# sourceMappingURL=narrativeHiddenReachability.d.ts.map