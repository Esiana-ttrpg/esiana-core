"use strict";
/**
 * Downtime period entity annotations — derived + optional GM overlay (chronology-facing).
 * @see docs/platform/downtime-timeline.md
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.MAX_DOWNTIME_LOCATION_MENTIONS_PER_PERIOD = exports.MAX_DOWNTIME_ANNOTATIONS_PER_PERIOD = exports.DOWNTIME_ENTITY_ROLES = exports.DOWNTIME_ANNOTATIONS_VERSION = void 0;
exports.parseDowntimeAnnotation = parseDowntimeAnnotation;
exports.parseDowntimeLocationMention = parseDowntimeLocationMention;
exports.parseDowntimeGapOverlay = parseDowntimeGapOverlay;
exports.parseDowntimeGapOverlayMap = parseDowntimeGapOverlayMap;
exports.mergeDowntimeAnnotations = mergeDowntimeAnnotations;
exports.mergeDowntimeLocationMentions = mergeDowntimeLocationMentions;
exports.formatDowntimeAnnotationRoleLabel = formatDowntimeAnnotationRoleLabel;
exports.DOWNTIME_ANNOTATIONS_VERSION = 'downtime-annotations-v1';
exports.DOWNTIME_ENTITY_ROLES = [
    'present',
    'absent',
    'affected',
    'occupied',
];
exports.MAX_DOWNTIME_ANNOTATIONS_PER_PERIOD = 6;
exports.MAX_DOWNTIME_LOCATION_MENTIONS_PER_PERIOD = 6;
function normalizeRole(raw) {
    if (typeof raw !== 'string')
        return undefined;
    const lower = raw.toLowerCase();
    return exports.DOWNTIME_ENTITY_ROLES.includes(lower)
        ? lower
        : undefined;
}
function normalizeEntityKind(raw) {
    if (raw === 'character' || raw === 'location' || raw === 'organization') {
        return raw;
    }
    return undefined;
}
function normalizeSource(raw) {
    return raw === 'authored' ? 'authored' : 'derived';
}
function parseDowntimeAnnotation(raw) {
    if (!raw || typeof raw !== 'object' || Array.isArray(raw))
        return null;
    const obj = raw;
    if (typeof obj.entityPageId !== 'string' || !obj.entityPageId.trim())
        return null;
    return {
        entityPageId: obj.entityPageId.trim(),
        entityKind: normalizeEntityKind(obj.entityKind),
        role: normalizeRole(obj.role),
        note: typeof obj.note === 'string' ? obj.note : null,
        source: normalizeSource(obj.source),
    };
}
function parseDowntimeLocationMention(raw) {
    if (!raw || typeof raw !== 'object' || Array.isArray(raw))
        return null;
    const obj = raw;
    if (typeof obj.note !== 'string' || !obj.note.trim())
        return null;
    const locationPageId = typeof obj.locationPageId === 'string' && obj.locationPageId.trim()
        ? obj.locationPageId.trim()
        : null;
    return {
        locationPageId,
        note: obj.note.trim(),
        source: normalizeSource(obj.source),
    };
}
function parseDowntimeGapOverlay(raw) {
    if (!raw || typeof raw !== 'object' || Array.isArray(raw))
        return null;
    const obj = raw;
    if (typeof obj.gapId !== 'string' || !obj.gapId.trim())
        return null;
    const annotations = Array.isArray(obj.annotations)
        ? obj.annotations
            .map(parseDowntimeAnnotation)
            .filter((a) => a !== null)
        : undefined;
    const locationMentions = Array.isArray(obj.locationMentions)
        ? obj.locationMentions
            .map(parseDowntimeLocationMention)
            .filter((m) => m !== null)
        : undefined;
    return {
        gapId: obj.gapId.trim(),
        promotedLabel: typeof obj.promotedLabel === 'string' ? obj.promotedLabel : null,
        annotations,
        locationMentions,
    };
}
function parseDowntimeGapOverlayMap(raw) {
    if (!raw || typeof raw !== 'object' || Array.isArray(raw))
        return {};
    const out = {};
    for (const [key, value] of Object.entries(raw)) {
        const parsed = parseDowntimeGapOverlay(value && typeof value === 'object'
            ? { ...value, gapId: key }
            : null);
        if (parsed)
            out[key] = parsed;
    }
    return out;
}
/** Authored overlays win on entityPageId; derived fills remaining slots. */
function mergeDowntimeAnnotations(authored, derived, cap = exports.MAX_DOWNTIME_ANNOTATIONS_PER_PERIOD) {
    const seen = new Set();
    const merged = [];
    for (const row of authored) {
        if (seen.has(row.entityPageId))
            continue;
        seen.add(row.entityPageId);
        merged.push(row);
        if (merged.length >= cap)
            return merged;
    }
    for (const row of derived) {
        if (seen.has(row.entityPageId))
            continue;
        seen.add(row.entityPageId);
        merged.push(row);
        if (merged.length >= cap)
            return merged;
    }
    return merged;
}
function mergeDowntimeLocationMentions(authored, derived, cap = exports.MAX_DOWNTIME_LOCATION_MENTIONS_PER_PERIOD) {
    const noteKey = (m) => `${m.locationPageId ?? ''}:${m.note.toLowerCase()}`;
    const seen = new Set();
    const merged = [];
    for (const row of authored) {
        const key = noteKey(row);
        if (seen.has(key))
            continue;
        seen.add(key);
        merged.push(row);
        if (merged.length >= cap)
            return merged;
    }
    for (const row of derived) {
        const key = noteKey(row);
        if (seen.has(key))
            continue;
        seen.add(key);
        merged.push(row);
        if (merged.length >= cap)
            return merged;
    }
    return merged;
}
function formatDowntimeAnnotationRoleLabel(role) {
    if (!role)
        return null;
    switch (role) {
        case 'present':
            return 'present';
        case 'absent':
            return 'absent';
        case 'occupied':
            return 'occupied';
        case 'affected':
            return 'affected';
        default:
            return role;
    }
}
//# sourceMappingURL=downtimeAnnotations.js.map