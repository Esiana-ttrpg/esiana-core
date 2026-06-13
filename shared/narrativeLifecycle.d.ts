/**
 * Layer 2 — narrative lifecycle orchestration (quests, future open threads).
 * @see docs/architecture-internal/narrative-lifecycle.md
 */
import type { NarrativePerspective } from './narrativeProjection.js';
export declare const NARRATIVE_LIFECYCLE_SEMANTICS_VERSION = "narrative-lifecycle-v1";
export declare const NarrativeLifecycleStates: {
    readonly LOCKED: "LOCKED";
    readonly DISCOVERED: "DISCOVERED";
    readonly ACTIVE: "ACTIVE";
    readonly COMPLETED: "COMPLETED";
    readonly FAILED: "FAILED";
};
export type NarrativeLifecycleState = (typeof NarrativeLifecycleStates)[keyof typeof NarrativeLifecycleStates];
export declare const NarrativeLifecycleSubjectKinds: {
    readonly QUEST: "quest";
    readonly OPEN_THREAD: "open_thread";
    readonly SCENE: "scene";
};
export type NarrativeLifecycleSubjectKind = (typeof NarrativeLifecycleSubjectKinds)[keyof typeof NarrativeLifecycleSubjectKinds];
/** Published Quest Hub metadata statuses (orchestration sync target). */
export type PublishedQuestStatus = 'AVAILABLE' | 'ACTIVE' | 'COMPLETED' | 'FAILED' | 'ABANDONED';
export declare const DEFAULT_QUEST_LIFECYCLE_STATE: NarrativeLifecycleState;
export declare class NarrativeLifecycleTransitionError extends Error {
    readonly code = "INVALID_LIFECYCLE_TRANSITION";
    readonly fromState: NarrativeLifecycleState;
    readonly toState: NarrativeLifecycleState;
    readonly allowedTargets: readonly NarrativeLifecycleState[];
    constructor(fromState: NarrativeLifecycleState, toState: NarrativeLifecycleState, allowedTargets: readonly NarrativeLifecycleState[]);
}
export declare function normalizeNarrativeLifecycleState(raw: unknown): NarrativeLifecycleState | null;
export declare function allowedLifecycleTransitions(from: NarrativeLifecycleState): readonly NarrativeLifecycleState[];
export declare function assertLifecycleTransition(from: NarrativeLifecycleState, to: NarrativeLifecycleState): void;
export interface NarrativeLifecycleProjection {
    canonical: NarrativeLifecycleState;
    /** State visible to the current viewer (null when hidden). */
    visible: NarrativeLifecycleState | null;
    /** Whether party-facing quest surfaces should include this subject. */
    partyVisible: boolean;
}
export declare function isLifecyclePartyVisible(state: NarrativeLifecycleState): boolean;
export declare function projectNarrativeLifecycle(state: NarrativeLifecycleState, ctx: {
    perspective: NarrativePerspective;
}): NarrativeLifecycleProjection;
export declare function lifecycleToPublishedQuestStatus(state: NarrativeLifecycleState, options?: {
    preserveAbandoned?: boolean;
}): PublishedQuestStatus;
/** Backfill / hint mapping from legacy published questStatus. */
export declare function publishedQuestStatusToLifecycleHint(status: unknown): NarrativeLifecycleState;
/**
 * Map a target published questStatus (e.g. Kanban drag) to a lifecycle transition target.
 * Returns null when the published status does not imply a lifecycle change.
 */
export declare function publishedQuestStatusToLifecycleTarget(status: PublishedQuestStatus, currentLifecycle: NarrativeLifecycleState): NarrativeLifecycleState | null;
//# sourceMappingURL=narrativeLifecycle.d.ts.map