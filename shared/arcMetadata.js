"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ARC_KINDS = exports.ARC_METADATA_VERSION = void 0;
exports.normalizeArcKind = normalizeArcKind;
exports.normalizeStringArray = normalizeStringArray;
exports.parseArcMetadata = parseArcMetadata;
exports.emptyArcMetadata = emptyArcMetadata;
exports.isArcMetadataPresent = isArcMetadataPresent;
exports.mergeArcMetadata = mergeArcMetadata;
exports.classifyArcContainmentChild = classifyArcContainmentChild;
exports.validateArcContainment = validateArcContainment;
/**
 * Layer 5 — arc hierarchy overlay metadata (soft membership).
 */
exports.ARC_METADATA_VERSION = 'arc-metadata-v1';
exports.ARC_KINDS = ['campaign_arc', 'questline'];
function normalizeArcKind(raw) {
    if (typeof raw === 'string') {
        const lower = raw.trim().toLowerCase();
        if (exports.ARC_KINDS.includes(lower)) {
            return lower;
        }
    }
    return 'campaign_arc';
}
function normalizeStringArray(raw) {
    if (!Array.isArray(raw))
        return [];
    const ids = [];
    for (const entry of raw) {
        if (typeof entry === 'string' && entry.trim())
            ids.push(entry.trim());
    }
    return [...new Set(ids)];
}
function parseArcMetadata(metadata) {
    if (!metadata || typeof metadata !== 'object') {
        return emptyArcMetadata();
    }
    const raw = metadata;
    return {
        arcMetadataVersion: typeof raw.arcMetadataVersion === 'string' && raw.arcMetadataVersion.trim()
            ? raw.arcMetadataVersion.trim()
            : exports.ARC_METADATA_VERSION,
        arcKind: normalizeArcKind(raw.arcKind),
        containedPageIds: normalizeStringArray(raw.containedPageIds),
        actIndex: typeof raw.actIndex === 'number' && Number.isFinite(raw.actIndex) ? raw.actIndex : null,
        pacingTarget: typeof raw.pacingTarget === 'string' && raw.pacingTarget.trim()
            ? raw.pacingTarget.trim()
            : null,
    };
}
function emptyArcMetadata() {
    return {
        arcMetadataVersion: exports.ARC_METADATA_VERSION,
        arcKind: 'campaign_arc',
        containedPageIds: [],
        actIndex: null,
        pacingTarget: null,
    };
}
function isArcMetadataPresent(metadata) {
    if (!metadata || typeof metadata !== 'object')
        return false;
    const raw = metadata;
    return raw.arcKind !== undefined || raw.containedPageIds !== undefined;
}
function mergeArcMetadata(existing, patch) {
    const base = existing && typeof existing === 'object' ? { ...existing } : {};
    const parsed = parseArcMetadata(base);
    const merged = { ...parsed, ...patch };
    return {
        ...base,
        arcMetadataVersion: merged.arcMetadataVersion,
        arcKind: merged.arcKind,
        containedPageIds: merged.containedPageIds,
        actIndex: merged.actIndex,
        pacingTarget: merged.pacingTarget,
    };
}
function classifyArcContainmentChild(metadata, isQuestPage) {
    if (!metadata || typeof metadata !== 'object') {
        return isQuestPage ? 'quest' : 'unknown';
    }
    const arc = parseArcMetadata(metadata);
    if (isArcMetadataPresent(metadata) && arc.arcKind === 'questline') {
        return 'questline';
    }
    if (isQuestPage)
        return 'quest';
    return 'unknown';
}
function validateArcContainment(parentKind, childKind) {
    if (parentKind === 'campaign_arc')
        return childKind === 'questline';
    if (parentKind === 'questline')
        return childKind === 'quest';
    return false;
}
//# sourceMappingURL=arcMetadata.js.map