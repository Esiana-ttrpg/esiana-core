/**
 * Layer 5 — storyboard view storage (layout-only projection).
 */
import type { EntityGraphEdge } from './entityGraph.js';
import type { ContinuityIssue } from './continuityIssue.js';
import type { SceneBeatType } from './sceneMetadata.js';
import { type StoryboardProjectedEdge } from './storyboardEdgeDerivation.js';
export type { StoryboardProjectedEdge } from './storyboardEdgeDerivation.js';
export { STORYBOARD_EDGE_PROVENANCE, STORYBOARD_MODE_RELATION_KINDS, STORYBOARD_MODE_LABELS, buildModeLegend, deriveStoryboardEdges, } from './storyboardEdgeDerivation.js';
export declare const STORYBOARD_VIEW_VERSION = "storyboard-view-v1";
export declare const ADVENTURE_SECTIONS: readonly ["board", "scenes", "investigation", "continuity", "arcs", "sessions", "scene-timeline", "thread-history", "timeline"];
export type AdventureSection = (typeof ADVENTURE_SECTIONS)[number];
export type StoryboardNodeEntityType = 'scene' | 'quest' | 'thread' | 'character' | 'location' | 'event' | 'wiki_page';
export type StoryboardEdgeKind = 'required' | 'optional' | 'branch';
export type StoryboardActiveMode = 'arc_flow' | 'investigation' | 'session_prep' | 'continuity';
export interface StoryboardVisibilityFilters {
    collapseByArc?: string[];
    hideCompletedScenes?: boolean;
    onlyReachable?: boolean;
    factionPageIds?: string[];
    sessionId?: string;
    playerRelevancePageIds?: string[];
    isolateInvestigationPath?: string;
    onlyPressureLinked?: boolean;
    narrativeWeightMin?: 'minor' | 'major' | 'critical';
    beatTypes?: SceneBeatType[];
}
export interface StoryboardViewNode {
    entityType: StoryboardNodeEntityType;
    entityId: string;
    x: number;
    y: number;
    laneId?: string;
    collapsed?: boolean;
}
export interface StoryboardViewEdge {
    sourceId: string;
    targetId: string;
    edgeKind: StoryboardEdgeKind;
    label?: string;
}
export interface StoryboardViewLane {
    id: string;
    label: string;
    actIndex?: number;
    collapsed?: boolean;
}
export interface StoryboardViewAnnotation {
    id: string;
    x: number;
    y: number;
    text: string;
    linkedEntityIds?: string[];
}
export interface StoryboardViewV1 {
    version: typeof STORYBOARD_VIEW_VERSION;
    nodes: StoryboardViewNode[];
    edges: StoryboardViewEdge[];
    lanes: StoryboardViewLane[];
    annotations: StoryboardViewAnnotation[];
    visibility: StoryboardVisibilityFilters;
    activeMode: StoryboardActiveMode;
}
export interface StoryboardProjectedNode extends StoryboardViewNode {
    title: string;
    beatType?: string | null;
    narrativeWeight?: string;
    sceneStatus?: string;
    questStatus?: string | null;
    threadKind?: string | null;
    codexType?: string | null;
    missing: boolean;
    continuityRiskCount: number;
}
export interface StoryboardProjection {
    layout: StoryboardViewV1;
    nodes: StoryboardProjectedNode[];
    edges: StoryboardProjectedEdge[];
    modeLegend: string;
    continuityIssues: ContinuityIssue[];
}
export declare function emptyStoryboardView(): StoryboardViewV1;
export declare function parseStoryboardView(raw: unknown): StoryboardViewV1;
export type StoryboardEntityRecord = {
    title: string;
    entityType?: StoryboardNodeEntityType;
    beatType?: string | null;
    narrativeWeight?: string;
    sceneStatus?: string;
    questStatus?: string | null;
    threadKind?: string | null;
    codexType?: string | null;
};
export type StoryboardEntityLookup = Map<string, StoryboardEntityRecord>;
export declare function pruneStaleLayoutNodes(layout: StoryboardViewV1, validEntityIds: Set<string>): StoryboardViewV1;
/** Strip deprecated semantic edges before persisting layout chrome. */
export declare function sanitizeLayoutForSave(layout: StoryboardViewV1): StoryboardViewV1;
export declare function buildStoryboardProjection(input: {
    layout: StoryboardViewV1;
    entities: StoryboardEntityLookup;
    entityGraphEdges?: readonly EntityGraphEdge[];
    continuityIssues?: ContinuityIssue[];
    pressureLinkedIds?: Set<string>;
    /** Precomputed arc ancestry for collapseByArc — O(1) lookup per scene node. */
    ancestryByEntityId?: Record<string, string[]>;
}): StoryboardProjection;
export declare function normalizeAdventureSection(raw: unknown): AdventureSection;
export interface StoryboardPreset {
    id: string;
    label: string;
    description: string;
    lanes: StoryboardViewLane[];
    activeMode?: StoryboardActiveMode;
}
/** @deprecated Use StoryboardPreset */
export type StoryboardSessionPreset = StoryboardPreset;
/** Non-destructive storyboard scaffolds — layout chrome only. */
export declare const STORYBOARD_PRESETS: StoryboardPreset[];
/** @deprecated Use STORYBOARD_PRESETS */
export declare const STORYBOARD_SESSION_PRESETS: StoryboardPreset[];
//# sourceMappingURL=storyboardProjection.d.ts.map