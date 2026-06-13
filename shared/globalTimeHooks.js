"use strict";
/**
 * Global time hooks — Layer 1 temporal simulation spine (browser-safe contracts).
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.GLOBAL_TIME_HOOK_ORDER = exports.GLOBAL_TIME_HOOK_DEFINITIONS = exports.GLOBAL_TIME_HOOK_IDS = exports.MAX_HOOK_SUMMARY_LENGTH = exports.STUB_HANDLER_VERSION = exports.TIME_HOOKS_SEMANTICS_VERSION = void 0;
exports.computeAdvanceMagnitude = computeAdvanceMagnitude;
exports.truncateHookSummary = truncateHookSummary;
exports.emptyHookCounts = emptyHookCounts;
exports.getHookDefinition = getHookDefinition;
exports.TIME_HOOKS_SEMANTICS_VERSION = 'time-hooks-v1';
exports.STUB_HANDLER_VERSION = 'stub-v1';
/** Max operational summary length stored in simulation receipts. */
exports.MAX_HOOK_SUMMARY_LENGTH = 200;
exports.GLOBAL_TIME_HOOK_IDS = [
    'cooldown_expiry',
    'project_progression',
    'haven_updates',
    'upkeep',
    'reputation_shifts',
    'event_generation',
];
/** Fixed handler order — do not reorder casually. `event_generation` is always last. */
exports.GLOBAL_TIME_HOOK_DEFINITIONS = [
    { id: 'cooldown_expiry', kind: 'canonical', plannedPhase: 8 },
    { id: 'project_progression', kind: 'canonical', plannedPhase: 2 },
    { id: 'haven_updates', kind: 'canonical', plannedPhase: 3 },
    { id: 'upkeep', kind: 'canonical', plannedPhase: 4 },
    { id: 'reputation_shifts', kind: 'canonical', plannedPhase: 5 },
    { id: 'event_generation', kind: 'advisory', plannedPhase: 6 },
];
exports.GLOBAL_TIME_HOOK_ORDER = exports.GLOBAL_TIME_HOOK_DEFINITIONS.map((def) => def.id);
const MINUTES_PER_HOUR = 60n;
const MINUTES_PER_DAY = 1440n;
const MINUTES_PER_WEEK = MINUTES_PER_DAY * 7n;
const MINUTES_PER_30_DAYS = MINUTES_PER_DAY * 30n;
function computeAdvanceMagnitude(elapsedMinutes) {
    if (elapsedMinutes < MINUTES_PER_HOUR)
        return 'tiny';
    if (elapsedMinutes < MINUTES_PER_DAY)
        return 'small';
    if (elapsedMinutes < MINUTES_PER_WEEK)
        return 'medium';
    if (elapsedMinutes < MINUTES_PER_30_DAYS)
        return 'large';
    return 'massive';
}
function truncateHookSummary(summary) {
    if (!summary)
        return undefined;
    const trimmed = summary.trim();
    if (!trimmed)
        return undefined;
    if (trimmed.length <= exports.MAX_HOOK_SUMMARY_LENGTH)
        return trimmed;
    return `${trimmed.slice(0, exports.MAX_HOOK_SUMMARY_LENGTH - 1)}…`;
}
function emptyHookCounts() {
    return {
        entitiesScanned: 0,
        entitiesUpdated: 0,
        eventsGenerated: 0,
    };
}
function getHookDefinition(hookId) {
    const def = exports.GLOBAL_TIME_HOOK_DEFINITIONS.find((entry) => entry.id === hookId);
    if (!def) {
        throw new Error(`Unknown global time hook: ${hookId}`);
    }
    return def;
}
//# sourceMappingURL=globalTimeHooks.js.map