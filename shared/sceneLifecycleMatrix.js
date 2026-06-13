"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.allowedSceneStatusesForLifecycle = allowedSceneStatusesForLifecycle;
exports.coerceSceneStatusForLifecycle = coerceSceneStatusForLifecycle;
exports.defaultSceneStatusForLifecycle = defaultSceneStatusForLifecycle;
exports.lifecycleToSceneStatus = lifecycleToSceneStatus;
exports.lifecycleTargetForSceneStatusPatch = lifecycleTargetForSceneStatusPatch;
const narrativeLifecycle_js_1 = require("./narrativeLifecycle.js");
const sceneMetadata_js_1 = require("./sceneMetadata.js");
const ALLOWED_STATUS_BY_LIFECYCLE = {
    [narrativeLifecycle_js_1.NarrativeLifecycleStates.LOCKED]: ['PLANNED'],
    [narrativeLifecycle_js_1.NarrativeLifecycleStates.DISCOVERED]: ['PLANNED', 'READY'],
    [narrativeLifecycle_js_1.NarrativeLifecycleStates.ACTIVE]: ['READY'],
    [narrativeLifecycle_js_1.NarrativeLifecycleStates.COMPLETED]: ['PLAYED'],
    [narrativeLifecycle_js_1.NarrativeLifecycleStates.FAILED]: ['SKIPPED'],
};
function allowedSceneStatusesForLifecycle(lifecycle) {
    return ALLOWED_STATUS_BY_LIFECYCLE[lifecycle] ?? ['PLANNED'];
}
function coerceSceneStatusForLifecycle(status, lifecycle) {
    const allowed = allowedSceneStatusesForLifecycle(lifecycle);
    if (allowed.includes(status))
        return status;
    return allowed[0] ?? sceneMetadata_js_1.DEFAULT_SCENE_STATUS;
}
function defaultSceneStatusForLifecycle(lifecycle) {
    const allowed = allowedSceneStatusesForLifecycle(lifecycle);
    return allowed[0] ?? sceneMetadata_js_1.DEFAULT_SCENE_STATUS;
}
function lifecycleToSceneStatus(lifecycle, existingStatus) {
    switch (lifecycle) {
        case narrativeLifecycle_js_1.NarrativeLifecycleStates.LOCKED:
            return 'PLANNED';
        case narrativeLifecycle_js_1.NarrativeLifecycleStates.DISCOVERED:
            return existingStatus === 'READY' ? 'READY' : 'PLANNED';
        case narrativeLifecycle_js_1.NarrativeLifecycleStates.ACTIVE:
            return 'READY';
        case narrativeLifecycle_js_1.NarrativeLifecycleStates.COMPLETED:
            return 'PLAYED';
        case narrativeLifecycle_js_1.NarrativeLifecycleStates.FAILED:
            return 'SKIPPED';
        default:
            return sceneMetadata_js_1.DEFAULT_SCENE_STATUS;
    }
}
function lifecycleTargetForSceneStatusPatch(status, currentLifecycle) {
    switch (status) {
        case 'PLANNED':
            if (currentLifecycle === narrativeLifecycle_js_1.NarrativeLifecycleStates.LOCKED)
                return null;
            return narrativeLifecycle_js_1.NarrativeLifecycleStates.DISCOVERED;
        case 'READY':
            return narrativeLifecycle_js_1.NarrativeLifecycleStates.ACTIVE;
        case 'PLAYED':
            return narrativeLifecycle_js_1.NarrativeLifecycleStates.COMPLETED;
        case 'SKIPPED':
            return narrativeLifecycle_js_1.NarrativeLifecycleStates.FAILED;
        default:
            return null;
    }
}
//# sourceMappingURL=sceneLifecycleMatrix.js.map