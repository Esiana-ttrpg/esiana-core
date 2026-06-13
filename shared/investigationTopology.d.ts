/**
 * Layer 5 — investigation topology graph builder.
 */
export type InvestigationNodeKind = 'clue' | 'revelation' | 'lead' | 'scene' | 'location' | 'npc' | 'unlock';
export type InvestigationEdgeKind = 'guaranteed' | 'optional' | 'spof_risk';
export interface InvestigationNode {
    id: string;
    kind: InvestigationNodeKind;
    title: string;
    reachable: boolean;
    pressureAccumulating: boolean;
}
export interface InvestigationEdge {
    sourceId: string;
    targetId: string;
    edgeKind: InvestigationEdgeKind;
}
export interface InvestigationTopology {
    nodes: InvestigationNode[];
    edges: InvestigationEdge[];
}
export { buildInvestigationDependencyLedger, type BuildInvestigationDependencyLedgerInput, type InvestigationDependencyLedger, type InvestigationLedgerCell, type InvestigationLedgerColumn, type InvestigationLedgerColumnGroup, type InvestigationLedgerRow, type InvestigationLedgerSceneScan, type InvestigationLedgerThreadScan, } from './investigationDependencyLedger.js';
export declare function buildInvestigationTopology(input: {
    clueThreads: Array<{
        id: string;
        title: string;
        reachable: boolean;
    }>;
    linkedScenes: Array<{
        id: string;
        title: string;
        clueId: string;
    }>;
    spofClueIds: Set<string>;
    unreachableIds: Set<string>;
}): InvestigationTopology;
//# sourceMappingURL=investigationTopology.d.ts.map