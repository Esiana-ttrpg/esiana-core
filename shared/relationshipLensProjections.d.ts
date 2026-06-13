/**
 * Relations workspace — server-precomputed lens projections (browser-safe).
 */
import type { ChronologyDateParts } from './chronologyTypes.js';
import { type EntityGraphEdge, type EntityGraphNodePreview } from './entityGraph.js';
import { type RelationsRenderCaps, type RelationsTruncation } from './relationsRenderCaps.js';
import type { FactionReputationScores } from './reputationMetadata.js';
export declare const RELATIONS_PROJECTION_VERSION = "relations-projection-v1";
export type RelationsLens = 'social' | 'structure' | 'kinship';
export type SocialDynamicsMode = 'blocs' | 'connections' | 'reputation' | 'conflicts' | 'influence';
export type StructureMode = 'chain' | 'institutional';
export type KinshipMode = 'generations' | 'succession';
export type RelationsProjectionLevel = 'summary' | 'cluster' | 'entity';
export type ProjectionFocus = {
    kind: 'party';
} | {
    kind: 'wiki_page';
    entityType: string;
    entityId: string;
} | {
    kind: 'bloc';
    blocId: string;
};
export type ProjectionWindow = {
    lens: RelationsLens;
    mode: string;
    level: RelationsProjectionLevel;
    focus: ProjectionFocus;
    at: ChronologyDateParts | 'current';
    includeHistorical?: boolean;
};
export type RelationsNarrativeSummary = {
    headline: string;
    bullets: string[];
    at: ChronologyDateParts | 'current';
};
export type BlocSummary = {
    id: string;
    title: string;
    codexType: string | null;
    memberCount: number;
    partyTrust: number | null;
    partyNotoriety: number | null;
    standingLabel: string | null;
};
export type AggregatedTension = {
    id: string;
    sourceBlocId: string;
    sourceBlocTitle: string;
    targetBlocId: string;
    targetBlocTitle: string;
    polarity: 'positive' | 'negative' | 'neutral' | 'ambivalent';
    stance: string;
    supportingEdgeCount: number;
    topActors: Array<{
        id: string;
        title: string;
    }>;
};
export type PartyStanding = {
    blocId: string;
    blocTitle: string;
    trust: number;
    notoriety: number;
    label: string;
};
export type ConflictItem = {
    id: string;
    title: string;
    description: string;
    polarity: 'negative' | 'ambivalent';
    entityIds: string[];
};
export type ClusterMember = {
    id: string;
    title: string;
    role: string | null;
    codexType: string | null;
};
export type ConnectionNode = {
    id: string;
    title: string;
    codexType: string | null;
    angle: number;
    radius: number;
    blocId: string | null;
};
export type ConnectionEdge = {
    id: string;
    sourceId: string;
    targetId: string;
    polarity: string;
    relationKind: string;
    inferred: boolean;
};
export type StructureNode = {
    id: string;
    title: string;
    role: string | null;
    depth: number;
    parentId: string | null;
};
export type KinshipMember = {
    id: string;
    title: string;
    generation: number;
    lineageRole: string | null;
};
export type KinshipEdge = {
    id: string;
    sourceId: string;
    targetId: string;
    relationshipType: string;
    linkKind: string | null;
};
export type SocialRelationsRenderModel = {
    lens: 'social';
    mode: SocialDynamicsMode;
    level: RelationsProjectionLevel;
    narrativeSummary: RelationsNarrativeSummary;
    blocs: BlocSummary[];
    tensions: AggregatedTension[];
    partyStandings: PartyStanding[];
    conflicts: ConflictItem[];
    members: ClusterMember[];
    connectionNodes: ConnectionNode[];
    connectionEdges: ConnectionEdge[];
    truncation: RelationsTruncation;
    focus: ProjectionWindow;
};
export type StructureRelationsRenderModel = {
    lens: 'structure';
    mode: StructureMode;
    level: RelationsProjectionLevel;
    narrativeSummary: RelationsNarrativeSummary;
    nodes: StructureNode[];
    truncation: RelationsTruncation;
    focus: ProjectionWindow;
};
export type KinshipRelationsRenderModel = {
    lens: 'kinship';
    mode: KinshipMode;
    level: RelationsProjectionLevel;
    narrativeSummary: RelationsNarrativeSummary;
    members: KinshipMember[];
    edges: KinshipEdge[];
    truncation: RelationsTruncation;
    focus: ProjectionWindow;
};
export type RelationsRenderModel = SocialRelationsRenderModel | StructureRelationsRenderModel | KinshipRelationsRenderModel;
export type WikiPageSnapshot = {
    id: string;
    title: string;
    templateType: string;
    metadata: unknown;
};
export type RelationsProjectionInput = {
    window: ProjectionWindow;
    caps: RelationsRenderCaps;
    edges: EntityGraphEdge[];
    nodePreviews: Map<string, EntityGraphNodePreview>;
    orgPages: WikiPageSnapshot[];
    reputationByFaction: Record<string, FactionReputationScores>;
};
export declare function buildNarrativeSummary(input: {
    headline?: string;
    at: ChronologyDateParts | 'current';
    tensions: AggregatedTension[];
    partyStandings: PartyStanding[];
    conflicts: ConflictItem[];
}): RelationsNarrativeSummary;
export declare function projectSocialRelations(input: RelationsProjectionInput): SocialRelationsRenderModel;
export declare function projectStructureRelations(input: RelationsProjectionInput): StructureRelationsRenderModel;
export declare function projectKinshipRelations(input: RelationsProjectionInput): KinshipRelationsRenderModel;
export declare function projectRelationsLens(input: RelationsProjectionInput): RelationsRenderModel;
//# sourceMappingURL=relationshipLensProjections.d.ts.map