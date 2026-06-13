/**
 * Pure Layer 3 creative drift heuristics (composes threadSignals + lifecycle inputs).
 */
import { type CreativeDriftDispositionMap, type CreativeDriftFinding, type CreativeDriftReawakenedItem, type CreativeDriftScanResult } from './creativeDrift.js';
import type { NarrativeLifecycleState } from './narrativeLifecycle.js';
import type { BranchNodeKind } from './narrativeBranch.js';
import type { ThreadKind, ThreadStatus, ThreadNarrativeWeight } from './threadMetadata.js';
import type { EmotionalResidueKind } from './threadMetadata.js';
export type DriftThreadScanRow = {
    id: string;
    title: string;
    updatedAt: Date;
    threadKind: ThreadKind;
    threadStatus: ThreadStatus;
    narrativeWeight: ThreadNarrativeWeight;
    relatedPageIds: string[];
    introducedSessionId: string | null;
    lastAdvancedSessionId: string | null;
    payoffPageId: string | null;
    playerSubmitted: boolean;
    emotionalResidueKind: EmotionalResidueKind | null;
    lifecycleState: NarrativeLifecycleState;
    isAuthored: boolean;
};
export type DriftQuestScanRow = {
    id: string;
    title: string;
    updatedAt: Date;
    lifecycleState: NarrativeLifecycleState;
    lastActivityAt: Date | null;
};
export type DriftEntityScanRow = {
    id: string;
    title: string;
    templateCategory: string | null;
    updatedAt: Date;
    lastActivityAt: Date | null;
    inboundNarrativeEdgeCount: number;
    linkedByLivingNarrative: boolean;
    introWeight: ThreadNarrativeWeight | null;
};
export type DriftBranchScanRow = {
    subjectId: string;
    subjectTitle: string;
    nodeId: string;
    nodeLabel: string;
    nodeKind: BranchNodeKind;
    narrativeWeight: ThreadNarrativeWeight;
    updatedAt: Date;
};
export type CreativeDriftComputeInput = {
    now?: Date;
    threads: DriftThreadScanRow[];
    quests: DriftQuestScanRow[];
    entities: DriftEntityScanRow[];
    branches: DriftBranchScanRow[];
    dispositions?: CreativeDriftDispositionMap;
};
export declare function detectReawakenedThreads(threads: DriftThreadScanRow[], now: Date): CreativeDriftReawakenedItem[];
export declare function detectReawakenedEntities(entities: DriftEntityScanRow[], reawakenedThreads: DriftThreadScanRow[], now: Date): CreativeDriftReawakenedItem[];
export declare function computeDormantPlotlineFindings(input: CreativeDriftComputeInput, now: Date): CreativeDriftFinding[];
export declare function computeCoolingEntityFindings(input: CreativeDriftComputeInput, now: Date): CreativeDriftFinding[];
export declare function computeHangingPromiseFindings(input: CreativeDriftComputeInput, now: Date): CreativeDriftFinding[];
export declare function computeEmotionalResidueFindings(input: CreativeDriftComputeInput, now: Date): CreativeDriftFinding[];
export declare function computeCreativeDriftScan(input: CreativeDriftComputeInput): CreativeDriftScanResult;
//# sourceMappingURL=creativeDriftCompute.d.ts.map