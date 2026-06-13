"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CATEGORY_INDEX_TITLES = exports.SYSTEM_CATEGORY_NARRATIVE_THREADS = exports.SYSTEM_CATEGORY_QUESTS = exports.WIKI_SYSTEM_CATEGORY_KEY = void 0;
exports.isCategoryIndexPage = isCategoryIndexPage;
exports.isRoutableWikiPage = isRoutableWikiPage;
exports.resolveWorkspaceForPage = resolveWorkspaceForPage;
const campaignWorkspace_js_1 = require("./campaignWorkspace.js");
const entityCategoryKeys_js_1 = require("./entityCategoryKeys.js");
const havenMetadata_js_1 = require("./havenMetadata.js");
const projectMetadata_js_1 = require("./projectMetadata.js");
exports.WIKI_SYSTEM_CATEGORY_KEY = 'systemCategoryKey';
exports.SYSTEM_CATEGORY_QUESTS = 'quests';
exports.SYSTEM_CATEGORY_NARRATIVE_THREADS = 'narrative_threads';
/** Folder titles that are index hubs — not routable entity URLs. */
exports.CATEGORY_INDEX_TITLES = new Set([
    'Characters',
    'Bestiary',
    'Ancestries',
    'Organizations',
    'Locations',
    'Maps',
    'Objects',
    'Families',
    'Rules/Resources',
    'Quests',
    'Adventure',
    'Narrative Threads',
    'Threads',
    'Journals',
    'Calendars',
    'Timelines',
    'Events',
    'Quick Access',
    'Bookmarks',
    'Tags',
    'Relations',
    'Recent Changes',
    'Recent changes',
    'World',
    'Game',
    'Downtime',
    'Havens',
    'Projects',
]);
function parseSystemCategoryKey(metadata) {
    if (!metadata || typeof metadata !== 'object')
        return null;
    const raw = metadata[exports.WIKI_SYSTEM_CATEGORY_KEY];
    return typeof raw === 'string' && raw.trim() ? raw.trim() : null;
}
function isPageUnderSystemCategory(pageId, flatPages, systemKey) {
    const pageById = new Map(flatPages.map((p) => [p.id, p]));
    let current = pageById.get(pageId)?.parentId ?? null;
    const visited = new Set();
    while (current) {
        if (visited.has(current))
            break;
        visited.add(current);
        const node = pageById.get(current);
        if (!node)
            break;
        if (parseSystemCategoryKey(node.metadata) === systemKey)
            return true;
        current = node.parentId;
    }
    return false;
}
function isPageUnderCategoryTitle(pageId, flatPages, categoryTitle) {
    const pageById = new Map(flatPages.map((p) => [p.id, p]));
    let current = pageById.get(pageId)?.parentId ?? null;
    const visited = new Set();
    while (current) {
        if (visited.has(current))
            break;
        visited.add(current);
        const node = pageById.get(current);
        if (!node)
            break;
        if (node.title === categoryTitle)
            return true;
        current = node.parentId;
    }
    return false;
}
function readEntityCategory(metadata) {
    if (!metadata || typeof metadata !== 'object')
        return null;
    const raw = metadata.entityCategory;
    return (0, entityCategoryKeys_js_1.normalizeEntityCategoryKey)(typeof raw === 'string' ? raw : null);
}
const ENTITY_CATEGORY_TO_WORKSPACE = {
    characters: campaignWorkspace_js_1.CampaignWorkspace.CHARACTERS,
    bestiary: campaignWorkspace_js_1.CampaignWorkspace.BESTIARY,
    ancestries: campaignWorkspace_js_1.CampaignWorkspace.ANCESTRIES,
    organizations: campaignWorkspace_js_1.CampaignWorkspace.ORGANIZATIONS,
    locations: campaignWorkspace_js_1.CampaignWorkspace.LOCATIONS,
    objects: campaignWorkspace_js_1.CampaignWorkspace.OBJECTS,
    families: campaignWorkspace_js_1.CampaignWorkspace.FAMILIES,
    'rules-resources': campaignWorkspace_js_1.CampaignWorkspace.RULES_RESOURCES,
    journals: campaignWorkspace_js_1.CampaignWorkspace.JOURNALS,
};
const CATEGORY_TITLE_TO_WORKSPACE = {
    Characters: campaignWorkspace_js_1.CampaignWorkspace.CHARACTERS,
    Bestiary: campaignWorkspace_js_1.CampaignWorkspace.BESTIARY,
    Ancestries: campaignWorkspace_js_1.CampaignWorkspace.ANCESTRIES,
    Organizations: campaignWorkspace_js_1.CampaignWorkspace.ORGANIZATIONS,
    Locations: campaignWorkspace_js_1.CampaignWorkspace.LOCATIONS,
    Objects: campaignWorkspace_js_1.CampaignWorkspace.OBJECTS,
    Families: campaignWorkspace_js_1.CampaignWorkspace.FAMILIES,
    'Rules/Resources': campaignWorkspace_js_1.CampaignWorkspace.RULES_RESOURCES,
    Journals: campaignWorkspace_js_1.CampaignWorkspace.JOURNALS,
};
function isCategoryIndexPage(title) {
    if (!title)
        return false;
    return exports.CATEGORY_INDEX_TITLES.has(title.trim());
}
/** Whether a page should have workspace+pathKey (routable in public URLs). */
function isRoutableWikiPage(page) {
    if (/^event-[a-zA-Z0-9_-]+$/.test(page.id))
        return false;
    if (exports.CATEGORY_INDEX_TITLES.has(page.title.trim()))
        return false;
    if (page.templateType === 'SESSION_NOTE')
        return false;
    const systemKey = parseSystemCategoryKey(page.metadata);
    if (systemKey === 'party' ||
        systemKey === 'downtime' ||
        systemKey === exports.SYSTEM_CATEGORY_QUESTS ||
        systemKey === exports.SYSTEM_CATEGORY_NARRATIVE_THREADS) {
        return false;
    }
    return true;
}
/**
 * Resolve stored workspace for a wiki page.
 * Returns null for category folders and non-routable infrastructure pages.
 */
function resolveWorkspaceForPage(page, flatPages) {
    if (!isRoutableWikiPage(page))
        return null;
    if (page.templateType === havenMetadata_js_1.DOWNTIME_HAVEN_TEMPLATE_TYPE) {
        return campaignWorkspace_js_1.CampaignWorkspace.HAVENS;
    }
    if (page.templateType === projectMetadata_js_1.DOWNTIME_PROJECT_TEMPLATE_TYPE) {
        return campaignWorkspace_js_1.CampaignWorkspace.PROJECTS;
    }
    if (page.templateType === 'CHARACTER') {
        return campaignWorkspace_js_1.CampaignWorkspace.CHARACTERS;
    }
    if (page.templateType === 'ORGANIZATION') {
        return campaignWorkspace_js_1.CampaignWorkspace.ORGANIZATIONS;
    }
    if (page.templateType === 'FAMILY') {
        return campaignWorkspace_js_1.CampaignWorkspace.FAMILIES;
    }
    if (page.templateType === 'LOCATION') {
        return campaignWorkspace_js_1.CampaignWorkspace.LOCATIONS;
    }
    if (isPageUnderSystemCategory(page.id, flatPages, exports.SYSTEM_CATEGORY_NARRATIVE_THREADS)) {
        return campaignWorkspace_js_1.CampaignWorkspace.THREADS;
    }
    if (isPageUnderSystemCategory(page.id, flatPages, exports.SYSTEM_CATEGORY_QUESTS)) {
        return campaignWorkspace_js_1.CampaignWorkspace.ADVENTURES;
    }
    if (isPageUnderCategoryTitle(page.id, flatPages, 'Adventure')) {
        return campaignWorkspace_js_1.CampaignWorkspace.ADVENTURES;
    }
    if (isPageUnderCategoryTitle(page.id, flatPages, 'Quests')) {
        return campaignWorkspace_js_1.CampaignWorkspace.ADVENTURES;
    }
    if (isPageUnderCategoryTitle(page.id, flatPages, 'Narrative Threads')) {
        return campaignWorkspace_js_1.CampaignWorkspace.THREADS;
    }
    if (isPageUnderCategoryTitle(page.id, flatPages, 'Threads')) {
        return campaignWorkspace_js_1.CampaignWorkspace.THREADS;
    }
    const entityCategory = readEntityCategory(page.metadata);
    if (entityCategory && ENTITY_CATEGORY_TO_WORKSPACE[entityCategory]) {
        return ENTITY_CATEGORY_TO_WORKSPACE[entityCategory];
    }
    for (const [title, workspace] of Object.entries(CATEGORY_TITLE_TO_WORKSPACE)) {
        if (isPageUnderCategoryTitle(page.id, flatPages, title)) {
            return workspace;
        }
    }
    return campaignWorkspace_js_1.CampaignWorkspace.PAGES;
}
//# sourceMappingURL=wikiWorkspaceResolve.js.map