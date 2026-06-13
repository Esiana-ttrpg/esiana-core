/**
 * Scene lifecycle ↔ sceneStatus matrix (Layer 2 extension).
 */
import type { NarrativeLifecycleState } from './narrativeLifecycle.js';
import type { SceneStatus } from './sceneMetadata.js';
export declare function allowedSceneStatusesForLifecycle(lifecycle: NarrativeLifecycleState): readonly SceneStatus[];
export declare function coerceSceneStatusForLifecycle(status: SceneStatus, lifecycle: NarrativeLifecycleState): SceneStatus;
export declare function defaultSceneStatusForLifecycle(lifecycle: NarrativeLifecycleState): SceneStatus;
export declare function lifecycleToSceneStatus(lifecycle: NarrativeLifecycleState, existingStatus?: SceneStatus): SceneStatus;
export declare function lifecycleTargetForSceneStatusPatch(status: SceneStatus, currentLifecycle: NarrativeLifecycleState): NarrativeLifecycleState | null;
//# sourceMappingURL=sceneLifecycleMatrix.d.ts.map