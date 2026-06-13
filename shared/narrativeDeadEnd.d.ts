/**
 * Layer 4 — pure narrative dead-end / broken-chain analysis.
 */
import type { ContentRevelationState } from './contentPresence.js';
import type { ContinuityIssueCategory, ContinuityIssueSeverity, ContinuityIssueType } from './continuityIssue.js';
import { type NarrativeBranchEdge, type NarrativeBranchGraph } from './narrativeBranch.js';
import type { ConsequenceRuleSet } from './narrativeConsequence.js';
import { type NarrativeLifecycleState } from './narrativeLifecycle.js';
import type { ThreadMetadataFields } from './threadMetadata.js';
export declare const DEFAULT_STALE_EDGE_WINDOW_MS: number;
export type NarrativeDeadEndSubjectKind = 'quest' | 'open_thread' | 'scene';
export type NarrativeDeadEndScanRow = {
    subjectPageId: string;
    subjectTitle: string;
    subjectKind: NarrativeDeadEndSubjectKind;
    lifecycleState: NarrativeLifecycleState;
    presenceState: ContentRevelationState;
    updatedAt: Date;
    branchGraph: NarrativeBranchGraph | null;
    activeNodeId: string | null;
    consequenceRules: ConsequenceRuleSet | null;
    thread: ThreadMetadataFields | null;
};
export type NormalizedNarrativeSubject = {
    row: NarrativeDeadEndScanRow;
    subjectPageId: string;
    subjectTitle: string;
    subjectKind: NarrativeDeadEndSubjectKind;
    lifecycleState: NarrativeLifecycleState;
    isDraftSubject: boolean;
    isRecentlyEdited: boolean;
    entryNodeIds: string[];
    terminalNodeIds: string[];
    reachableFromEntry: Set<string>;
    dedupedEdges: NarrativeBranchEdge[];
    nodeIdSet: Set<string>;
    nodesById: Map<string, NarrativeBranchGraph['nodes'][number]>;
    hasLifecycleResolutionHook: boolean;
    isConsequenceReferenced: boolean;
};
export type NarrativeDeadEndFinding = {
    ruleId: string;
    issueCategory: ContinuityIssueCategory;
    issueType: ContinuityIssueType;
    severity: ContinuityIssueSeverity;
    subjectPageId: string;
    relatedPageId?: string;
    branchNodeId?: string;
    consequenceRuleId?: string;
    messageParts: Record<string, string>;
};
export type DetectNarrativeDeadEndsInput = {
    subjects: NarrativeDeadEndScanRow[];
    existingPageIds: ReadonlySet<string>;
    pagePresenceById: ReadonlyMap<string, ContentRevelationState>;
    consequenceReferenceIndex: ReadonlySet<string>;
    now?: Date;
    staleEdgeWindowMs?: number;
};
export declare function normalizeNarrativeSubject(row: NarrativeDeadEndScanRow, input: DetectNarrativeDeadEndsInput): NormalizedNarrativeSubject;
export declare function detectNarrativeDeadEnds(input: DetectNarrativeDeadEndsInput): NarrativeDeadEndFinding[];
//# sourceMappingURL=narrativeDeadEnd.d.ts.map