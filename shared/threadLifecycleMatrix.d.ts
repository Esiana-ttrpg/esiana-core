/**
 * Lifecycle-authoritative / status-descriptive rules for open narrative threads.
 */
import type { NarrativeLifecycleState } from './narrativeLifecycle.js';
import type { ThreadStatus } from './threadMetadata.js';
export declare function allowedThreadStatusesForLifecycle(lifecycle: NarrativeLifecycleState): readonly ThreadStatus[];
export declare function defaultThreadStatusForLifecycle(lifecycle: NarrativeLifecycleState): ThreadStatus;
export declare function isThreadStatusAllowedForLifecycle(status: ThreadStatus, lifecycle: NarrativeLifecycleState): boolean;
/** Coerce status to the nearest allowed value for lifecycle (prefer default). */
export declare function coerceThreadStatusForLifecycle(status: ThreadStatus, lifecycle: NarrativeLifecycleState): ThreadStatus;
/**
 * Status PATCH may request a lifecycle transition only for terminal mappings.
 * Returns null when status change stays within current lifecycle constraints.
 */
export declare function lifecycleTargetForThreadStatusPatch(targetStatus: ThreadStatus, currentLifecycle: NarrativeLifecycleState): NarrativeLifecycleState | null;
export declare function lifecycleToThreadStatus(state: NarrativeLifecycleState, existingStatus?: ThreadStatus): ThreadStatus;
//# sourceMappingURL=threadLifecycleMatrix.d.ts.map