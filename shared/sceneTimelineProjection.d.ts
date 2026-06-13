/**
 * Layer 5 — scene timeline projection (read-only orchestration).
 * @see docs/architecture-internal/scene-timeline.md
 */
import type { SceneBeatType, SceneMetadataFields, SceneStatus } from './sceneMetadata.js';
export type SessionConfidence = 'committed' | 'tentative' | 'distant';
export interface SceneTimelineSession {
    id: string;
    title: string;
    sequenceOrder: number;
    plannedStartAt: string | null;
}
export interface SceneTimelineSceneInput {
    id: string;
    title: string;
    scene: Pick<SceneMetadataFields, 'sceneStatus' | 'beatType' | 'plannedSessionId' | 'playedSessionId' | 'sortOrder' | 'followsScenePageIds' | 'linkedQuestPageIds'>;
}
export interface SceneTimelineBlockingScene {
    id: string;
    title: string;
}
export interface SceneTimelineEntry {
    id: string;
    title: string;
    sceneStatus: SceneStatus;
    beatType: SceneBeatType | null;
    plannedSessionId: string | null;
    playedSessionId: string | null;
    sortOrder: number | null;
    linkedQuestPageIds: string[];
    /** Derived — never persisted */
    blockingSceneIds: string[];
    blockingScenes: SceneTimelineBlockingScene[];
    sessionConfidence: SessionConfidence;
    isBlocked: boolean;
}
export interface SceneTimelineColumn {
    sessionId: string | null;
    scenes: SceneTimelineEntry[];
}
export interface SceneTimelineProjection {
    anchorSessionId: string | null;
    sessions: SceneTimelineSession[];
    columns: SceneTimelineColumn[];
    sequenceList: SceneTimelineEntry[];
    arcFilterOptions: Array<{
        id: string;
        title: string;
    }>;
    /** Quest page id → ancestor arc/questline ids (for arc highlight filter). */
    questArcAncestry?: Record<string, string[]>;
}
export declare function compareSceneTimelineOrder(a: SceneTimelineSceneInput, b: SceneTimelineSceneInput): number;
export declare function isSceneIncomplete(status: SceneStatus): boolean;
export declare function deriveBlockingSceneIds(scene: SceneTimelineSceneInput, sceneById: Map<string, SceneTimelineSceneInput>): {
    blockingSceneIds: string[];
    blockingScenes: SceneTimelineBlockingScene[];
};
export declare function topologicalSceneOrder(scenes: SceneTimelineSceneInput[]): SceneTimelineSceneInput[];
export declare function resolveAnchorSessionId(sessions: SceneTimelineSession[], scenes: SceneTimelineSceneInput[]): string | null;
export declare function deriveSessionConfidence(input: {
    scene: SceneTimelineSceneInput;
    plannedSessionId: string | null;
    sessions: SceneTimelineSession[];
    anchorSessionId: string | null;
}): SessionConfidence;
export declare function buildSceneTimelineProjection(input: {
    sessions: SceneTimelineSession[];
    scenes: SceneTimelineSceneInput[];
    arcFilterOptions?: Array<{
        id: string;
        title: string;
    }>;
    questArcAncestry?: Record<string, string[]>;
}): SceneTimelineProjection;
//# sourceMappingURL=sceneTimelineProjection.d.ts.map