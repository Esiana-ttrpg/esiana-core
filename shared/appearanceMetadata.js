"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.EMPTY_APPEARANCE_DETAILS = exports.APPEARANCE_PRESENTATION_TYPE_LABELS = exports.APPEARANCE_PRESENTATION_TYPES = void 0;
exports.normalizePresentationType = normalizePresentationType;
exports.normalizeAppearanceGallery = normalizeAppearanceGallery;
exports.normalizeAppearanceDetailsFromAppearance = normalizeAppearanceDetailsFromAppearance;
exports.appearanceDetailsToMetadataPatch = appearanceDetailsToMetadataPatch;
exports.resolvePrimaryGalleryEntry = resolvePrimaryGalleryEntry;
exports.synthesizeLegacyGalleryEntry = synthesizeLegacyGalleryEntry;
exports.resolveGalleryEntriesWithLegacy = resolveGalleryEntriesWithLegacy;
exports.hasAppearanceDetailsContent = hasAppearanceDetailsContent;
exports.hasAppearanceGalleryContent = hasAppearanceGalleryContent;
exports.enforceSinglePrimaryInEditor = enforceSinglePrimaryInEditor;
exports.formatAppearanceDetailsSummary = formatAppearanceDetailsSummary;
const imageCredit_js_1 = require("./imageCredit.js");
exports.APPEARANCE_PRESENTATION_TYPES = [
    'default',
    'transformation',
    'disguise',
    'historical',
    'ceremonial',
    'public',
    'private',
    'corrupted',
];
exports.APPEARANCE_PRESENTATION_TYPE_LABELS = {
    default: 'Default',
    transformation: 'Transformation',
    disguise: 'Disguise',
    historical: 'Historical',
    ceremonial: 'Ceremonial',
    public: 'Public',
    private: 'Private',
    corrupted: 'Corrupted',
};
function trimText(raw) {
    if (typeof raw !== 'string')
        return null;
    const trimmed = raw.trim();
    return trimmed.length > 0 ? trimmed : null;
}
function normalizeStringArray(raw) {
    if (!Array.isArray(raw))
        return [];
    return raw
        .map((item) => (typeof item === 'string' ? item.trim() : ''))
        .filter((item) => item.length > 0);
}
function normalizePresentationType(raw) {
    if (typeof raw !== 'string')
        return undefined;
    const value = raw.trim();
    return exports.APPEARANCE_PRESENTATION_TYPES.includes(value)
        ? value
        : undefined;
}
function normalizeImageUrl(raw) {
    return typeof raw === 'string' ? raw.trim() : '';
}
function normalizeGalleryEntry(raw) {
    if (!raw || typeof raw !== 'object' || Array.isArray(raw))
        return null;
    const obj = raw;
    const id = trimText(obj.id);
    const label = trimText(obj.label);
    if (!id || !label)
        return null;
    return {
        id,
        label,
        imageUrl: normalizeImageUrl(obj.imageUrl),
        imageCredit: (0, imageCredit_js_1.normalizeImageCredit)(obj.imageCredit),
        tags: normalizeStringArray(obj.tags),
        presentationType: normalizePresentationType(obj.presentationType),
        isPrimary: obj.isPrimary === true ? true : undefined,
        timelinePin: trimText(obj.timelinePin),
        presentationNotes: trimText(obj.presentationNotes) ?? trimText(obj.notes),
    };
}
function normalizeAppearanceGallery(raw) {
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
        return { entries: [] };
    }
    const obj = raw;
    const entriesRaw = obj.entries;
    if (!Array.isArray(entriesRaw))
        return { entries: [] };
    const entries = entriesRaw
        .map(normalizeGalleryEntry)
        .filter((entry) => entry !== null);
    return { entries };
}
exports.EMPTY_APPEARANCE_DETAILS = {
    build: null,
    voice: null,
    distinguishingFeatures: [],
    clothingMotifs: null,
    visibleInjuries: [],
    vibeImpression: null,
    atAGlance: null,
};
function normalizeAppearanceDetailsFromAppearance(raw) {
    return {
        build: trimText(raw.build),
        voice: trimText(raw.voice),
        distinguishingFeatures: normalizeStringArray(raw.distinguishingFeatures),
        clothingMotifs: trimText(raw.clothingMotifs) ?? trimText(raw.apparelDescription),
        visibleInjuries: normalizeStringArray(raw.visibleInjuries),
        vibeImpression: trimText(raw.vibeImpression),
        atAGlance: trimText(raw.atAGlance),
    };
}
function appearanceDetailsToMetadataPatch(details) {
    const patch = {};
    if ('build' in details)
        patch.build = details.build;
    if ('voice' in details)
        patch.voice = details.voice;
    if ('distinguishingFeatures' in details) {
        patch.distinguishingFeatures = details.distinguishingFeatures;
    }
    if ('clothingMotifs' in details) {
        patch.apparelDescription = details.clothingMotifs;
    }
    if ('visibleInjuries' in details)
        patch.visibleInjuries = details.visibleInjuries;
    if ('vibeImpression' in details)
        patch.vibeImpression = details.vibeImpression;
    if ('atAGlance' in details)
        patch.atAGlance = details.atAGlance;
    return patch;
}
/**
 * Resolves the primary gallery entry. Schema allows multiple isPrimary flags;
 * P3 editor enforces radio UX on save. Projection picks deterministically:
 * context.presentationType match → first isPrimary → first entry → null.
 */
function resolvePrimaryGalleryEntry(entries, context) {
    if (entries.length === 0)
        return null;
    if (context?.presentationType) {
        const typedPrimary = entries.find((e) => e.presentationType === context.presentationType &&
            (e.isPrimary === true || context.presentationType !== 'default'));
        if (typedPrimary)
            return typedPrimary;
        const typed = entries.find((e) => e.presentationType === context.presentationType);
        if (typed)
            return typed;
    }
    const primary = entries.find((e) => e.isPrimary === true);
    if (primary)
        return primary;
    return entries[0] ?? null;
}
function synthesizeLegacyGalleryEntry(portraitUrl, portraitCredit, label = 'Current') {
    return {
        id: '__legacy_portrait__',
        label,
        imageUrl: portraitUrl,
        imageCredit: portraitCredit,
        tags: [],
        presentationType: 'default',
        isPrimary: true,
        timelinePin: null,
        presentationNotes: null,
    };
}
function resolveGalleryEntriesWithLegacy(gallery, legacyPortraitUrl, legacyPortraitCredit) {
    if (gallery.entries.length > 0)
        return gallery.entries;
    if (legacyPortraitUrl) {
        return [synthesizeLegacyGalleryEntry(legacyPortraitUrl, legacyPortraitCredit)];
    }
    return [];
}
function hasAppearanceDetailsContent(details) {
    return Boolean(details.build ||
        details.voice ||
        details.clothingMotifs ||
        details.vibeImpression ||
        details.atAGlance ||
        details.distinguishingFeatures.length > 0 ||
        details.visibleInjuries.length > 0);
}
function hasAppearanceGalleryContent(gallery, legacyPortraitUrl) {
    if (gallery.entries.length > 0)
        return true;
    return Boolean(legacyPortraitUrl?.trim());
}
/** Editor UX: ensure exactly one isPrimary when user selects via radio. */
function enforceSinglePrimaryInEditor(entries, selectedId) {
    return entries.map((entry) => ({
        ...entry,
        isPrimary: entry.id === selectedId ? true : undefined,
    }));
}
function formatAppearanceDetailsSummary(details) {
    const parts = [];
    if (details.atAGlance)
        parts.push(details.atAGlance);
    if (details.build)
        parts.push(`Build: ${details.build}`);
    if (details.voice)
        parts.push(`Voice: ${details.voice}`);
    if (details.vibeImpression)
        parts.push(`Impression: ${details.vibeImpression}`);
    if (details.clothingMotifs)
        parts.push(`Clothing: ${details.clothingMotifs}`);
    if (details.distinguishingFeatures.length > 0) {
        parts.push(`Features: ${details.distinguishingFeatures.join('; ')}`);
    }
    if (details.visibleInjuries.length > 0) {
        parts.push(`Injuries: ${details.visibleInjuries.join('; ')}`);
    }
    return parts.join('\n');
}
//# sourceMappingURL=appearanceMetadata.js.map