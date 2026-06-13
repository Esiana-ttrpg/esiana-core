"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.lifecycleTargetForSceneStatusPatch = exports.SCENE_OUTCOMES = exports.SCENE_KINDS = exports.SCENE_BEAT_TYPES = exports.DEFAULT_SCENE_NARRATIVE_WEIGHT = exports.SCENE_NARRATIVE_WEIGHTS = exports.DEFAULT_SCENE_STATUS = exports.SCENE_STATUSES = exports.SCENE_METADATA_VERSION = void 0;
exports.normalizeSceneStatus = normalizeSceneStatus;
exports.normalizeSceneNarrativeWeight = normalizeSceneNarrativeWeight;
exports.parseSceneNarrativeWeightStrict = parseSceneNarrativeWeightStrict;
exports.normalizeSceneBeatType = normalizeSceneBeatType;
exports.normalizeSceneKind = normalizeSceneKind;
exports.normalizeSceneOutcome = normalizeSceneOutcome;
exports.normalizeStringArray = normalizeStringArray;
exports.normalizeNullableId = normalizeNullableId;
exports.normalizeNullableString = normalizeNullableString;
exports.normalizeSortOrder = normalizeSortOrder;
exports.normalizeBranchConditions = normalizeBranchConditions;
exports.normalizeEntryConditions = normalizeEntryConditions;
exports.normalizeSceneOutcomes = normalizeSceneOutcomes;
exports.parseSceneMetadata = parseSceneMetadata;
exports.parseSceneMetadataWithWarnings = parseSceneMetadataWithWarnings;
exports.emptySceneMetadata = emptySceneMetadata;
exports.isSceneMetadataPresent = isSceneMetadataPresent;
exports.publishedSceneStatusToLifecycleHint = publishedSceneStatusToLifecycleHint;
exports.lifecycleToSceneStatus = lifecycleToSceneStatus;
const narrativeLifecycle_js_1 = require("./narrativeLifecycle.js");
const sceneLifecycleMatrix_js_1 = require("./sceneLifecycleMatrix.js");
exports.SCENE_METADATA_VERSION = 'scene-metadata-v1';
exports.SCENE_STATUSES = ['PLANNED', 'READY', 'PLAYED', 'SKIPPED'];
exports.DEFAULT_SCENE_STATUS = 'PLANNED';
exports.SCENE_NARRATIVE_WEIGHTS = ['minor', 'major', 'critical'];
exports.DEFAULT_SCENE_NARRATIVE_WEIGHT = 'major';
exports.SCENE_BEAT_TYPES = [
    'reveal',
    'complication',
    'choice',
    'escalation',
    'twist',
    'reversal',
    'resolution',
    'fallout',
    'setup',
    'loss',
];
exports.SCENE_KINDS = [
    'investigation',
    'faction',
    'environmental',
    'downtime',
    'flashback',
    'travel',
    'ambient',
    'combat',
    'social',
    'other',
];
exports.SCENE_OUTCOMES = [
    'information_revealed',
    'relationship_shift',
    'faction_escalation',
    'world_state_change',
    'location_unlock',
    'quest_unlock',
    'threat_progression',
    'resource_loss',
];
function normalizeSceneStatus(raw) {
    if (typeof raw === 'string') {
        const upper = raw.trim().toUpperCase();
        if (exports.SCENE_STATUSES.includes(upper)) {
            return upper;
        }
    }
    return exports.DEFAULT_SCENE_STATUS;
}
function normalizeSceneNarrativeWeight(raw) {
    if (typeof raw === 'string') {
        const lower = raw.trim().toLowerCase();
        if (exports.SCENE_NARRATIVE_WEIGHTS.includes(lower)) {
            return lower;
        }
    }
    return exports.DEFAULT_SCENE_NARRATIVE_WEIGHT;
}
function parseSceneNarrativeWeightStrict(raw) {
    if (typeof raw !== 'string')
        return null;
    const lower = raw.trim().toLowerCase();
    if (exports.SCENE_NARRATIVE_WEIGHTS.includes(lower)) {
        return lower;
    }
    return null;
}
function normalizeSceneBeatType(raw) {
    if (typeof raw !== 'string')
        return null;
    const lower = raw.trim().toLowerCase();
    if (exports.SCENE_BEAT_TYPES.includes(lower)) {
        return lower;
    }
    return null;
}
function normalizeSceneKind(raw) {
    if (typeof raw !== 'string')
        return null;
    const lower = raw.trim().toLowerCase();
    if (exports.SCENE_KINDS.includes(lower)) {
        return lower;
    }
    return null;
}
function normalizeSceneOutcome(raw) {
    if (typeof raw !== 'string')
        return null;
    const lower = raw.trim().toLowerCase();
    if (exports.SCENE_OUTCOMES.includes(lower)) {
        return lower;
    }
    return null;
}
function normalizeStringArray(raw) {
    if (!Array.isArray(raw))
        return [];
    const ids = [];
    for (const entry of raw) {
        if (typeof entry === 'string' && entry.trim()) {
            ids.push(entry.trim());
        }
    }
    return [...new Set(ids)];
}
function normalizeNullableId(raw) {
    if (typeof raw !== 'string')
        return null;
    const trimmed = raw.trim();
    return trimmed.length > 0 ? trimmed : null;
}
function normalizeNullableString(raw) {
    if (typeof raw !== 'string')
        return null;
    const trimmed = raw.trim();
    return trimmed.length > 0 ? trimmed : null;
}
function normalizeSortOrder(raw) {
    if (typeof raw === 'number' && Number.isFinite(raw))
        return raw;
    if (typeof raw === 'string' && raw.trim()) {
        const parsed = Number(raw);
        if (Number.isFinite(parsed))
            return parsed;
    }
    return null;
}
function normalizeBranchCondition(raw) {
    if (!raw || typeof raw !== 'object' || Array.isArray(raw))
        return null;
    const obj = raw;
    const type = obj.type;
    if (type === 'lifecycle' && typeof obj.subjectId === 'string' && typeof obj.state === 'string') {
        return { type: 'lifecycle', subjectId: obj.subjectId, state: obj.state };
    }
    if (type === 'calendar_event' && typeof obj.eventId === 'string') {
        return { type: 'calendar_event', eventId: obj.eventId };
    }
    if (type === 'graph_edge' &&
        typeof obj.sourcePageId === 'string' &&
        typeof obj.targetPageId === 'string' &&
        typeof obj.kind === 'string') {
        return {
            type: 'graph_edge',
            sourcePageId: obj.sourcePageId,
            targetPageId: obj.targetPageId,
            kind: obj.kind,
        };
    }
    if (type === 'manual_flag' && typeof obj.key === 'string' && typeof obj.value === 'boolean') {
        return { type: 'manual_flag', key: obj.key, value: obj.value };
    }
    return null;
}
function normalizeBranchConditions(raw) {
    if (!Array.isArray(raw))
        return [];
    const conditions = [];
    for (const entry of raw) {
        const parsed = normalizeBranchCondition(entry);
        if (parsed)
            conditions.push(parsed);
    }
    return conditions;
}
/** @deprecated Use normalizeBranchConditions */
function normalizeEntryConditions(raw) {
    return normalizeBranchConditions(raw);
}
function normalizeSceneOutcomes(raw) {
    if (!Array.isArray(raw))
        return [];
    const outcomes = [];
    for (const entry of raw) {
        if (!entry || typeof entry !== 'object')
            continue;
        const obj = entry;
        const outcomeType = normalizeSceneOutcome(obj.outcomeType);
        if (!outcomeType)
            continue;
        outcomes.push({
            outcomeType,
            description: normalizeNullableString(obj.description),
            linkedPageIds: normalizeStringArray(obj.linkedPageIds),
        });
    }
    return outcomes;
}
function buildSceneFieldsFromRaw(raw) {
    return {
        sceneMetadataVersion: typeof raw.sceneMetadataVersion === 'string' && raw.sceneMetadataVersion.trim()
            ? raw.sceneMetadataVersion.trim()
            : exports.SCENE_METADATA_VERSION,
        sceneStatus: normalizeSceneStatus(raw.sceneStatus),
        narrativeWeight: normalizeSceneNarrativeWeight(raw.narrativeWeight),
        beatType: normalizeSceneBeatType(raw.beatType),
        tone: normalizeNullableString(raw.tone),
        pacingTags: normalizeStringArray(raw.pacingTags),
        sceneKind: normalizeSceneKind(raw.sceneKind),
        summary: normalizeNullableString(raw.summary),
        entryConditions: normalizeBranchConditions(raw.entryConditions),
        exitConditions: normalizeBranchConditions(raw.exitConditions),
        outcomes: normalizeSceneOutcomes(raw.outcomes),
        participantPageIds: normalizeStringArray(raw.participantPageIds),
        locationPageId: normalizeNullableId(raw.locationPageId),
        linkedQuestPageIds: normalizeStringArray(raw.linkedQuestPageIds),
        linkedObjectivePageIds: normalizeStringArray(raw.linkedObjectivePageIds),
        linkedCluePageIds: normalizeStringArray(raw.linkedCluePageIds),
        linkedThreadPageIds: normalizeStringArray(raw.linkedThreadPageIds),
        consequencePageIds: normalizeStringArray(raw.consequencePageIds),
        followsScenePageIds: normalizeStringArray(raw.followsScenePageIds),
        plannedSessionId: normalizeNullableId(raw.plannedSessionId),
        playedSessionId: normalizeNullableId(raw.playedSessionId),
        gmNotes: normalizeNullableString(raw.gmNotes),
        sortOrder: normalizeSortOrder(raw.sortOrder),
    };
}
function parseSceneMetadata(metadata) {
    if (!metadata || typeof metadata !== 'object') {
        return emptySceneMetadata();
    }
    return buildSceneFieldsFromRaw(metadata);
}
function parseSceneMetadataWithWarnings(metadata) {
    const warnings = [];
    if (!metadata || typeof metadata !== 'object') {
        return { fields: emptySceneMetadata(), warnings };
    }
    const raw = metadata;
    if (raw.beatType !== undefined && typeof raw.beatType === 'string') {
        const lower = raw.beatType.trim().toLowerCase();
        if (lower && !exports.SCENE_BEAT_TYPES.includes(lower)) {
            warnings.push('Unknown beat type ignored');
        }
    }
    if (raw.narrativeWeight !== undefined && typeof raw.narrativeWeight === 'string') {
        const lower = raw.narrativeWeight.trim().toLowerCase();
        if (lower && !exports.SCENE_NARRATIVE_WEIGHTS.includes(lower)) {
            warnings.push('Unknown narrative weight normalized to Major');
        }
    }
    return { fields: buildSceneFieldsFromRaw(raw), warnings };
}
function emptySceneMetadata() {
    return {
        sceneMetadataVersion: exports.SCENE_METADATA_VERSION,
        sceneStatus: exports.DEFAULT_SCENE_STATUS,
        narrativeWeight: exports.DEFAULT_SCENE_NARRATIVE_WEIGHT,
        beatType: null,
        tone: null,
        pacingTags: [],
        sceneKind: null,
        summary: null,
        entryConditions: [],
        exitConditions: [],
        outcomes: [],
        participantPageIds: [],
        locationPageId: null,
        linkedQuestPageIds: [],
        linkedObjectivePageIds: [],
        linkedCluePageIds: [],
        linkedThreadPageIds: [],
        consequencePageIds: [],
        followsScenePageIds: [],
        plannedSessionId: null,
        playedSessionId: null,
        gmNotes: null,
        sortOrder: null,
    };
}
function isSceneMetadataPresent(metadata) {
    if (!metadata || typeof metadata !== 'object')
        return false;
    const raw = metadata;
    return (raw.sceneStatus !== undefined ||
        raw.beatType !== undefined ||
        raw.narrativeWeight !== undefined ||
        raw.summary !== undefined ||
        raw.entryConditions !== undefined ||
        raw.exitConditions !== undefined ||
        raw.outcomes !== undefined ||
        raw.participantPageIds !== undefined ||
        raw.linkedQuestPageIds !== undefined ||
        raw.linkedObjectivePageIds !== undefined ||
        raw.followsScenePageIds !== undefined ||
        raw.gmNotes !== undefined);
}
function publishedSceneStatusToLifecycleHint(status) {
    if (typeof status !== 'string') {
        return narrativeLifecycle_js_1.NarrativeLifecycleStates.LOCKED;
    }
    switch (status.trim().toUpperCase()) {
        case 'READY':
            return narrativeLifecycle_js_1.NarrativeLifecycleStates.DISCOVERED;
        case 'PLAYED':
            return narrativeLifecycle_js_1.NarrativeLifecycleStates.COMPLETED;
        case 'SKIPPED':
            return narrativeLifecycle_js_1.NarrativeLifecycleStates.FAILED;
        case 'PLANNED':
        default:
            return narrativeLifecycle_js_1.NarrativeLifecycleStates.LOCKED;
    }
}
function lifecycleToSceneStatus(state, existingStatus) {
    return (0, sceneLifecycleMatrix_js_1.lifecycleToSceneStatus)(state, existingStatus);
}
var sceneLifecycleMatrix_js_2 = require("./sceneLifecycleMatrix.js");
Object.defineProperty(exports, "lifecycleTargetForSceneStatusPatch", { enumerable: true, get: function () { return sceneLifecycleMatrix_js_2.lifecycleTargetForSceneStatusPatch; } });
//# sourceMappingURL=sceneMetadata.js.map