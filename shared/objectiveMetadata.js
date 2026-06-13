"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DEFAULT_OBJECTIVE_STATUS = exports.OBJECTIVE_STATUSES = exports.OBJECTIVE_METADATA_VERSION = void 0;
exports.normalizeObjectiveStatus = normalizeObjectiveStatus;
exports.normalizeSortOrder = normalizeSortOrder;
exports.normalizeNullableString = normalizeNullableString;
exports.parseObjectiveMetadata = parseObjectiveMetadata;
exports.emptyObjectiveMetadata = emptyObjectiveMetadata;
exports.isObjectiveMetadataPresent = isObjectiveMetadataPresent;
exports.sanitizeObjectiveMetadataForStorage = sanitizeObjectiveMetadataForStorage;
/**
 * Layer 5 — quest-scoped objective metadata (wiki child of quest page).
 * Parent quest = wiki parentId only — never stored here.
 * @see docs/platform/narrative-objectives.md
 */
exports.OBJECTIVE_METADATA_VERSION = 'objective-metadata-v1';
exports.OBJECTIVE_STATUSES = ['PLANNED', 'ACTIVE', 'COMPLETED', 'SKIPPED'];
exports.DEFAULT_OBJECTIVE_STATUS = 'PLANNED';
function normalizeObjectiveStatus(raw) {
    if (typeof raw === 'string') {
        const upper = raw.trim().toUpperCase();
        if (exports.OBJECTIVE_STATUSES.includes(upper)) {
            return upper;
        }
    }
    return exports.DEFAULT_OBJECTIVE_STATUS;
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
function normalizeNullableString(raw) {
    if (typeof raw !== 'string')
        return null;
    const trimmed = raw.trim();
    return trimmed.length > 0 ? trimmed : null;
}
function buildObjectiveFieldsFromRaw(raw) {
    return {
        objectiveMetadataVersion: typeof raw.objectiveMetadataVersion === 'string' && raw.objectiveMetadataVersion.trim()
            ? raw.objectiveMetadataVersion.trim()
            : exports.OBJECTIVE_METADATA_VERSION,
        objectiveStatus: normalizeObjectiveStatus(raw.objectiveStatus),
        sortOrder: normalizeSortOrder(raw.sortOrder),
        summary: normalizeNullableString(raw.summary),
    };
}
function parseObjectiveMetadata(metadata) {
    if (!metadata || typeof metadata !== 'object') {
        return emptyObjectiveMetadata();
    }
    return buildObjectiveFieldsFromRaw(metadata);
}
function emptyObjectiveMetadata() {
    return {
        objectiveMetadataVersion: exports.OBJECTIVE_METADATA_VERSION,
        objectiveStatus: exports.DEFAULT_OBJECTIVE_STATUS,
        sortOrder: null,
        summary: null,
    };
}
function isObjectiveMetadataPresent(metadata) {
    if (!metadata || typeof metadata !== 'object')
        return false;
    const raw = metadata;
    return (raw.objectiveStatus !== undefined ||
        raw.objectiveMetadataVersion !== undefined ||
        raw.summary !== undefined ||
        raw.sortOrder !== undefined);
}
/** Strip legacy relational keys that must not be persisted on objectives. */
function sanitizeObjectiveMetadataForStorage(metadata) {
    const next = { ...metadata };
    delete next.parentQuestPageId;
    delete next.linkedScenePageIds;
    return next;
}
//# sourceMappingURL=objectiveMetadata.js.map