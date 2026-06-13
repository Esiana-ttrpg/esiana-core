import type { NarrativeDeadEndScanRow } from './narrativeDeadEnd.js';
import { type ClueRedundancyFinding } from './narrativeClueRedundancy.js';
import type { ThreadKind, ThreadStatus } from './threadMetadata.js';
import type { ContinuityIssueSeverity, ContinuityIssueType } from './continuityIssue.js';
export type BranchingDepthEntry = {
    subjectPageId: string;
    maxDepth: number;
    nodeCount: number;
    edgeCount: number;
};
export type NarrativeClusterComplexityEntry = {
    clusterId: string;
    label: string;
    questCount: number;
    activeThreadCount: number;
    maxBranchDepth: number;
};
export type NarrativeDensityMetrics = {
    authored: {
        branchingDepth: BranchingDepthEntry[];
        clueDensity: {
            clueThreadCount: number;
            cluesPerActiveQuest: number;
            spofClueCount: number;
        };
        bottleneckCount: number;
        terminalCount: number;
    };
    worldState: {
        unresolvedThreadCount: {
            total: number;
            byKind: Partial<Record<ThreadKind, number>>;
            byStatus: Partial<Record<ThreadStatus, number>>;
        };
        activeFactionCount: number;
        narrativeEntityCount: number;
        chronologyEventCount: number;
        campaignTotals: {
            activeQuests: number;
            openAuthoredThreads: number;
        };
    };
    narrativeClusterComplexity: NarrativeClusterComplexityEntry[];
};
export type DensityThresholdFinding = {
    ruleId: string;
    issueType: ContinuityIssueType;
    severity: ContinuityIssueSeverity;
    subjectPageId?: string;
    clusterId?: string;
    messageParts: Record<string, string>;
};
export declare const DENSITY_THRESHOLDS: {
    readonly maxBranchDepth: 6;
    readonly cluesPerActiveQuest: 8;
    readonly clusterMaxBranchDepth: 8;
    readonly openAuthoredThreads: 25;
};
export type ComputeDensityInput = {
    subjects: readonly NarrativeDeadEndScanRow[];
    clueFindings: readonly ClueRedundancyFinding[];
    clueThreadCount: number;
    activeFactionCount: number;
    narrativeEntityCount: number;
    chronologyEventCount: number;
    questParentById: ReadonlyMap<string, string | null>;
    questTitleById: ReadonlyMap<string, string>;
    authoredThreads: ReadonlyArray<{
        pageId: string;
        threadKind: ThreadKind;
        threadStatus: ThreadStatus;
        parentQuestClusterId?: string | null;
    }>;
};
export declare function computeNarrativeDensityMetrics(input: ComputeDensityInput): NarrativeDensityMetrics;
export declare function detectDensityThresholdIssues(metrics: NarrativeDensityMetrics): DensityThresholdFinding[];
//# sourceMappingURL=narrativeDensityMetrics.d.ts.map