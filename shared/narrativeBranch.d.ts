/**
 * Layer 2 — sparse authored branch graphs (wiki metadata).
 */
import type { NarrativeLifecycleState } from './narrativeLifecycle.js';
export declare const NARRATIVE_BRANCH_VERSION = "narrative-branch-v1";
export declare const MAX_BRANCH_NODES = 12;
export declare const MAX_BRANCH_EDGES = 24;
export declare const BranchNodeKinds: {
    readonly OUTCOME: "outcome";
    readonly HIDDEN: "hidden";
    readonly FAILURE: "failure";
    readonly MERGE: "merge";
};
export type BranchNodeKind = (typeof BranchNodeKinds)[keyof typeof BranchNodeKinds];
export type BranchCondition = {
    type: 'lifecycle';
    subjectId: string;
    state: NarrativeLifecycleState;
} | {
    type: 'calendar_event';
    eventId: string;
} | {
    type: 'graph_edge';
    sourcePageId: string;
    targetPageId: string;
    kind: string;
} | {
    type: 'manual_flag';
    key: string;
    value: boolean;
};
export type NarrativeBranchNode = {
    id: string;
    label: string;
    kind: BranchNodeKind;
};
export type NarrativeBranchEdge = {
    from: string;
    to: string;
    condition?: BranchCondition;
};
export type NarrativeBranchGraph = {
    version: typeof NARRATIVE_BRANCH_VERSION;
    nodes: NarrativeBranchNode[];
    edges: NarrativeBranchEdge[];
    /** Optional explicit entry roots for reachability analysis */
    entryNodeIds?: string[];
};
export declare class NarrativeBranchValidationError extends Error {
    readonly code = "INVALID_BRANCH_GRAPH";
    constructor(message: string);
}
export declare function parseNarrativeBranchGraph(raw: unknown): NarrativeBranchGraph | null;
export declare function assertValidBranchGraph(graph: NarrativeBranchGraph): void;
export declare function allowedNextBranchNodes(graph: NarrativeBranchGraph, activeNodeId: string | null): NarrativeBranchNode[];
//# sourceMappingURL=narrativeBranch.d.ts.map