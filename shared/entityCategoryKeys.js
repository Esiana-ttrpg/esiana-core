"use strict";
/**
 * Normalized entity category keys for metadata.entityCategory storage.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.ENTITY_CATEGORY_DISPLAY_BY_KEY = void 0;
exports.slugifyEntityCategoryRaw = slugifyEntityCategoryRaw;
exports.normalizeEntityCategoryKey = normalizeEntityCategoryKey;
exports.ENTITY_CATEGORY_DISPLAY_BY_KEY = {
    characters: 'Characters',
    bestiary: 'Bestiary',
    ancestries: 'Ancestries',
    organizations: 'Organizations',
    locations: 'Locations',
    languages: 'Languages',
    maps: 'Maps',
    objects: 'Objects',
    families: 'Families',
    'rules-resources': 'Rules/Resources',
    quests: 'Quests',
    journals: 'Journals',
    calendars: 'Calendars',
    timelines: 'Timelines',
    events: 'Events',
    bookmarks: 'Quick Access',
    relations: 'Relations',
    'recent-changes': 'Recent Changes',
};
const DISPLAY_TO_KEY = new Map(Object.entries(exports.ENTITY_CATEGORY_DISPLAY_BY_KEY).map(([key, label]) => [label, key]));
function slugifyEntityCategoryRaw(raw) {
    return raw
        .trim()
        .toLowerCase()
        .replace(/[\s/]+/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '');
}
function normalizeEntityCategoryKey(raw) {
    if (!raw || typeof raw !== 'string')
        return null;
    const trimmed = raw.trim();
    if (!trimmed)
        return null;
    const mapped = DISPLAY_TO_KEY.get(trimmed);
    if (mapped)
        return mapped;
    const slug = slugifyEntityCategoryRaw(trimmed);
    if (slug in exports.ENTITY_CATEGORY_DISPLAY_BY_KEY)
        return slug;
    return slug || null;
}
//# sourceMappingURL=entityCategoryKeys.js.map