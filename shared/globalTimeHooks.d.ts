/**
 * Global time hooks — Layer 1 temporal simulation spine (browser-safe contracts).
 */
export declare const TIME_HOOKS_SEMANTICS_VERSION = "time-hooks-v1";
export declare const STUB_HANDLER_VERSION = "stub-v1";
/** Max operational summary length stored in simulation receipts. */
export declare const MAX_HOOK_SUMMARY_LENGTH = 200;
export declare const GLOBAL_TIME_HOOK_IDS: readonly ["cooldown_expiry", "project_progression", "haven_updates", "upkeep", "reputation_shifts", "event_generation"];
export type GlobalTimeHookId = (typeof GLOBAL_TIME_HOOK_IDS)[number];
export type GlobalTimeHookKind = 'canonical' | 'advisory';
export type GlobalTimeHookStatus = 'skipped' | 'noop' | 'applied' | 'partial' | 'failed';
export type AdvanceMagnitude = 'tiny' | 'small' | 'medium' | 'large' | 'massive';
export type GlobalTimeAdvanceSource = 'time_tracking' | 'world_advance';
export type GlobalTimeHookCounts = {
    entitiesScanned?: number;
    entitiesUpdated?: number;
    eventsGenerated?: number;
};
export type GlobalTimeHookDefinition = {
    id: GlobalTimeHookId;
    kind: GlobalTimeHookKind;
    plannedPhase: number;
};
/** Fixed handler order — do not reorder casually. `event_generation` is always last. */
export declare const GLOBAL_TIME_HOOK_DEFINITIONS: readonly GlobalTimeHookDefinition[];
export declare const GLOBAL_TIME_HOOK_ORDER: readonly GlobalTimeHookId[];
export declare function computeAdvanceMagnitude(elapsedMinutes: bigint): AdvanceMagnitude;
export declare function truncateHookSummary(summary: string | undefined): string | undefined;
export type GlobalTimeAdvanceContext = {
    campaignId: string;
    previousEpochMinute: string;
    nextEpochMinute: string;
    elapsedMinutes: string;
    advancedBy: {
        amount: string;
        unit: string;
    };
    advanceMagnitude: AdvanceMagnitude;
    source: GlobalTimeAdvanceSource;
    actorUserId?: string;
    batchId?: string;
};
export type GlobalTimeHookResult = {
    hookId: GlobalTimeHookId;
    handlerVersion: string;
    status: GlobalTimeHookStatus;
    kind: GlobalTimeHookKind;
    durationMs: number;
    summary?: string;
    counts?: GlobalTimeHookCounts;
    error?: string;
};
export type GlobalTimeSimulationReceipt = {
    runId: string;
    semanticsVersion: string;
    context: GlobalTimeAdvanceContext;
    results: GlobalTimeHookResult[];
    startedAt: string;
    completedAt: string;
    durationMs: number;
};
export declare function emptyHookCounts(): GlobalTimeHookCounts;
export declare function getHookDefinition(hookId: GlobalTimeHookId): GlobalTimeHookDefinition;
//# sourceMappingURL=globalTimeHooks.d.ts.map