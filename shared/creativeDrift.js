"use strict";
/**
 * Layer 3 — creative drift (narrative thermodynamics inbox).
 * Browser-safe types/constants only — fingerprints live in creativeDriftFingerprint.ts.
 * @see docs/platform/creative-drift.md
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.COOLING_BAND_UI_LABELS = exports.CREATIVE_DRIFT_BUCKET_UI_LABELS = exports.COOLING_LONG_DAYS = exports.COOLING_RECENT_DAYS = exports.REAWAKENED_DAYS_WINDOW = exports.DRIFT_DISPOSITION_KINDS = exports.DRIFT_REACTIVATION_STATES = exports.DRIFT_COOLING_BANDS = exports.DRIFT_SUBJECT_KINDS = exports.CREATIVE_DRIFT_BUCKETS = exports.CREATIVE_DRIFT_RESERVED_BUCKETS = exports.CREATIVE_DRIFT_ACTIVE_BUCKETS = exports.CREATIVE_DRIFT_VERSION = void 0;
exports.parseCreativeDriftDispositionMap = parseCreativeDriftDispositionMap;
exports.isDispositionActive = isDispositionActive;
exports.isDispositionSnoozedHidden = isDispositionSnoozedHidden;
exports.weightMultiplier = weightMultiplier;
exports.computeCoolingBand = computeCoolingBand;
exports.computeCoolingScore = computeCoolingScore;
exports.sortDriftFindings = sortDriftFindings;
exports.CREATIVE_DRIFT_VERSION = 'creative-drift-v1';
/** Surfaced in v1 UI */
exports.CREATIVE_DRIFT_ACTIVE_BUCKETS = [
    'dormant_plotlines',
    'unused_entities',
    'hanging_promises',
    'emotional_residue',
];
/** Reserved — not computed or surfaced in v1 */
exports.CREATIVE_DRIFT_RESERVED_BUCKETS = ['ambient_residue'];
exports.CREATIVE_DRIFT_BUCKETS = [
    ...exports.CREATIVE_DRIFT_ACTIVE_BUCKETS,
    ...exports.CREATIVE_DRIFT_RESERVED_BUCKETS,
];
exports.DRIFT_SUBJECT_KINDS = [
    'open_thread',
    'quest',
    'wiki_page',
    'branch_node',
];
exports.DRIFT_COOLING_BANDS = ['recent', 'moderate', 'long'];
exports.DRIFT_REACTIVATION_STATES = ['none', 'recently_reawakened'];
exports.DRIFT_DISPOSITION_KINDS = [
    'intentional',
    'revive_later',
    'archived',
    'snoozed',
];
exports.REAWAKENED_DAYS_WINDOW = 14;
exports.COOLING_RECENT_DAYS = 30;
exports.COOLING_LONG_DAYS = 60;
exports.CREATIVE_DRIFT_BUCKET_UI_LABELS = {
    dormant_plotlines: 'Dormant plotlines',
    unused_entities: 'Dormant figures & factions',
    hanging_promises: 'Unresolved promises',
    emotional_residue: 'Emotional beats',
};
exports.COOLING_BAND_UI_LABELS = {
    recent: "Hasn't appeared recently",
    moderate: 'Quietly lingering',
    long: 'Long unrevisited',
};
function parseCreativeDriftDispositionMap(raw) {
    if (!raw || typeof raw !== 'object' || Array.isArray(raw))
        return {};
    const out = {};
    for (const [key, value] of Object.entries(raw)) {
        if (!value || typeof value !== 'object' || Array.isArray(value))
            continue;
        const row = value;
        const kind = row.kind;
        if (typeof kind !== 'string' ||
            !exports.DRIFT_DISPOSITION_KINDS.includes(kind)) {
            continue;
        }
        const notedAt = typeof row.notedAt === 'string' ? row.notedAt : new Date().toISOString();
        out[key] = {
            kind: kind,
            notedAt,
            snoozeUntil: typeof row.snoozeUntil === 'string' ? row.snoozeUntil : null,
            note: typeof row.note === 'string' ? row.note : null,
            byUserId: typeof row.byUserId === 'string' ? row.byUserId : null,
        };
    }
    return out;
}
function isDispositionActive(disposition, now = new Date()) {
    if (!disposition)
        return 'hidden';
    if (disposition.kind === 'snoozed' && disposition.snoozeUntil) {
        const until = new Date(disposition.snoozeUntil);
        if (!Number.isNaN(until.getTime()) && until > now) {
            return 'hidden';
        }
        return 'hidden';
    }
    if (disposition.kind === 'intentional' ||
        disposition.kind === 'archived' ||
        disposition.kind === 'revive_later') {
        return 'acknowledged';
    }
    return 'hidden';
}
function isDispositionSnoozedHidden(disposition, now = new Date()) {
    if (!disposition || disposition.kind !== 'snoozed')
        return false;
    if (!disposition.snoozeUntil)
        return true;
    const until = new Date(disposition.snoozeUntil);
    return !Number.isNaN(until.getTime()) && until > now;
}
function weightMultiplier(weight) {
    switch (weight) {
        case 'critical':
            return 3;
        case 'major':
            return 2;
        default:
            return 1;
    }
}
function computeCoolingBand(daysSinceReference) {
    if (daysSinceReference < exports.COOLING_RECENT_DAYS)
        return 'recent';
    if (daysSinceReference < exports.COOLING_LONG_DAYS)
        return 'moderate';
    return 'long';
}
function computeCoolingScore(daysSinceReference, weight) {
    return daysSinceReference * weightMultiplier(weight);
}
function sortDriftFindings(a, b) {
    const weightOrder = { critical: 0, major: 1, minor: 2 };
    const wa = weightOrder[a.narrativeWeight];
    const wb = weightOrder[b.narrativeWeight];
    if (wa !== wb)
        return wa - wb;
    return (b._sortKey ?? 0) - (a._sortKey ?? 0);
}
//# sourceMappingURL=creativeDrift.js.map