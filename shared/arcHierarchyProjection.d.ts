/**
 * Layer 5 — phased arc hierarchy projection (O(n) per phase).
 * Campaign Arc → Questline → Quest → Objective tree + scene associations (many-to-many).
 */
import { type ArcKind, type ArcMetadataFields } from './arcMetadata.js';
export type ArcHierarchyNodeKind = 'campaign_arc' | 'questline' | 'quest' | 'objective' | 'scene_ref';
export interface ArcHierarchySceneSlice {
    id: string;
    title: string;
    sceneStatus: string;
    beatType: string | null;
    narrativeWeight: string;
    associatedObjectiveCount: number;
}
export interface ArcHierarchyNode {
    kind: ArcHierarchyNodeKind;
    id: string;
    title: string;
    children: ArcHierarchyNode[];
    arc?: Pick<ArcMetadataFields, 'arcKind' | 'actIndex' | 'pacingTarget'>;
    questStatus?: string;
    objectiveStatus?: string;
}
export type ArcHierarchyWarningKind = 'invalid_arc_containment' | 'objective_parent_not_quest' | 'dangling_scene_association' | 'dangling_objective_association';
export interface ArcHierarchyWarning {
    kind: ArcHierarchyWarningKind;
    message: string;
    entityIds: string[];
}
export interface ArcHierarchyProjection {
    roots: ArcHierarchyNode[];
    scenesById: Record<string, ArcHierarchySceneSlice>;
    orphans: {
        quests: Array<{
            id: string;
            title: string;
        }>;
        objectives: Array<{
            id: string;
            title: string;
        }>;
        scenes: Array<{
            id: string;
            title: string;
        }>;
    };
    ancestryByEntityId: Record<string, string[]>;
    warnings: ArcHierarchyWarning[];
    sceneObjectiveCounts: Record<string, number>;
}
export interface ArcHierarchyInputRow {
    id: string;
    title: string;
    parentId: string | null;
    metadata: unknown;
}
export interface ArcHierarchyInput {
    questsRootId: string;
    questRows: ArcHierarchyInputRow[];
    sceneRows: ArcHierarchyInputRow[];
}
export declare function buildArcHierarchyProjection(input: ArcHierarchyInput): ArcHierarchyProjection;
/** O(1) arc ancestry check for storyboard collapseByArc filter. */
export declare function sceneArcAncestryIntersects(sceneId: string, allowedArcIds: Set<string>, ancestryByEntityId: Record<string, string[]>, scenesByObjectiveId: Map<string, string[]>, sceneRows: ArcHierarchyInputRow[]): boolean;
export declare function resolveArcKindFromMetadata(metadata: unknown): ArcKind | null;
//# sourceMappingURL=arcHierarchyProjection.d.ts.map