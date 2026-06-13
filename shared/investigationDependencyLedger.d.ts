import type { InvestigationEdgeKind, InvestigationTopology } from './investigationTopology.js';
import type { SceneOutcomeEntry } from './sceneMetadata.js';
import type { ThreadKind } from './threadMetadata.js';
export type InvestigationLedgerColumnGroup = 'scenes' | 'npcs' | 'locations' | 'discoveries';
export interface InvestigationLedgerRow {
    id: string;
    kind: 'clue' | 'lead';
    title: string;
    narrativeWeight: string | null;
    reachable: boolean;
    isSpof: boolean;
    pressureAccumulating: boolean;
}
export interface InvestigationLedgerColumn {
    id: string;
    title: string;
    columnGroup: InvestigationLedgerColumnGroup;
    reachable: boolean;
}
export interface InvestigationLedgerCell {
    rowId: string;
    columnGroup: InvestigationLedgerColumnGroup;
    targetId: string;
    relationKind: string;
    derivationSource: string;
    explanation: string;
    edgeKind: InvestigationEdgeKind;
}
export interface InvestigationDependencyLedger {
    rows: InvestigationLedgerRow[];
    columns: InvestigationLedgerColumn[];
    cells: InvestigationLedgerCell[];
    legend: {
        edgeKinds: InvestigationEdgeKind[];
        columnGroups: InvestigationLedgerColumnGroup[];
    };
}
export interface InvestigationLedgerThreadScan {
    id: string;
    title: string;
    threadKind: ThreadKind;
    narrativeWeight: string | null;
    relatedPageIds: readonly string[];
    payoffPageId: string | null;
    reachable: boolean;
    playerSubmitted: boolean;
}
export interface InvestigationLedgerSceneScan {
    id: string;
    title: string;
    sceneKind: string | null;
    participantPageIds: readonly string[];
    locationPageId: string | null;
    linkedCluePageIds: readonly string[];
    linkedThreadPageIds: readonly string[];
    outcomes: readonly SceneOutcomeEntry[];
    reachable: boolean;
}
export interface BuildInvestigationDependencyLedgerInput {
    threads: readonly InvestigationLedgerThreadScan[];
    scenes: readonly InvestigationLedgerSceneScan[];
    titlesById: ReadonlyMap<string, string>;
    entityCategoryById?: ReadonlyMap<string, string | null>;
    spofClueIds: ReadonlySet<string>;
    unreachableIds: ReadonlySet<string>;
}
export declare function buildInvestigationDependencyLedger(input: BuildInvestigationDependencyLedgerInput): InvestigationDependencyLedger & InvestigationTopology;
//# sourceMappingURL=investigationDependencyLedger.d.ts.map