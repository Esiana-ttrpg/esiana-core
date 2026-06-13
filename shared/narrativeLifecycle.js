"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.NarrativeLifecycleTransitionError = exports.DEFAULT_QUEST_LIFECYCLE_STATE = exports.NarrativeLifecycleSubjectKinds = exports.NarrativeLifecycleStates = exports.NARRATIVE_LIFECYCLE_SEMANTICS_VERSION = void 0;
exports.normalizeNarrativeLifecycleState = normalizeNarrativeLifecycleState;
exports.allowedLifecycleTransitions = allowedLifecycleTransitions;
exports.assertLifecycleTransition = assertLifecycleTransition;
exports.isLifecyclePartyVisible = isLifecyclePartyVisible;
exports.projectNarrativeLifecycle = projectNarrativeLifecycle;
exports.lifecycleToPublishedQuestStatus = lifecycleToPublishedQuestStatus;
exports.publishedQuestStatusToLifecycleHint = publishedQuestStatusToLifecycleHint;
exports.publishedQuestStatusToLifecycleTarget = publishedQuestStatusToLifecycleTarget;
exports.NARRATIVE_LIFECYCLE_SEMANTICS_VERSION = 'narrative-lifecycle-v1';
exports.NarrativeLifecycleStates = {
    LOCKED: 'LOCKED',
    DISCOVERED: 'DISCOVERED',
    ACTIVE: 'ACTIVE',
    COMPLETED: 'COMPLETED',
    FAILED: 'FAILED',
};
exports.NarrativeLifecycleSubjectKinds = {
    QUEST: 'quest',
    OPEN_THREAD: 'open_thread',
    SCENE: 'scene',
};
exports.DEFAULT_QUEST_LIFECYCLE_STATE = exports.NarrativeLifecycleStates.LOCKED;
const LIFECYCLE_TRANSITIONS = {
    [exports.NarrativeLifecycleStates.LOCKED]: [
        exports.NarrativeLifecycleStates.DISCOVERED,
        exports.NarrativeLifecycleStates.ACTIVE,
    ],
    [exports.NarrativeLifecycleStates.DISCOVERED]: [
        exports.NarrativeLifecycleStates.ACTIVE,
        exports.NarrativeLifecycleStates.FAILED,
    ],
    [exports.NarrativeLifecycleStates.ACTIVE]: [
        exports.NarrativeLifecycleStates.COMPLETED,
        exports.NarrativeLifecycleStates.FAILED,
    ],
    [exports.NarrativeLifecycleStates.COMPLETED]: [],
    [exports.NarrativeLifecycleStates.FAILED]: [],
};
class NarrativeLifecycleTransitionError extends Error {
    code = 'INVALID_LIFECYCLE_TRANSITION';
    fromState;
    toState;
    allowedTargets;
    constructor(fromState, toState, allowedTargets) {
        super(`Invalid lifecycle transition from ${fromState} to ${toState}. Allowed: ${allowedTargets.join(', ') || '(none)'}`);
        this.name = 'NarrativeLifecycleTransitionError';
        this.fromState = fromState;
        this.toState = toState;
        this.allowedTargets = allowedTargets;
    }
}
exports.NarrativeLifecycleTransitionError = NarrativeLifecycleTransitionError;
function normalizeNarrativeLifecycleState(raw) {
    if (typeof raw !== 'string')
        return null;
    const upper = raw.trim().toUpperCase();
    const values = Object.values(exports.NarrativeLifecycleStates);
    if (values.includes(upper)) {
        return upper;
    }
    return null;
}
function allowedLifecycleTransitions(from) {
    return LIFECYCLE_TRANSITIONS[from] ?? [];
}
function assertLifecycleTransition(from, to) {
    const allowed = allowedLifecycleTransitions(from);
    if (!allowed.includes(to)) {
        throw new NarrativeLifecycleTransitionError(from, to, allowed);
    }
}
function isLifecyclePartyVisible(state) {
    return state !== exports.NarrativeLifecycleStates.LOCKED;
}
function projectNarrativeLifecycle(state, ctx) {
    const partyVisible = isLifecyclePartyVisible(state);
    if (ctx.perspective === 'elevated') {
        return { canonical: state, visible: state, partyVisible };
    }
    if (!partyVisible) {
        return { canonical: state, visible: null, partyVisible: false };
    }
    return { canonical: state, visible: state, partyVisible: true };
}
function lifecycleToPublishedQuestStatus(state, options) {
    switch (state) {
        case exports.NarrativeLifecycleStates.LOCKED:
            return 'AVAILABLE';
        case exports.NarrativeLifecycleStates.DISCOVERED:
            return 'AVAILABLE';
        case exports.NarrativeLifecycleStates.ACTIVE:
            return 'ACTIVE';
        case exports.NarrativeLifecycleStates.COMPLETED:
            return 'COMPLETED';
        case exports.NarrativeLifecycleStates.FAILED:
            return options?.preserveAbandoned ? 'ABANDONED' : 'FAILED';
        default:
            return 'AVAILABLE';
    }
}
/** Backfill / hint mapping from legacy published questStatus. */
function publishedQuestStatusToLifecycleHint(status) {
    if (typeof status !== 'string') {
        return exports.NarrativeLifecycleStates.DISCOVERED;
    }
    switch (status.trim().toUpperCase()) {
        case 'ACTIVE':
            return exports.NarrativeLifecycleStates.ACTIVE;
        case 'COMPLETED':
            return exports.NarrativeLifecycleStates.COMPLETED;
        case 'FAILED':
        case 'ABANDONED':
            return exports.NarrativeLifecycleStates.FAILED;
        case 'AVAILABLE':
        default:
            return exports.NarrativeLifecycleStates.DISCOVERED;
    }
}
/**
 * Map a target published questStatus (e.g. Kanban drag) to a lifecycle transition target.
 * Returns null when the published status does not imply a lifecycle change.
 */
function publishedQuestStatusToLifecycleTarget(status, currentLifecycle) {
    switch (status) {
        case 'AVAILABLE':
            if (currentLifecycle === exports.NarrativeLifecycleStates.LOCKED) {
                return exports.NarrativeLifecycleStates.DISCOVERED;
            }
            if (currentLifecycle === exports.NarrativeLifecycleStates.DISCOVERED) {
                return null;
            }
            return exports.NarrativeLifecycleStates.DISCOVERED;
        case 'ACTIVE':
            return exports.NarrativeLifecycleStates.ACTIVE;
        case 'COMPLETED':
            return exports.NarrativeLifecycleStates.COMPLETED;
        case 'FAILED':
        case 'ABANDONED':
            return exports.NarrativeLifecycleStates.FAILED;
        default:
            return null;
    }
}
//# sourceMappingURL=narrativeLifecycle.js.map