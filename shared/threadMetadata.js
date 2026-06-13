"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.lifecycleTargetForThreadStatusPatch = exports.EMOTIONAL_RESIDUE_KINDS = exports.DEFAULT_THREAD_NARRATIVE_WEIGHT = exports.THREAD_NARRATIVE_WEIGHTS = exports.DEFAULT_THREAD_STATUS = exports.THREAD_STATUSES = exports.THREAD_KINDS = exports.THREAD_METADATA_VERSION = void 0;
exports.normalizeThreadKind = normalizeThreadKind;
exports.normalizeThreadStatus = normalizeThreadStatus;
exports.normalizeRelatedPageIds = normalizeRelatedPageIds;
exports.normalizeNullableId = normalizeNullableId;
exports.normalizeSortOrder = normalizeSortOrder;
exports.normalizePlayerSubmitted = normalizePlayerSubmitted;
exports.normalizeEmotionalResidueKind = normalizeEmotionalResidueKind;
exports.normalizeThreadNarrativeWeight = normalizeThreadNarrativeWeight;
exports.parseThreadNarrativeWeightStrict = parseThreadNarrativeWeightStrict;
exports.parseThreadKindStrict = parseThreadKindStrict;
exports.parseThreadMetadata = parseThreadMetadata;
exports.parseThreadMetadataWithWarnings = parseThreadMetadataWithWarnings;
exports.emptyThreadMetadata = emptyThreadMetadata;
exports.isThreadMetadataPresent = isThreadMetadataPresent;
exports.publishedThreadStatusToLifecycleHint = publishedThreadStatusToLifecycleHint;
exports.lifecycleToThreadStatus = lifecycleToThreadStatus;
exports.publishedThreadStatusToLifecycleTarget = publishedThreadStatusToLifecycleTarget;
const narrativeLifecycle_js_1 = require("./narrativeLifecycle.js");
const threadLifecycleMatrix_js_1 = require("./threadLifecycleMatrix.js");
exports.THREAD_METADATA_VERSION = 'thread-metadata-v1';
exports.THREAD_KINDS = [
    'mystery',
    'promise',
    'foreshadowing',
    'clue',
    'theory',
];
exports.THREAD_STATUSES = [
    'OPEN',
    'DORMANT',
    'RESOLVED',
    'ABANDONED',
];
exports.DEFAULT_THREAD_STATUS = 'OPEN';
exports.THREAD_NARRATIVE_WEIGHTS = ['minor', 'major', 'critical'];
exports.DEFAULT_THREAD_NARRATIVE_WEIGHT = 'major';
exports.EMOTIONAL_RESIDUE_KINDS = [
    'grief',
    'revenge',
    'rivalry',
    'romance',
    'debt',
    'other',
];
function normalizeThreadKind(raw) {
    if (typeof raw === 'string') {
        const lower = raw.trim().toLowerCase();
        if (exports.THREAD_KINDS.includes(lower)) {
            return lower;
        }
    }
    return 'mystery';
}
function normalizeThreadStatus(raw) {
    if (typeof raw === 'string') {
        const upper = raw.trim().toUpperCase();
        if (exports.THREAD_STATUSES.includes(upper)) {
            return upper;
        }
    }
    return exports.DEFAULT_THREAD_STATUS;
}
function normalizeRelatedPageIds(raw) {
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
function normalizePlayerSubmitted(raw) {
    return raw === true || raw === 'true' || raw === 1 || raw === '1';
}
function normalizeEmotionalResidueKind(raw) {
    if (typeof raw !== 'string')
        return null;
    const lower = raw.trim().toLowerCase();
    if (exports.EMOTIONAL_RESIDUE_KINDS.includes(lower)) {
        return lower;
    }
    return null;
}
function normalizeThreadNarrativeWeight(raw) {
    if (typeof raw === 'string') {
        const lower = raw.trim().toLowerCase();
        if (exports.THREAD_NARRATIVE_WEIGHTS.includes(lower)) {
            return lower;
        }
    }
    return exports.DEFAULT_THREAD_NARRATIVE_WEIGHT;
}
/** Strict parse for create/PATCH — returns null when invalid. */
function parseThreadNarrativeWeightStrict(raw) {
    if (typeof raw !== 'string')
        return null;
    const lower = raw.trim().toLowerCase();
    if (exports.THREAD_NARRATIVE_WEIGHTS.includes(lower)) {
        return lower;
    }
    return null;
}
/** Strict kind for create — returns null when not one of THREAD_KINDS. */
function parseThreadKindStrict(raw) {
    if (typeof raw !== 'string')
        return null;
    const lower = raw.trim().toLowerCase();
    if (exports.THREAD_KINDS.includes(lower)) {
        return lower;
    }
    return null;
}
function buildThreadFieldsFromRaw(raw) {
    const threadKind = normalizeThreadKind(raw.threadKind);
    const playerSubmitted = threadKind === 'theory' ? true : normalizePlayerSubmitted(raw.playerSubmitted);
    return {
        threadMetadataVersion: typeof raw.threadMetadataVersion === 'string' && raw.threadMetadataVersion.trim()
            ? raw.threadMetadataVersion.trim()
            : exports.THREAD_METADATA_VERSION,
        threadKind,
        threadStatus: normalizeThreadStatus(raw.threadStatus),
        narrativeWeight: normalizeThreadNarrativeWeight(raw.narrativeWeight),
        relatedPageIds: normalizeRelatedPageIds(raw.relatedPageIds),
        introducedSessionId: normalizeNullableId(raw.introducedSessionId),
        lastAdvancedSessionId: normalizeNullableId(raw.lastAdvancedSessionId),
        resolvedSessionId: normalizeNullableId(raw.resolvedSessionId),
        payoffPageId: normalizeNullableId(raw.payoffPageId),
        playerSubmitted,
        sortOrder: normalizeSortOrder(raw.sortOrder),
        emotionalResidueKind: normalizeEmotionalResidueKind(raw.emotionalResidueKind),
    };
}
function parseThreadMetadata(metadata) {
    if (!metadata || typeof metadata !== 'object') {
        return emptyThreadMetadata();
    }
    return buildThreadFieldsFromRaw(metadata);
}
function parseThreadMetadataWithWarnings(metadata) {
    const warnings = [];
    if (!metadata || typeof metadata !== 'object') {
        return { fields: emptyThreadMetadata(), warnings };
    }
    const raw = metadata;
    if (raw.threadKind !== undefined && typeof raw.threadKind === 'string') {
        const lower = raw.threadKind.trim().toLowerCase();
        if (lower && !exports.THREAD_KINDS.includes(lower)) {
            warnings.push('Unknown thread kind normalized to Mystery');
        }
    }
    if (raw.narrativeWeight !== undefined && typeof raw.narrativeWeight === 'string') {
        const lower = raw.narrativeWeight.trim().toLowerCase();
        if (lower && !exports.THREAD_NARRATIVE_WEIGHTS.includes(lower)) {
            warnings.push('Unknown narrative weight normalized to Major');
        }
    }
    return { fields: buildThreadFieldsFromRaw(raw), warnings };
}
function emptyThreadMetadata() {
    return {
        threadMetadataVersion: exports.THREAD_METADATA_VERSION,
        threadKind: 'mystery',
        threadStatus: exports.DEFAULT_THREAD_STATUS,
        narrativeWeight: exports.DEFAULT_THREAD_NARRATIVE_WEIGHT,
        relatedPageIds: [],
        introducedSessionId: null,
        lastAdvancedSessionId: null,
        resolvedSessionId: null,
        payoffPageId: null,
        playerSubmitted: false,
        sortOrder: null,
        emotionalResidueKind: null,
    };
}
function isThreadMetadataPresent(metadata) {
    if (!metadata || typeof metadata !== 'object')
        return false;
    const raw = metadata;
    return (raw.threadKind !== undefined ||
        raw.threadStatus !== undefined ||
        raw.narrativeWeight !== undefined ||
        raw.relatedPageIds !== undefined ||
        raw.introducedSessionId !== undefined ||
        raw.lastAdvancedSessionId !== undefined ||
        raw.resolvedSessionId !== undefined ||
        raw.payoffPageId !== undefined ||
        raw.playerSubmitted !== undefined ||
        raw.sortOrder !== undefined ||
        raw.emotionalResidueKind !== undefined);
}
/** Backfill / hint mapping from published threadStatus. */
function publishedThreadStatusToLifecycleHint(status) {
    if (typeof status !== 'string') {
        return narrativeLifecycle_js_1.NarrativeLifecycleStates.DISCOVERED;
    }
    switch (status.trim().toUpperCase()) {
        case 'DORMANT':
            return narrativeLifecycle_js_1.NarrativeLifecycleStates.DISCOVERED;
        case 'RESOLVED':
            return narrativeLifecycle_js_1.NarrativeLifecycleStates.COMPLETED;
        case 'ABANDONED':
            return narrativeLifecycle_js_1.NarrativeLifecycleStates.FAILED;
        case 'OPEN':
        default:
            return narrativeLifecycle_js_1.NarrativeLifecycleStates.ACTIVE;
    }
}
function lifecycleToThreadStatus(state, existingStatus) {
    return (0, threadLifecycleMatrix_js_1.lifecycleToThreadStatus)(state, existingStatus);
}
/** @deprecated Use lifecycleTargetForThreadStatusPatch from threadLifecycleMatrix */
function publishedThreadStatusToLifecycleTarget(status, currentLifecycle) {
    return (0, threadLifecycleMatrix_js_1.lifecycleTargetForThreadStatusPatch)(status, currentLifecycle);
}
var threadLifecycleMatrix_js_2 = require("./threadLifecycleMatrix.js");
Object.defineProperty(exports, "lifecycleTargetForThreadStatusPatch", { enumerable: true, get: function () { return threadLifecycleMatrix_js_2.lifecycleTargetForThreadStatusPatch; } });
//# sourceMappingURL=threadMetadata.js.map