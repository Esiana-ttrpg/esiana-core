/**
 * Layer 4 — clue redundancy and progression bottleneck analysis (pure).
 */
import type { ContinuityIssueCategory, ContinuityIssueSeverity, ContinuityIssueType } from './continuityIssue.js';
import type { ActivationConditionIndex } from './narrativeHiddenReachability.js';
import type { NarrativeDeadEndScanRow } from './narrativeDeadEnd.js';
import type { ThreadKind } from './threadMetadata.js';
export type ClueRedundancyFinding = {
    ruleId: string;
    issueCategory: ContinuityIssueCategory;
    issueType: ContinuityIssueType;
    severity: ContinuityIssueSeverity;
    subjectPageId: string;
    branchNodeId?: string;
    targetPageId?: string;
    clueThreadPageId?: string;
    messageParts: Record<string, string>;
};
export type DetectClueRedundancyInput = {
    subjects: readonly NarrativeDeadEndScanRow[];
    conditionIndex: ActivationConditionIndex;
    clueThreadPageIds: ReadonlySet<string>;
    threadKindByPageId: ReadonlyMap<string, ThreadKind>;
};
export declare function detectClueRedundancyIssues(input: DetectClueRedundancyInput): ClueRedundancyFinding[];
export declare function countSpofClues(findings: readonly ClueRedundancyFinding[]): number;
//# sourceMappingURL=narrativeClueRedundancy.d.ts.map