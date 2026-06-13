/**
 * Layer 1 — unified entity relationship graph (canonical edge taxonomy + API shapes).
 */
import type { ChronologyDateParts } from './chronologyTypes.js';
import type { NarrativeRelationSemantics } from './narrativeRelationSemantics.js';
export declare const EDGE_TAXONOMY_VERSION = "entity-graph-v2";
export declare const GRAPH_SEMANTICS_VERSION = "graph-semantics-v2";
export declare const EntityGraphEntityTypes: {
    readonly WIKI_PAGE: "wiki_page";
    readonly CALENDAR_EVENT: "calendar_event";
    readonly MAP_PIN: "map_pin";
    readonly MAP_SCENE_OBJECT: "map_scene_object";
    readonly SCENE: "scene";
    readonly CLUE: "clue";
};
export type EntityGraphEntityType = (typeof EntityGraphEntityTypes)[keyof typeof EntityGraphEntityTypes];
export declare const EntityRelationKinds: {
    readonly WIKI_REFERENCE: "WIKI_REFERENCE";
    readonly ORG_DIPLOMATIC: "ORG_DIPLOMATIC";
    readonly ORG_PARENT: "ORG_PARENT";
    readonly ANCESTRY_PARENT: "ANCESTRY_PARENT";
    readonly CHARACTER_ANCESTRY: "CHARACTER_ANCESTRY";
    readonly ORG_LEADER: "ORG_LEADER";
    readonly ORG_HQ: "ORG_HQ";
    readonly CHARACTER_AFFILIATION: "CHARACTER_AFFILIATION";
    readonly CHARACTER_LINEAGE: "CHARACTER_LINEAGE";
    readonly CHARACTER_SOCIAL: "CHARACTER_SOCIAL";
    readonly QUEST_GIVER: "QUEST_GIVER";
    readonly QUEST_FACTION: "QUEST_FACTION";
    readonly THREAD_RELATED: "THREAD_RELATED";
    readonly THREAD_PAYOFF: "THREAD_PAYOFF";
    readonly SCENE_PARTICIPANT: "SCENE_PARTICIPANT";
    readonly SCENE_LOCATION: "SCENE_LOCATION";
    readonly SCENE_QUEST: "SCENE_QUEST";
    readonly SCENE_CLUE: "SCENE_CLUE";
    readonly SCENE_THREAD: "SCENE_THREAD";
    readonly SCENE_FOLLOWS: "SCENE_FOLLOWS";
    readonly ARC_CONTAINS: "ARC_CONTAINS";
    readonly QUESTLINE_CONTAINS: "QUESTLINE_CONTAINS";
    readonly QUEST_OBJECTIVE: "QUEST_OBJECTIVE";
    readonly OBJECTIVE_SCENE: "OBJECTIVE_SCENE";
    readonly LOCATION_RELATED: "LOCATION_RELATED";
    readonly LOCATION_REGION: "LOCATION_REGION";
    readonly LOCATION_MAP: "LOCATION_MAP";
    readonly CALENDAR_PREREQUISITE: "CALENDAR_PREREQUISITE";
    readonly MAP_TARGETS: "MAP_TARGETS";
    readonly PAGE_PARENT: "PAGE_PARENT";
    readonly HAVEN_LOCATION: "HAVEN_LOCATION";
    readonly HAVEN_RESIDENT: "HAVEN_RESIDENT";
    readonly HAVEN_FACTION: "HAVEN_FACTION";
    readonly HAVEN_RELATED: "HAVEN_RELATED";
    readonly HAVEN_REFERENCE: "HAVEN_REFERENCE";
};
export type EntityRelationKind = (typeof EntityRelationKinds)[keyof typeof EntityRelationKinds];
export declare const EntityRelationSourceDomains: {
    readonly WIKI_LINK: "wiki_link";
    readonly WIKI_METADATA: "wiki_metadata";
    readonly CALENDAR: "calendar";
    readonly MAP: "map";
    readonly DOWNTIME: "downtime";
};
export type EntityRelationSourceDomain = (typeof EntityRelationSourceDomains)[keyof typeof EntityRelationSourceDomains];
export declare const EntityRelationDirections: {
    readonly DIRECTED: "directed";
    readonly UNDIRECTED_HALF: "undirected_half";
};
export type EntityRelationDirection = (typeof EntityRelationDirections)[keyof typeof EntityRelationDirections];
export type LabelPreview = {
    sourceLabel?: string;
    targetLabel?: string;
};
export type EntityRelationPayload = {
    kind: typeof EntityRelationKinds.WIKI_REFERENCE;
    aliasText?: string;
    preview?: LabelPreview;
} | {
    kind: typeof EntityRelationKinds.ORG_DIPLOMATIC;
    stance: string;
    relationType: string;
    note?: string;
    preview?: LabelPreview;
} | {
    kind: typeof EntityRelationKinds.CHARACTER_AFFILIATION;
    role?: string | null;
    preview?: LabelPreview;
} | {
    kind: typeof EntityRelationKinds.CHARACTER_LINEAGE;
    relationshipType: string;
    linkKind?: 'parent' | 'spouse';
    semantics?: NarrativeRelationSemantics;
    preview?: LabelPreview;
} | {
    kind: typeof EntityRelationKinds.CHARACTER_SOCIAL;
    narrativeType: string;
    semantics?: NarrativeRelationSemantics;
    preview?: LabelPreview;
} | {
    kind: typeof EntityRelationKinds.QUEST_GIVER;
    preview?: LabelPreview;
} | {
    kind: typeof EntityRelationKinds.QUEST_FACTION;
    preview?: LabelPreview;
} | {
    kind: typeof EntityRelationKinds.THREAD_RELATED;
    preview?: LabelPreview;
} | {
    kind: typeof EntityRelationKinds.THREAD_PAYOFF;
    preview?: LabelPreview;
} | {
    kind: typeof EntityRelationKinds.SCENE_PARTICIPANT;
    preview?: LabelPreview;
} | {
    kind: typeof EntityRelationKinds.SCENE_LOCATION;
    preview?: LabelPreview;
} | {
    kind: typeof EntityRelationKinds.SCENE_QUEST;
    preview?: LabelPreview;
} | {
    kind: typeof EntityRelationKinds.SCENE_CLUE;
    preview?: LabelPreview;
} | {
    kind: typeof EntityRelationKinds.SCENE_THREAD;
    preview?: LabelPreview;
} | {
    kind: typeof EntityRelationKinds.SCENE_FOLLOWS;
    preview?: LabelPreview;
} | {
    kind: typeof EntityRelationKinds.ARC_CONTAINS;
    preview?: LabelPreview;
} | {
    kind: typeof EntityRelationKinds.QUESTLINE_CONTAINS;
    preview?: LabelPreview;
} | {
    kind: typeof EntityRelationKinds.QUEST_OBJECTIVE;
    preview?: LabelPreview;
} | {
    kind: typeof EntityRelationKinds.OBJECTIVE_SCENE;
    preview?: LabelPreview;
} | {
    kind: typeof EntityRelationKinds.LOCATION_RELATED;
    preview?: LabelPreview;
} | {
    kind: typeof EntityRelationKinds.LOCATION_REGION;
    preview?: LabelPreview;
} | {
    kind: typeof EntityRelationKinds.LOCATION_MAP;
    preview?: LabelPreview;
} | {
    kind: typeof EntityRelationKinds.ORG_PARENT;
    preview?: LabelPreview;
} | {
    kind: typeof EntityRelationKinds.ANCESTRY_PARENT;
    preview?: LabelPreview;
} | {
    kind: typeof EntityRelationKinds.CHARACTER_ANCESTRY;
    preview?: LabelPreview;
} | {
    kind: typeof EntityRelationKinds.ORG_LEADER;
    preview?: LabelPreview;
} | {
    kind: typeof EntityRelationKinds.ORG_HQ;
    preview?: LabelPreview;
} | {
    kind: typeof EntityRelationKinds.CALENDAR_PREREQUISITE;
    preview?: LabelPreview;
} | {
    kind: typeof EntityRelationKinds.MAP_TARGETS;
    pinType?: string | null;
    label?: string | null;
    preview?: LabelPreview;
} | {
    kind: typeof EntityRelationKinds.PAGE_PARENT;
    preview?: LabelPreview;
} | {
    kind: typeof EntityRelationKinds.HAVEN_LOCATION;
    preview?: LabelPreview;
} | {
    kind: typeof EntityRelationKinds.HAVEN_RESIDENT;
    preview?: LabelPreview;
} | {
    kind: typeof EntityRelationKinds.HAVEN_FACTION;
    preview?: LabelPreview;
} | {
    kind: typeof EntityRelationKinds.HAVEN_RELATED;
    preview?: LabelPreview;
} | {
    kind: typeof EntityRelationKinds.HAVEN_REFERENCE;
    referenceType?: string | null;
    title?: string | null;
    preview?: LabelPreview;
};
import type { PageNarrativeStatusProjection } from './pageNarrativeStatus.js';
export type EntityGraphNodeRef = {
    entityType: EntityGraphEntityType;
    entityId: string;
};
export type EntityGraphNodePreview = EntityGraphNodeRef & {
    title: string;
    codexType?: string | null;
    href?: string | null;
    narrativeStatus?: PageNarrativeStatusProjection;
};
export type EntityGraphEdge = {
    id: string;
    source: EntityGraphNodeRef;
    target: EntityGraphNodeRef;
    relationKind: EntityRelationKind;
    direction: EntityRelationDirection;
    startDate: ChronologyDateParts | null;
    endDate: ChronologyDateParts | null;
    visibility: string | null;
    payload: EntityRelationPayload | null;
    sourceDomain: EntityRelationSourceDomain;
    sourceRecordKey: string;
    sourcePageId: string | null;
    visible?: boolean;
};
export type GraphVersionHeaders = {
    edgeTaxonomyVersion: string;
    graphSemanticsVersion: string;
};
export type GraphAnalysisSnapshot = GraphVersionHeaders & {
    campaignId: string;
    edges: EntityGraphEdge[];
    adjacency?: EntityGraphAdjacencyIndex;
};
export type LocalGraphQueryResult = GraphVersionHeaders & {
    seed: EntityGraphNodeRef;
    depth: number;
    edges: EntityGraphEdge[];
    nodes: EntityGraphNodePreview[];
};
export type EntityGraphAdjacencyIndex = {
    outbound: Map<string, EntityGraphEdge[]>;
    inbound: Map<string, EntityGraphEdge[]>;
};
export type GraphDiagnosticCheck = 'cycles' | 'orphans' | 'unreachable' | 'dangling';
export type GraphCycleFinding = {
    kind: EntityRelationKind;
    nodeIds: string[];
};
export type GraphOrphanFinding = {
    node: EntityGraphNodeRef;
    preview?: EntityGraphNodePreview;
};
export type GraphDanglingFinding = {
    edgeId: string;
    sourceRecordKey: string;
    missingSide: 'source' | 'target';
    node: EntityGraphNodeRef;
};
export type GraphDiagnosticsResult = GraphVersionHeaders & {
    campaignId: string;
    checks: GraphDiagnosticCheck[];
    cycles: GraphCycleFinding[];
    orphans: GraphOrphanFinding[];
    dangling: GraphDanglingFinding[];
};
export declare function nodeRefKey(ref: EntityGraphNodeRef): string;
export declare function parseNodeRefKey(key: string): EntityGraphNodeRef | null;
export declare function isUndirectedRelationKind(kind: EntityRelationKind): boolean;
export declare function buildUndirectedRecordKeys(baseKey: string): {
    forward: string;
    reverse: string;
};
export declare function parseEntityRelationPayload(raw: unknown): EntityRelationPayload | null;
//# sourceMappingURL=entityGraph.d.ts.map