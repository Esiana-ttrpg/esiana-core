"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.resolveWorkspaceForPage = exports.isCategoryIndexPage = exports.WORKSPACE_ENTITY_SEGMENTS = exports.WORKSPACE_INDEX_SEGMENTS = exports.CAMPAIGN_WORKSPACE_ROUTES = exports.RESERVED_PATH_KEY_SEGMENTS = exports.asPublicPagePath = exports.CampaignWorkspace = void 0;
exports.workspaceToSegment = workspaceToSegment;
exports.segmentToWorkspace = segmentToWorkspace;
exports.resolveWorkspaceRoute = resolveWorkspaceRoute;
exports.resolveWorkspaceRouteByEnum = resolveWorkspaceRouteByEnum;
exports.campaignPath = campaignPath;
exports.campaignWorkspaceIndexPath = campaignWorkspaceIndexPath;
exports.campaignWorkspaceEntityPath = campaignWorkspaceEntityPath;
exports.campaignFreeformPagePath = campaignFreeformPagePath;
exports.resolveWorkspaceIndexPathForFolderTitle = resolveWorkspaceIndexPathForFolderTitle;
exports.resolveCanonicalPagePath = resolveCanonicalPagePath;
const campaignWorkspace_js_1 = require("./campaignWorkspace.js");
Object.defineProperty(exports, "CampaignWorkspace", { enumerable: true, get: function () { return campaignWorkspace_js_1.CampaignWorkspace; } });
const wikiWorkspaceResolve_js_1 = require("./wikiWorkspaceResolve.js");
Object.defineProperty(exports, "isCategoryIndexPage", { enumerable: true, get: function () { return wikiWorkspaceResolve_js_1.isCategoryIndexPage; } });
Object.defineProperty(exports, "resolveWorkspaceForPage", { enumerable: true, get: function () { return wikiWorkspaceResolve_js_1.resolveWorkspaceForPage; } });
const publicPagePath_js_1 = require("./publicPagePath.js");
Object.defineProperty(exports, "asPublicPagePath", { enumerable: true, get: function () { return publicPagePath_js_1.asPublicPagePath; } });
const WORKSPACE_TO_SEGMENT = {
    [campaignWorkspace_js_1.CampaignWorkspace.CHARACTERS]: 'characters',
    [campaignWorkspace_js_1.CampaignWorkspace.BESTIARY]: 'bestiary',
    [campaignWorkspace_js_1.CampaignWorkspace.ANCESTRIES]: 'ancestries',
    [campaignWorkspace_js_1.CampaignWorkspace.ORGANIZATIONS]: 'organizations',
    [campaignWorkspace_js_1.CampaignWorkspace.LOCATIONS]: 'locations',
    [campaignWorkspace_js_1.CampaignWorkspace.OBJECTS]: 'objects',
    [campaignWorkspace_js_1.CampaignWorkspace.FAMILIES]: 'families',
    [campaignWorkspace_js_1.CampaignWorkspace.RULES_RESOURCES]: 'rules-resources',
    [campaignWorkspace_js_1.CampaignWorkspace.ADVENTURES]: 'adventures',
    [campaignWorkspace_js_1.CampaignWorkspace.THREADS]: 'threads',
    [campaignWorkspace_js_1.CampaignWorkspace.HAVENS]: 'havens',
    [campaignWorkspace_js_1.CampaignWorkspace.PROJECTS]: 'projects',
    [campaignWorkspace_js_1.CampaignWorkspace.JOURNALS]: 'journals',
    [campaignWorkspace_js_1.CampaignWorkspace.PAGES]: 'pages',
    [campaignWorkspace_js_1.CampaignWorkspace.CUSTOM]: 'custom',
};
const SEGMENT_TO_WORKSPACE = new Map(Object.entries(WORKSPACE_TO_SEGMENT).map(([workspace, segment]) => [
    segment,
    workspace,
]));
/** Reserved URL segments — not valid pathKeys. */
exports.RESERVED_PATH_KEY_SEGMENTS = new Set([
    ...Object.values(WORKSPACE_TO_SEGMENT),
    'dashboard',
    'settings',
    'party',
    'chronology',
    'progression',
    'relations',
    'maps',
    'downtime',
    'tags',
    'wiki',
    'notes',
    'admin',
    'recruitment',
    'notifications',
    'guides',
    'users',
    'visual-atlas',
    'time-tracking',
    'world-advance',
    'recent-changes',
    'session-notes',
    'transfer-ownership',
    'narrative',
]);
exports.CAMPAIGN_WORKSPACE_ROUTES = [
    {
        workspace: campaignWorkspace_js_1.CampaignWorkspace.CHARACTERS,
        segment: 'characters',
        kind: 'entity',
        title: 'Characters',
        sidebarId: 'characters',
        indexResolver: { type: 'wikiTitle', title: 'Characters' },
        hasEntityRoutes: true,
    },
    {
        workspace: campaignWorkspace_js_1.CampaignWorkspace.BESTIARY,
        segment: 'bestiary',
        kind: 'entity',
        title: 'Bestiary',
        sidebarId: 'bestiary',
        indexResolver: { type: 'wikiTitle', title: 'Bestiary' },
        hasEntityRoutes: true,
    },
    {
        workspace: campaignWorkspace_js_1.CampaignWorkspace.ANCESTRIES,
        segment: 'ancestries',
        kind: 'entity',
        title: 'Ancestries',
        sidebarId: 'ancestries',
        indexResolver: { type: 'wikiTitle', title: 'Ancestries' },
        hasEntityRoutes: true,
    },
    {
        workspace: campaignWorkspace_js_1.CampaignWorkspace.ORGANIZATIONS,
        segment: 'organizations',
        kind: 'entity',
        title: 'Organizations',
        sidebarId: 'organizations',
        indexResolver: { type: 'wikiTitle', title: 'Organizations' },
        hasEntityRoutes: true,
    },
    {
        workspace: campaignWorkspace_js_1.CampaignWorkspace.LOCATIONS,
        segment: 'locations',
        kind: 'entity',
        title: 'Locations',
        sidebarId: 'locations',
        indexResolver: { type: 'wikiTitle', title: 'Locations' },
        hasEntityRoutes: true,
    },
    {
        workspace: campaignWorkspace_js_1.CampaignWorkspace.OBJECTS,
        segment: 'objects',
        kind: 'entity',
        title: 'Objects',
        sidebarId: 'objects',
        indexResolver: { type: 'wikiTitle', title: 'Objects' },
        hasEntityRoutes: true,
    },
    {
        workspace: campaignWorkspace_js_1.CampaignWorkspace.FAMILIES,
        segment: 'families',
        kind: 'entity',
        title: 'Families',
        sidebarId: 'families',
        indexResolver: { type: 'wikiTitle', title: 'Families' },
        hasEntityRoutes: true,
    },
    {
        workspace: campaignWorkspace_js_1.CampaignWorkspace.RULES_RESOURCES,
        segment: 'rules-resources',
        kind: 'entity',
        title: 'Rules/Resources',
        sidebarId: 'rules-resources',
        indexResolver: { type: 'wikiTitle', title: 'Rules/Resources' },
        hasEntityRoutes: true,
    },
    {
        workspace: campaignWorkspace_js_1.CampaignWorkspace.ADVENTURES,
        segment: 'adventures',
        kind: 'hub',
        title: 'Adventure',
        sidebarId: 'quests',
        systemCategoryKey: wikiWorkspaceResolve_js_1.SYSTEM_CATEGORY_QUESTS,
        indexResolver: { type: 'systemCategoryKey', key: wikiWorkspaceResolve_js_1.SYSTEM_CATEGORY_QUESTS },
        hasEntityRoutes: true,
    },
    {
        workspace: campaignWorkspace_js_1.CampaignWorkspace.THREADS,
        segment: 'threads',
        kind: 'hub',
        title: 'Narrative Threads',
        sidebarId: 'narrativeThreads',
        systemCategoryKey: wikiWorkspaceResolve_js_1.SYSTEM_CATEGORY_NARRATIVE_THREADS,
        indexResolver: {
            type: 'systemCategoryKey',
            key: wikiWorkspaceResolve_js_1.SYSTEM_CATEGORY_NARRATIVE_THREADS,
        },
        hasEntityRoutes: true,
    },
    {
        segment: 'downtime',
        kind: 'hub',
        title: 'Downtime',
        sidebarId: 'downtime',
        systemCategoryKey: 'downtime',
        indexResolver: { type: 'systemCategoryKey', key: 'downtime' },
        hasEntityRoutes: false,
    },
    {
        workspace: campaignWorkspace_js_1.CampaignWorkspace.HAVENS,
        segment: 'havens',
        kind: 'entity',
        title: 'Havens',
        indexResolver: { type: 'none' },
        hasEntityRoutes: true,
    },
    {
        workspace: campaignWorkspace_js_1.CampaignWorkspace.PROJECTS,
        segment: 'projects',
        kind: 'entity',
        title: 'Projects',
        indexResolver: { type: 'none' },
        hasEntityRoutes: true,
    },
    {
        workspace: campaignWorkspace_js_1.CampaignWorkspace.JOURNALS,
        segment: 'journals',
        kind: 'entity',
        title: 'Journals',
        sidebarId: 'journals',
        indexResolver: { type: 'wikiTitle', title: 'Journals' },
        hasEntityRoutes: true,
    },
    {
        segment: 'tags',
        kind: 'hub',
        title: 'Tags',
        sidebarId: 'tags',
        indexResolver: { type: 'wikiTitle', title: 'Tags' },
        hasEntityRoutes: false,
    },
    {
        segment: 'maps',
        kind: 'hub',
        title: 'Maps',
        sidebarId: 'maps',
        indexResolver: { type: 'wikiTitle', title: 'Maps' },
        hasEntityRoutes: false,
    },
    {
        workspace: campaignWorkspace_js_1.CampaignWorkspace.PAGES,
        segment: 'pages',
        kind: 'entity',
        title: 'Pages',
        indexResolver: { type: 'none' },
        hasEntityRoutes: true,
    },
];
const ROUTE_BY_SEGMENT = new Map(exports.CAMPAIGN_WORKSPACE_ROUTES.map((route) => [route.segment, route]));
const ROUTE_BY_WORKSPACE = new Map(exports.CAMPAIGN_WORKSPACE_ROUTES.filter((r) => r.workspace).map((route) => [
    route.workspace,
    route,
]));
exports.WORKSPACE_INDEX_SEGMENTS = exports.CAMPAIGN_WORKSPACE_ROUTES.filter((r) => r.indexResolver.type !== 'none' || r.segment === 'pages').map((r) => r.segment);
exports.WORKSPACE_ENTITY_SEGMENTS = exports.CAMPAIGN_WORKSPACE_ROUTES.filter((r) => r.hasEntityRoutes).map((r) => r.segment);
function workspaceToSegment(workspace) {
    return WORKSPACE_TO_SEGMENT[workspace] ?? null;
}
function segmentToWorkspace(segment) {
    return SEGMENT_TO_WORKSPACE.get(segment) ?? null;
}
function resolveWorkspaceRoute(segment) {
    return ROUTE_BY_SEGMENT.get(segment) ?? null;
}
function resolveWorkspaceRouteByEnum(workspace) {
    return ROUTE_BY_WORKSPACE.get(workspace) ?? null;
}
function campaignPath(handle, ...segments) {
    const suffix = segments.filter(Boolean).join('/');
    return suffix ? `/campaigns/${handle}/${suffix}` : `/campaigns/${handle}`;
}
function campaignWorkspaceIndexPath(handle, segment) {
    return campaignPath(handle, segment);
}
function campaignWorkspaceEntityPath(handle, segment, pathKey) {
    return campaignPath(handle, segment, pathKey);
}
function campaignFreeformPagePath(handle, pathKey) {
    return campaignPath(handle, 'pages', pathKey);
}
/** Wiki category folder title → workspace hub URL (Characters, Maps, Quests, …). */
const CATEGORY_FOLDER_SEGMENT_ALIASES = {
    Quests: 'adventures',
    Adventure: 'adventures',
    'Narrative Threads': 'threads',
    Threads: 'threads',
};
function resolveWorkspaceIndexPathForFolderTitle(handle, title) {
    const normalized = title.trim();
    if (!normalized)
        return null;
    const aliasSegment = CATEGORY_FOLDER_SEGMENT_ALIASES[normalized];
    if (aliasSegment) {
        return (0, publicPagePath_js_1.asPublicPagePath)(campaignWorkspaceIndexPath(handle, aliasSegment));
    }
    for (const route of exports.CAMPAIGN_WORKSPACE_ROUTES) {
        if (route.title === normalized) {
            return (0, publicPagePath_js_1.asPublicPagePath)(campaignWorkspaceIndexPath(handle, route.segment));
        }
        if (route.indexResolver.type === 'wikiTitle' &&
            route.indexResolver.title === normalized) {
            return (0, publicPagePath_js_1.asPublicPagePath)(campaignWorkspaceIndexPath(handle, route.segment));
        }
    }
    return null;
}
function resolveCanonicalPagePath(handle, page, flatPages) {
    if (/^event-[a-zA-Z0-9_-]+$/.test(page.id)) {
        return (0, publicPagePath_js_1.asPublicPagePath)(campaignPath(handle, page.id));
    }
    if ((0, wikiWorkspaceResolve_js_1.isCategoryIndexPage)(page.title)) {
        const indexPath = resolveWorkspaceIndexPathForFolderTitle(handle, page.title);
        if (indexPath)
            return indexPath;
    }
    const workspace = page.workspace ??
        (0, wikiWorkspaceResolve_js_1.resolveWorkspaceForPage)(page, flatPages);
    const pathSegment = page.pathKey ?? page.id;
    if (!workspace || !pathSegment) {
        return (0, publicPagePath_js_1.asPublicPagePath)(campaignPath(handle, 'dashboard'));
    }
    const segment = workspaceToSegment(workspace);
    if (!segment)
        return (0, publicPagePath_js_1.asPublicPagePath)(campaignPath(handle, 'dashboard'));
    return (0, publicPagePath_js_1.asPublicPagePath)(campaignWorkspaceEntityPath(handle, segment, pathSegment));
}
//# sourceMappingURL=campaignWorkspaceRoutes.js.map