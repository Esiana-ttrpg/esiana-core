"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.HAVEN_REFERENCE_TARGET_TYPES = exports.HAVEN_REFERENCE_TYPES = exports.HAVEN_ACTIVITY_TONES = exports.HAVEN_ACTIVITY_ORIGINS = exports.HAVEN_THREAT_SEVERITIES = exports.HAVEN_DISCOVERY_STATES = exports.HAVEN_PRIMARY_THEMES = exports.HAVEN_OWNERSHIP_TYPES = exports.HAVEN_SCALES = exports.DEFAULT_HAVEN_STATUS = exports.HAVEN_STATUSES = exports.DEFAULT_HAVEN_TYPE = exports.HAVEN_TYPES = exports.DOWNTIME_HAVEN_TEMPLATE_TYPE = exports.LEGACY_DOWNTIME_HAVEN_SEMANTICS_VERSION = exports.DOWNTIME_HAVEN_SEMANTICS_VERSION = void 0;
exports.normalizeNullableString = normalizeNullableString;
exports.normalizeStringArray = normalizeStringArray;
exports.normalizeHavenType = normalizeHavenType;
exports.normalizeHavenStatus = normalizeHavenStatus;
exports.normalizeHavenScale = normalizeHavenScale;
exports.normalizeHavenOwnershipType = normalizeHavenOwnershipType;
exports.normalizeHavenPrimaryTheme = normalizeHavenPrimaryTheme;
exports.normalizeHavenDiscoveryState = normalizeHavenDiscoveryState;
exports.normalizeHavenThreatSeverity = normalizeHavenThreatSeverity;
exports.normalizeHavenActivityOrigin = normalizeHavenActivityOrigin;
exports.normalizeHavenActivityTone = normalizeHavenActivityTone;
exports.normalizeSimulationHints = normalizeSimulationHints;
exports.parseHavenLedgerSimulationHints = parseHavenLedgerSimulationHints;
exports.parseHavenActivityEntry = parseHavenActivityEntry;
exports.emptyHavenIdentityHints = emptyHavenIdentityHints;
exports.normalizeHavenReferenceType = normalizeHavenReferenceType;
exports.normalizeHavenReferenceTargetType = normalizeHavenReferenceTargetType;
exports.parseHavenIdentityHints = parseHavenIdentityHints;
exports.parseHavenReferenceEntry = parseHavenReferenceEntry;
exports.parseHavenSpaceEntry = parseHavenSpaceEntry;
exports.sortHavenReferences = sortHavenReferences;
exports.sortHavenSpaces = sortHavenSpaces;
exports.createHavenReferenceEntry = createHavenReferenceEntry;
exports.createHavenSpaceEntry = createHavenSpaceEntry;
exports.createHavenBenefitEntry = createHavenBenefitEntry;
exports.emptyDowntimeHavenFields = emptyDowntimeHavenFields;
exports.parseDowntimeHavenFields = parseDowntimeHavenFields;
exports.formatHavenTypeLabel = formatHavenTypeLabel;
exports.formatHavenStatusLabel = formatHavenStatusLabel;
exports.formatHavenScaleLabel = formatHavenScaleLabel;
exports.formatHavenOwnershipLabel = formatHavenOwnershipLabel;
exports.formatHavenThemeLabel = formatHavenThemeLabel;
exports.formatHavenDiscoveryLabel = formatHavenDiscoveryLabel;
exports.isEscalatingThreat = isEscalatingThreat;
exports.sortThreatsBySeverity = sortThreatsBySeverity;
exports.sortActivityLogNewestFirst = sortActivityLogNewestFirst;
exports.createHavenCrewEntry = createHavenCrewEntry;
exports.createHavenActivityEntry = createHavenActivityEntry;
exports.createHavenUpgradeEntry = createHavenUpgradeEntry;
exports.createHavenThreatEntry = createHavenThreatEntry;
exports.parseProjectHavenEffectPayload = parseProjectHavenEffectPayload;
exports.activityToneToFeedTone = activityToneToFeedTone;
exports.threatSeverityToFeedTone = threatSeverityToFeedTone;
exports.DOWNTIME_HAVEN_SEMANTICS_VERSION = 'downtime-haven-v2';
exports.LEGACY_DOWNTIME_HAVEN_SEMANTICS_VERSION = 'downtime-haven-v1';
exports.DOWNTIME_HAVEN_TEMPLATE_TYPE = 'DOWNTIME_HAVEN';
exports.HAVEN_TYPES = [
    'inn',
    'ship',
    'camp',
    'sanctuary',
    'estate',
    'station',
    'fortress',
    'caravan',
    'custom',
];
exports.DEFAULT_HAVEN_TYPE = 'sanctuary';
exports.HAVEN_STATUSES = [
    'prosperous',
    'damaged',
    'hidden',
    'threatened',
    'under_siege',
];
exports.DEFAULT_HAVEN_STATUS = 'prosperous';
exports.HAVEN_SCALES = ['outpost', 'modest', 'sprawling', 'legendary'];
exports.HAVEN_OWNERSHIP_TYPES = [
    'party',
    'faction',
    'shared',
    'patron_owned',
];
exports.HAVEN_PRIMARY_THEMES = [
    'smuggler',
    'arcane',
    'militant',
    'noble',
    'sacred',
    'neutral',
];
exports.HAVEN_DISCOVERY_STATES = [
    'public',
    'known',
    'concealed',
    'mythic',
];
exports.HAVEN_THREAT_SEVERITIES = ['low', 'rising', 'critical'];
exports.HAVEN_ACTIVITY_ORIGINS = [
    'manual',
    'project_outcome',
    'event_consequence',
    'future_simulation',
    'migration',
];
exports.HAVEN_ACTIVITY_TONES = ['neutral', 'warning', 'escalation'];
const HAVEN_TYPE_LABELS = {
    inn: 'Inn',
    ship: 'Ship',
    camp: 'Camp',
    sanctuary: 'Sanctuary',
    estate: 'Estate',
    station: 'Station',
    fortress: 'Fortress',
    caravan: 'Caravan',
    custom: 'Custom',
};
const HAVEN_STATUS_LABELS = {
    prosperous: 'Prosperous',
    damaged: 'Damaged',
    hidden: 'Hidden',
    threatened: 'Threatened',
    under_siege: 'Under siege',
};
const HAVEN_SCALE_LABELS = {
    outpost: 'Outpost',
    modest: 'Modest',
    sprawling: 'Sprawling',
    legendary: 'Legendary',
};
const HAVEN_OWNERSHIP_LABELS = {
    party: 'Party',
    faction: 'Faction',
    shared: 'Shared',
    patron_owned: 'Patron-owned',
};
const HAVEN_THEME_LABELS = {
    smuggler: 'Smuggler',
    arcane: 'Arcane',
    militant: 'Militant',
    noble: 'Noble',
    sacred: 'Sacred',
    neutral: 'Neutral',
};
const HAVEN_DISCOVERY_LABELS = {
    public: 'Public',
    known: 'Known',
    concealed: 'Concealed',
    mythic: 'Mythic',
};
exports.HAVEN_REFERENCE_TYPES = [
    'map',
    'rules',
    'handout',
    'vtt_scene',
    'external_doc',
    'image',
    'timeline_event',
    'wiki_page',
];
exports.HAVEN_REFERENCE_TARGET_TYPES = [
    'wiki_page',
    'asset',
    'calendar_event',
    'map_pin',
    'external',
];
function randomId() {
    return `haven-${Math.random().toString(36).slice(2, 11)}`;
}
function normalizeNullableString(raw) {
    if (typeof raw !== 'string')
        return null;
    const trimmed = raw.trim();
    return trimmed.length > 0 ? trimmed : null;
}
function normalizeStringArray(raw) {
    if (!Array.isArray(raw))
        return [];
    return raw
        .filter((entry) => typeof entry === 'string')
        .map((entry) => entry.trim())
        .filter((entry) => entry.length > 0);
}
function normalizeHavenType(raw) {
    if (typeof raw === 'string') {
        const lower = raw.trim().toLowerCase();
        if (exports.HAVEN_TYPES.includes(lower)) {
            return lower;
        }
    }
    return exports.DEFAULT_HAVEN_TYPE;
}
function normalizeHavenStatus(raw) {
    if (typeof raw === 'string') {
        const lower = raw.trim().toLowerCase();
        if (exports.HAVEN_STATUSES.includes(lower)) {
            return lower;
        }
    }
    return exports.DEFAULT_HAVEN_STATUS;
}
function normalizeHavenScale(raw) {
    if (raw === null || raw === undefined)
        return null;
    if (typeof raw === 'string') {
        const lower = raw.trim().toLowerCase();
        if (exports.HAVEN_SCALES.includes(lower)) {
            return lower;
        }
    }
    return null;
}
function normalizeHavenOwnershipType(raw) {
    if (raw === null || raw === undefined)
        return null;
    if (typeof raw === 'string') {
        const lower = raw.trim().toLowerCase();
        if (exports.HAVEN_OWNERSHIP_TYPES.includes(lower)) {
            return lower;
        }
    }
    return null;
}
function normalizeHavenPrimaryTheme(raw) {
    if (raw === null || raw === undefined)
        return null;
    if (typeof raw === 'string') {
        const lower = raw.trim().toLowerCase();
        if (exports.HAVEN_PRIMARY_THEMES.includes(lower)) {
            return lower;
        }
    }
    return null;
}
function normalizeHavenDiscoveryState(raw) {
    if (raw === null || raw === undefined)
        return null;
    if (typeof raw === 'string') {
        const lower = raw.trim().toLowerCase();
        if (exports.HAVEN_DISCOVERY_STATES.includes(lower)) {
            return lower;
        }
    }
    return null;
}
function normalizeHavenThreatSeverity(raw) {
    if (raw === null || raw === undefined)
        return null;
    if (typeof raw === 'string') {
        const lower = raw.trim().toLowerCase();
        if (exports.HAVEN_THREAT_SEVERITIES.includes(lower)) {
            return lower;
        }
    }
    return null;
}
function normalizeHavenActivityOrigin(raw) {
    if (typeof raw === 'string') {
        const lower = raw.trim().toLowerCase();
        if (exports.HAVEN_ACTIVITY_ORIGINS.includes(lower)) {
            return lower;
        }
    }
    return 'manual';
}
function normalizeHavenActivityTone(raw) {
    if (raw === null || raw === undefined)
        return null;
    if (typeof raw === 'string') {
        const lower = raw.trim().toLowerCase();
        if (exports.HAVEN_ACTIVITY_TONES.includes(lower)) {
            return lower;
        }
    }
    return null;
}
function normalizeSimulationHints(raw) {
    if (!raw || typeof raw !== 'object' || Array.isArray(raw))
        return {};
    return { ...raw };
}
function parseHavenLedgerSimulationHints(raw) {
    const hints = normalizeSimulationHints(raw);
    const upkeepCost = typeof hints.upkeepCost === 'number' && Number.isFinite(hints.upkeepCost)
        ? Math.floor(hints.upkeepCost)
        : null;
    const constructionCost = typeof hints.constructionCost === 'number' && Number.isFinite(hints.constructionCost)
        ? Math.floor(hints.constructionCost)
        : null;
    return {
        ledgerUpkeepSuggestionsEnabled: hints.ledgerUpkeepSuggestionsEnabled === true,
        upkeepCost: upkeepCost != null && upkeepCost > 0 ? upkeepCost : null,
        constructionCost: constructionCost != null && constructionCost > 0 ? constructionCost : null,
    };
}
function parseCrewEntry(raw, index) {
    if (!raw || typeof raw !== 'object')
        return null;
    const record = raw;
    const label = normalizeNullableString(record.label);
    if (!label)
        return null;
    return {
        id: normalizeNullableString(record.id) ?? `crew-${index}`,
        label,
        role: normalizeNullableString(record.role),
        pageId: normalizeNullableString(record.pageId),
    };
}
function parseUpgradeEntry(raw, index) {
    if (!raw || typeof raw !== 'object')
        return null;
    const record = raw;
    const label = normalizeNullableString(record.label);
    if (!label)
        return null;
    return {
        id: normalizeNullableString(record.id) ?? `upgrade-${index}`,
        label,
        description: normalizeNullableString(record.description),
        establishedAtEpochMinute: normalizeNullableString(record.establishedAtEpochMinute),
        establishedByProjectId: normalizeNullableString(record.establishedByProjectId),
        establishedByProjectTitle: normalizeNullableString(record.establishedByProjectTitle),
    };
}
function parseThreatEntry(raw, index) {
    if (!raw || typeof raw !== 'object')
        return null;
    const record = raw;
    const label = normalizeNullableString(record.label);
    if (!label)
        return null;
    return {
        id: normalizeNullableString(record.id) ?? `threat-${index}`,
        label,
        severity: normalizeHavenThreatSeverity(record.severity),
        description: normalizeNullableString(record.description),
        sinceEpochMinute: normalizeNullableString(record.sinceEpochMinute),
    };
}
function parseBenefitEntry(raw, index) {
    if (!raw || typeof raw !== 'object')
        return null;
    const record = raw;
    const label = normalizeNullableString(record.label);
    if (!label)
        return null;
    return {
        id: normalizeNullableString(record.id) ?? `benefit-${index}`,
        label,
        description: normalizeNullableString(record.description),
    };
}
function parseHavenActivityEntry(raw, index) {
    if (!raw || typeof raw !== 'object')
        return null;
    const record = raw;
    const summary = normalizeNullableString(record.summary);
    if (!summary)
        return null;
    return {
        id: normalizeNullableString(record.id) ?? `activity-${index}`,
        summary,
        atEpochMinute: normalizeNullableString(record.atEpochMinute),
        tone: normalizeHavenActivityTone(record.tone),
        origin: normalizeHavenActivityOrigin(record.origin),
        sourceProjectId: normalizeNullableString(record.sourceProjectId),
    };
}
function emptyHavenIdentityHints() {
    return {
        summary: null,
        portraitAssetId: null,
        crestAssetId: null,
        galleryAssetIds: [],
    };
}
function normalizeHavenReferenceType(raw) {
    if (typeof raw === 'string') {
        const lower = raw.trim().toLowerCase();
        if (exports.HAVEN_REFERENCE_TYPES.includes(lower)) {
            return lower;
        }
    }
    return 'wiki_page';
}
function normalizeHavenReferenceTargetType(raw) {
    if (typeof raw === 'string') {
        const lower = raw.trim().toLowerCase();
        if (exports.HAVEN_REFERENCE_TARGET_TYPES.includes(lower)) {
            return lower;
        }
    }
    return 'wiki_page';
}
function normalizeSortOrder(raw, index) {
    if (typeof raw === 'number' && Number.isFinite(raw))
        return Math.trunc(raw);
    return index;
}
function parseHavenIdentityHints(raw) {
    const base = emptyHavenIdentityHints();
    if (!raw || typeof raw !== 'object')
        return base;
    const record = raw;
    return {
        summary: normalizeNullableString(record.summary),
        portraitAssetId: normalizeNullableString(record.portraitAssetId),
        crestAssetId: normalizeNullableString(record.crestAssetId),
        galleryAssetIds: normalizeStringArray(record.galleryAssetIds),
    };
}
function parseHavenReferenceEntry(raw, index) {
    if (!raw || typeof raw !== 'object')
        return null;
    const record = raw;
    const title = normalizeNullableString(record.title);
    if (!title)
        return null;
    const type = normalizeHavenReferenceType(record.type);
    const targetType = normalizeHavenReferenceTargetType(record.targetType);
    const url = normalizeNullableString(record.url);
    if (type === 'external_doc' && !url && targetType === 'external') {
        return null;
    }
    if (targetType !== 'external' && !normalizeNullableString(record.targetId) && !url) {
        return null;
    }
    return {
        id: normalizeNullableString(record.id) ?? `ref-${index}`,
        type,
        title,
        targetType,
        targetId: normalizeNullableString(record.targetId),
        url,
        relatedSpaceId: normalizeNullableString(record.relatedSpaceId),
        sortOrder: normalizeSortOrder(record.sortOrder, index),
    };
}
function parseHavenSpaceEntry(raw, index) {
    if (!raw || typeof raw !== 'object')
        return null;
    const record = raw;
    const label = normalizeNullableString(record.label);
    if (!label)
        return null;
    return {
        id: normalizeNullableString(record.id) ?? `space-${index}`,
        label,
        description: normalizeNullableString(record.description),
        sortOrder: normalizeSortOrder(record.sortOrder, index),
    };
}
function sortHavenReferences(entries) {
    return [...entries].sort((a, b) => a.sortOrder - b.sortOrder);
}
function sortHavenSpaces(entries) {
    return [...entries].sort((a, b) => a.sortOrder - b.sortOrder);
}
function createHavenReferenceEntry(input) {
    return {
        id: randomId(),
        type: input.type,
        title: input.title.trim(),
        targetType: input.targetType,
        targetId: input.targetId ?? null,
        url: input.url ?? null,
        relatedSpaceId: input.relatedSpaceId ?? null,
        sortOrder: input.sortOrder ?? 0,
    };
}
function createHavenSpaceEntry(input) {
    return {
        id: randomId(),
        label: input.label.trim(),
        description: input.description ?? null,
        sortOrder: input.sortOrder ?? 0,
    };
}
function createHavenBenefitEntry(input) {
    return {
        id: randomId(),
        label: input.label.trim(),
        description: input.description ?? null,
    };
}
function emptyDowntimeHavenFields() {
    return {
        semanticsVersion: exports.DOWNTIME_HAVEN_SEMANTICS_VERSION,
        havenType: exports.DEFAULT_HAVEN_TYPE,
        status: exports.DEFAULT_HAVEN_STATUS,
        locationPageId: null,
        scale: null,
        ownershipType: null,
        primaryTheme: null,
        establishedAt: null,
        discoveryState: null,
        residentPageIds: [],
        factionPageIds: [],
        crew: [],
        upgrades: [],
        threats: [],
        passiveBenefits: [],
        activityLog: [],
        relatedPageIds: [],
        identityHints: emptyHavenIdentityHints(),
        references: [],
        spaces: [],
        simulationHints: {},
    };
}
function parseDowntimeHavenFields(raw) {
    const base = emptyDowntimeHavenFields();
    if (!raw || typeof raw !== 'object')
        return base;
    const record = raw;
    const crew = Array.isArray(record.crew)
        ? record.crew
            .map((entry, index) => parseCrewEntry(entry, index))
            .filter((entry) => entry != null)
        : base.crew;
    const upgrades = Array.isArray(record.upgrades)
        ? record.upgrades
            .map((entry, index) => parseUpgradeEntry(entry, index))
            .filter((entry) => entry != null)
        : base.upgrades;
    const threats = Array.isArray(record.threats)
        ? record.threats
            .map((entry, index) => parseThreatEntry(entry, index))
            .filter((entry) => entry != null)
        : base.threats;
    const passiveBenefits = Array.isArray(record.passiveBenefits)
        ? record.passiveBenefits
            .map((entry, index) => parseBenefitEntry(entry, index))
            .filter((entry) => entry != null)
        : base.passiveBenefits;
    const activityLog = Array.isArray(record.activityLog)
        ? record.activityLog
            .map((entry, index) => parseHavenActivityEntry(entry, index))
            .filter((entry) => entry != null)
        : base.activityLog;
    const references = Array.isArray(record.references)
        ? sortHavenReferences(record.references
            .map((entry, index) => parseHavenReferenceEntry(entry, index))
            .filter((entry) => entry != null))
        : base.references;
    const spaces = Array.isArray(record.spaces)
        ? sortHavenSpaces(record.spaces
            .map((entry, index) => parseHavenSpaceEntry(entry, index))
            .filter((entry) => entry != null))
        : base.spaces;
    return {
        semanticsVersion: normalizeNullableString(record.semanticsVersion) ?? exports.DOWNTIME_HAVEN_SEMANTICS_VERSION,
        havenType: normalizeHavenType(record.havenType),
        status: normalizeHavenStatus(record.status),
        locationPageId: normalizeNullableString(record.locationPageId),
        scale: normalizeHavenScale(record.scale),
        ownershipType: normalizeHavenOwnershipType(record.ownershipType),
        primaryTheme: normalizeHavenPrimaryTheme(record.primaryTheme),
        establishedAt: normalizeNullableString(record.establishedAt),
        discoveryState: normalizeHavenDiscoveryState(record.discoveryState),
        residentPageIds: normalizeStringArray(record.residentPageIds),
        factionPageIds: normalizeStringArray(record.factionPageIds),
        crew,
        upgrades,
        threats,
        passiveBenefits,
        activityLog,
        relatedPageIds: normalizeStringArray(record.relatedPageIds),
        identityHints: parseHavenIdentityHints(record.identityHints),
        references,
        spaces,
        simulationHints: normalizeSimulationHints(record.simulationHints),
    };
}
function formatHavenTypeLabel(type) {
    if (!type)
        return 'Haven';
    return HAVEN_TYPE_LABELS[type] ?? type;
}
function formatHavenStatusLabel(status) {
    if (!status)
        return 'Unknown';
    return HAVEN_STATUS_LABELS[status] ?? status;
}
function formatHavenScaleLabel(scale) {
    if (!scale)
        return null;
    return HAVEN_SCALE_LABELS[scale] ?? scale;
}
function formatHavenOwnershipLabel(ownership) {
    if (!ownership)
        return null;
    return HAVEN_OWNERSHIP_LABELS[ownership] ?? ownership;
}
function formatHavenThemeLabel(theme) {
    if (!theme)
        return null;
    return HAVEN_THEME_LABELS[theme] ?? theme;
}
function formatHavenDiscoveryLabel(state) {
    if (!state)
        return null;
    return HAVEN_DISCOVERY_LABELS[state] ?? state;
}
function isEscalatingThreat(threat) {
    return threat.severity === 'rising' || threat.severity === 'critical';
}
function sortThreatsBySeverity(threats) {
    const order = { critical: 0, rising: 1, low: 2 };
    return [...threats].sort((a, b) => {
        const aKey = a.severity ?? 'low';
        const bKey = b.severity ?? 'low';
        return (order[aKey] ?? 3) - (order[bKey] ?? 3);
    });
}
function sortActivityLogNewestFirst(entries) {
    return [...entries].sort((a, b) => {
        const aMinute = a.atEpochMinute ? BigInt(a.atEpochMinute) : 0n;
        const bMinute = b.atEpochMinute ? BigInt(b.atEpochMinute) : 0n;
        if (aMinute !== bMinute)
            return aMinute > bMinute ? -1 : 1;
        return 0;
    });
}
function createHavenCrewEntry(input) {
    return {
        id: randomId(),
        label: input.label.trim(),
        role: input.role ?? null,
        pageId: input.pageId ?? null,
    };
}
function createHavenActivityEntry(input) {
    return {
        id: randomId(),
        summary: input.summary.trim(),
        atEpochMinute: input.atEpochMinute ?? null,
        tone: input.tone ?? null,
        origin: input.origin,
        sourceProjectId: input.sourceProjectId ?? null,
    };
}
function createHavenUpgradeEntry(input) {
    return {
        id: randomId(),
        label: input.label.trim(),
        description: input.description ?? null,
        establishedAtEpochMinute: input.establishedAtEpochMinute ?? null,
        establishedByProjectId: input.establishedByProjectId ?? null,
        establishedByProjectTitle: input.establishedByProjectTitle ?? null,
    };
}
function createHavenThreatEntry(input) {
    return {
        id: randomId(),
        label: input.label.trim(),
        severity: input.severity ?? null,
        description: input.description ?? null,
        sinceEpochMinute: input.sinceEpochMinute ?? null,
    };
}
function parseProjectHavenEffectPayload(raw) {
    if (!raw || typeof raw !== 'object')
        return null;
    const record = raw;
    const payload = {};
    const activitySummary = normalizeNullableString(record.activitySummary);
    if (activitySummary)
        payload.activitySummary = activitySummary;
    if (record.status !== undefined) {
        payload.status = normalizeHavenStatus(record.status);
    }
    if (record.upgrade && typeof record.upgrade === 'object') {
        const upgrade = record.upgrade;
        const label = normalizeNullableString(upgrade.label);
        if (label) {
            payload.upgrade = {
                label,
                description: normalizeNullableString(upgrade.description),
            };
        }
    }
    if (record.threat && typeof record.threat === 'object') {
        const threat = record.threat;
        const label = normalizeNullableString(threat.label);
        if (label) {
            payload.threat = {
                label,
                severity: normalizeHavenThreatSeverity(threat.severity),
                description: normalizeNullableString(threat.description),
            };
        }
    }
    if (record.simulationDeltas && typeof record.simulationDeltas === 'object') {
        const rawDeltas = record.simulationDeltas;
        const axisKeys = [
            'prosperity',
            'danger',
            'morale',
            'notoriety',
            'stability',
            'security',
        ];
        const deltas = {};
        for (const key of axisKeys) {
            const value = rawDeltas[key];
            if (typeof value === 'number' && Number.isFinite(value)) {
                deltas[key] = value;
            }
        }
        if (Object.keys(deltas).length > 0) {
            payload.simulationDeltas = deltas;
        }
    }
    if (payload.activitySummary ||
        payload.status ||
        payload.upgrade ||
        payload.threat ||
        payload.simulationDeltas) {
        return payload;
    }
    return null;
}
function activityToneToFeedTone(tone) {
    if (tone === 'warning')
        return 'warning';
    if (tone === 'escalation')
        return 'escalation';
    return 'neutral';
}
function threatSeverityToFeedTone(severity) {
    if (severity === 'critical')
        return 'escalation';
    if (severity === 'rising')
        return 'warning';
    return 'neutral';
}
//# sourceMappingURL=havenMetadata.js.map