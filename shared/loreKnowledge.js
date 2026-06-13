"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.compareChronologyDateParts = exports.dateSortKey = exports.LoreRelationVisibilities = exports.LoreSourceEntityTypes = exports.KnowledgeStates = exports.NarrativeWeights = exports.ClaimSourceRoles = exports.LoreConfidences = exports.LoreAccountKinds = exports.LoreSourceTypes = exports.AliasUsageTypes = void 0;
exports.isDateWithinRange = isDateWithinRange;
exports.resolveHistoricalAliasesAtDate = resolveHistoricalAliasesAtDate;
exports.resolveFormerPrimaryChip = resolveFormerPrimaryChip;
exports.buildEntityHistoricalNameProjection = buildEntityHistoricalNameProjection;
exports.formatAliasUsageTypeLabel = formatAliasUsageTypeLabel;
exports.formatLoreAccountKindLabel = formatLoreAccountKindLabel;
const chronologyTypes_js_1 = require("./chronologyTypes.js");
Object.defineProperty(exports, "compareChronologyDateParts", { enumerable: true, get: function () { return chronologyTypes_js_1.compareChronologyDateParts; } });
Object.defineProperty(exports, "dateSortKey", { enumerable: true, get: function () { return chronologyTypes_js_1.dateSortKey; } });
exports.AliasUsageTypes = {
    OFFICIAL: 'OFFICIAL',
    COLLOQUIAL: 'COLLOQUIAL',
    PEJORATIVE: 'PEJORATIVE',
    RELIGIOUS: 'RELIGIOUS',
    FOREIGN_LANGUAGE: 'FOREIGN_LANGUAGE',
    SECRET: 'SECRET',
    MYTHIC: 'MYTHIC',
};
exports.LoreSourceTypes = {
    JOURNAL: 'JOURNAL',
    NPC_TESTIMONY: 'NPC_TESTIMONY',
    EVENT_RECORD: 'EVENT_RECORD',
    ARTIFACT: 'ARTIFACT',
    RUMOR: 'RUMOR',
    DIVINE_VISION: 'DIVINE_VISION',
    OTHER: 'OTHER',
};
exports.LoreAccountKinds = {
    WIDELY_ACCEPTED: 'WIDELY_ACCEPTED',
    REGIONAL_BELIEF: 'REGIONAL_BELIEF',
    MYTHIC_TRADITION: 'MYTHIC_TRADITION',
    SUPPRESSED: 'SUPPRESSED',
    PROPAGANDA: 'PROPAGANDA',
    UNVERIFIED: 'UNVERIFIED',
};
exports.LoreConfidences = {
    VERIFIED: 'VERIFIED',
    PARTIAL: 'PARTIAL',
    UNVERIFIED: 'UNVERIFIED',
    CONTESTED: 'CONTESTED',
};
exports.ClaimSourceRoles = {
    SUPPORTS: 'SUPPORTS',
    CONTRADICTS: 'CONTRADICTS',
    REFERENCES: 'REFERENCES',
};
exports.NarrativeWeights = {
    MINOR: 'MINOR',
    MAJOR: 'MAJOR',
    FOUNDATIONAL: 'FOUNDATIONAL',
    APOCRYPHAL: 'APOCRYPHAL',
};
exports.KnowledgeStates = {
    KNOWN: 'KNOWN',
    SUSPECTED: 'SUSPECTED',
    CONFIRMED: 'CONFIRMED',
    DISPROVEN: 'DISPROVEN',
    UNDISCOVERED: 'UNDISCOVERED',
};
exports.LoreSourceEntityTypes = {
    WIKI_PAGE: 'WIKI_PAGE',
    CALENDAR_EVENT: 'CALENDAR_EVENT',
    CHARACTER: 'CHARACTER',
    ARTIFACT: 'ARTIFACT',
    ORGANIZATION: 'ORGANIZATION',
    SESSION_NOTE: 'SESSION_NOTE',
    OTHER: 'OTHER',
};
exports.LoreRelationVisibilities = {
    PUBLIC: 'PUBLIC',
    PARTY: 'PARTY',
    GM_ONLY: 'GM_ONLY',
    SECRET: 'SECRET',
};
function isDateWithinRange(date, start, end) {
    const key = (0, chronologyTypes_js_1.dateSortKey)(date);
    if (start && (0, chronologyTypes_js_1.dateSortKey)(start) > key)
        return false;
    if (end && (0, chronologyTypes_js_1.dateSortKey)(end) < key)
        return false;
    return true;
}
function resolveHistoricalAliasesAtDate(aliases, date) {
    return aliases
        .filter((a) => isDateWithinRange(date, a.eraStart, a.eraEnd))
        .sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name));
}
function resolveFormerPrimaryChip(aliases, date, canonicalTitle) {
    const normalizedCanonical = canonicalTitle.trim().toLowerCase();
    const ended = aliases
        .filter((a) => {
        if (!a.isPrimaryInEra)
            return false;
        if (a.name.trim().toLowerCase() === normalizedCanonical)
            return false;
        if (a.eraEnd && (0, chronologyTypes_js_1.dateSortKey)(a.eraEnd) < (0, chronologyTypes_js_1.dateSortKey)(date))
            return true;
        if (!isDateWithinRange(date, a.eraStart, a.eraEnd))
            return true;
        return false;
    })
        .sort((a, b) => {
        const endA = a.eraEnd
            ? (0, chronologyTypes_js_1.dateSortKey)(a.eraEnd)
            : a.eraStart
                ? (0, chronologyTypes_js_1.dateSortKey)(a.eraStart)
                : 0;
        const endB = b.eraEnd
            ? (0, chronologyTypes_js_1.dateSortKey)(b.eraEnd)
            : b.eraStart
                ? (0, chronologyTypes_js_1.dateSortKey)(b.eraStart)
                : 0;
        return endB - endA;
    });
    return ended[0]?.name ?? null;
}
function buildEntityHistoricalNameProjection(canonicalTitle, aliases, date) {
    const inPeriod = resolveHistoricalAliasesAtDate(aliases, date);
    const eraCallout = inPeriod.length > 0
        ? inPeriod.map((a) => ({
            name: a.name,
            usageType: a.usageType,
            label: a.label,
        }))
        : null;
    return {
        canonicalTitle,
        formerChip: resolveFormerPrimaryChip(aliases, date, canonicalTitle),
        eraCallout,
    };
}
function formatAliasUsageTypeLabel(usageType) {
    switch (usageType) {
        case exports.AliasUsageTypes.OFFICIAL:
            return 'Official';
        case exports.AliasUsageTypes.COLLOQUIAL:
            return 'Colloquial';
        case exports.AliasUsageTypes.PEJORATIVE:
            return 'Pejorative';
        case exports.AliasUsageTypes.RELIGIOUS:
            return 'Religious';
        case exports.AliasUsageTypes.FOREIGN_LANGUAGE:
            return 'Foreign language';
        case exports.AliasUsageTypes.SECRET:
            return 'Secret';
        case exports.AliasUsageTypes.MYTHIC:
            return 'Mythic';
        default:
            return usageType;
    }
}
function formatLoreAccountKindLabel(kind) {
    switch (kind) {
        case exports.LoreAccountKinds.WIDELY_ACCEPTED:
            return 'Widely Accepted';
        case exports.LoreAccountKinds.REGIONAL_BELIEF:
            return 'Regional Belief';
        case exports.LoreAccountKinds.MYTHIC_TRADITION:
            return 'Mythic Tradition';
        case exports.LoreAccountKinds.SUPPRESSED:
            return 'Suppressed Record';
        case exports.LoreAccountKinds.PROPAGANDA:
            return 'Propaganda';
        case exports.LoreAccountKinds.UNVERIFIED:
            return 'Unverified';
        default:
            return kind;
    }
}
//# sourceMappingURL=loreKnowledge.js.map