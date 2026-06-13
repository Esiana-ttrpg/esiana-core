"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.allowedThreadStatusesForLifecycle = allowedThreadStatusesForLifecycle;
exports.defaultThreadStatusForLifecycle = defaultThreadStatusForLifecycle;
exports.isThreadStatusAllowedForLifecycle = isThreadStatusAllowedForLifecycle;
exports.coerceThreadStatusForLifecycle = coerceThreadStatusForLifecycle;
exports.lifecycleTargetForThreadStatusPatch = lifecycleTargetForThreadStatusPatch;
exports.lifecycleToThreadStatus = lifecycleToThreadStatus;
const narrativeLifecycle_js_1 = require("./narrativeLifecycle.js");
const threadMetadata_js_1 = require("./threadMetadata.js");
const LIFECYCLE_ALLOWED_STATUS = {
    [narrativeLifecycle_js_1.NarrativeLifecycleStates.LOCKED]: [],
    [narrativeLifecycle_js_1.NarrativeLifecycleStates.DISCOVERED]: ['OPEN', 'DORMANT'],
    [narrativeLifecycle_js_1.NarrativeLifecycleStates.ACTIVE]: ['OPEN'],
    [narrativeLifecycle_js_1.NarrativeLifecycleStates.COMPLETED]: ['RESOLVED'],
    [narrativeLifecycle_js_1.NarrativeLifecycleStates.FAILED]: ['ABANDONED'],
};
const LIFECYCLE_DEFAULT_STATUS = {
    [narrativeLifecycle_js_1.NarrativeLifecycleStates.LOCKED]: 'OPEN',
    [narrativeLifecycle_js_1.NarrativeLifecycleStates.DISCOVERED]: 'OPEN',
    [narrativeLifecycle_js_1.NarrativeLifecycleStates.ACTIVE]: 'OPEN',
    [narrativeLifecycle_js_1.NarrativeLifecycleStates.COMPLETED]: 'RESOLVED',
    [narrativeLifecycle_js_1.NarrativeLifecycleStates.FAILED]: 'ABANDONED',
};
function allowedThreadStatusesForLifecycle(lifecycle) {
    return LIFECYCLE_ALLOWED_STATUS[lifecycle] ?? [];
}
function defaultThreadStatusForLifecycle(lifecycle) {
    return LIFECYCLE_DEFAULT_STATUS[lifecycle] ?? threadMetadata_js_1.DEFAULT_THREAD_STATUS;
}
function isThreadStatusAllowedForLifecycle(status, lifecycle) {
    return allowedThreadStatusesForLifecycle(lifecycle).includes(status);
}
/** Coerce status to the nearest allowed value for lifecycle (prefer default). */
function coerceThreadStatusForLifecycle(status, lifecycle) {
    if (isThreadStatusAllowedForLifecycle(status, lifecycle)) {
        return status;
    }
    return defaultThreadStatusForLifecycle(lifecycle);
}
/**
 * Status PATCH may request a lifecycle transition only for terminal mappings.
 * Returns null when status change stays within current lifecycle constraints.
 */
function lifecycleTargetForThreadStatusPatch(targetStatus, currentLifecycle) {
    if (!isThreadStatusAllowedForLifecycle(targetStatus, currentLifecycle)) {
        switch (targetStatus) {
            case 'RESOLVED':
                return narrativeLifecycle_js_1.NarrativeLifecycleStates.COMPLETED;
            case 'ABANDONED':
                return narrativeLifecycle_js_1.NarrativeLifecycleStates.FAILED;
            case 'DORMANT':
                if (currentLifecycle === narrativeLifecycle_js_1.NarrativeLifecycleStates.ACTIVE) {
                    return null;
                }
                if (currentLifecycle === narrativeLifecycle_js_1.NarrativeLifecycleStates.LOCKED) {
                    return narrativeLifecycle_js_1.NarrativeLifecycleStates.DISCOVERED;
                }
                return null;
            case 'OPEN':
                if (currentLifecycle === narrativeLifecycle_js_1.NarrativeLifecycleStates.LOCKED) {
                    return narrativeLifecycle_js_1.NarrativeLifecycleStates.DISCOVERED;
                }
                if (currentLifecycle === narrativeLifecycle_js_1.NarrativeLifecycleStates.DISCOVERED) {
                    return narrativeLifecycle_js_1.NarrativeLifecycleStates.ACTIVE;
                }
                return null;
            default:
                return null;
        }
    }
    return null;
}
function lifecycleToThreadStatus(state, existingStatus) {
    const allowed = allowedThreadStatusesForLifecycle(state);
    if (existingStatus &&
        allowed.includes(existingStatus)) {
        return existingStatus;
    }
    return defaultThreadStatusForLifecycle(state);
}
//# sourceMappingURL=threadLifecycleMatrix.js.map