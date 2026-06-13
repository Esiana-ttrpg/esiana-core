import {
  CampaignWorkspace,
  type CampaignWorkspace as CampaignWorkspaceType,
} from './campaignWorkspace.js';

export { CampaignWorkspace };
export type { CampaignWorkspaceType as CampaignWorkspaceValue };
import {
  isCategoryIndexPage,
  resolveWorkspaceForPage,
  SYSTEM_CATEGORY_NARRATIVE_THREADS,
  SYSTEM_CATEGORY_QUESTS,
  type WikiPageWorkspaceInput,
} from './wikiWorkspaceResolve.js';
import { asPublicPagePath, type PublicPagePath } from './publicPagePath.js';

export type { PublicPagePath };
export { asPublicPagePath };

export type WorkspaceKind = 'hub' | 'entity' | 'system';

export type WorkspaceIndexResolver =
  | { type: 'wikiTitle'; title: string }
  | { type: 'systemCategoryKey'; key: string }
  | { type: 'none' };

export interface CampaignWorkspaceRoute {
  workspace?: CampaignWorkspaceType;
  segment: string;
  kind: WorkspaceKind;
  title: string;
  sidebarId?: string;
  systemCategoryKey?: string;
  indexResolver: WorkspaceIndexResolver;
  hasEntityRoutes?: boolean;
}

const WORKSPACE_TO_SEGMENT: Record<CampaignWorkspaceType, string> = {
  [CampaignWorkspace.CHARACTERS]: 'characters',
  [CampaignWorkspace.BESTIARY]: 'bestiary',
  [CampaignWorkspace.ANCESTRIES]: 'ancestries',
  [CampaignWorkspace.ORGANIZATIONS]: 'organizations',
  [CampaignWorkspace.LOCATIONS]: 'locations',
  [CampaignWorkspace.OBJECTS]: 'objects',
  [CampaignWorkspace.FAMILIES]: 'families',
  [CampaignWorkspace.RULES_RESOURCES]: 'rules-resources',
  [CampaignWorkspace.ADVENTURES]: 'adventures',
  [CampaignWorkspace.THREADS]: 'threads',
  [CampaignWorkspace.HAVENS]: 'havens',
  [CampaignWorkspace.PROJECTS]: 'projects',
  [CampaignWorkspace.JOURNALS]: 'journals',
  [CampaignWorkspace.PAGES]: 'pages',
  [CampaignWorkspace.CUSTOM]: 'custom',
};

const SEGMENT_TO_WORKSPACE = new Map<string, CampaignWorkspaceType>(
  Object.entries(WORKSPACE_TO_SEGMENT).map(([workspace, segment]) => [
    segment,
    workspace as CampaignWorkspaceType,
  ]),
);

/** Reserved URL segments — not valid pathKeys. */
export const RESERVED_PATH_KEY_SEGMENTS = new Set([
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

export const CAMPAIGN_WORKSPACE_ROUTES: readonly CampaignWorkspaceRoute[] = [
  {
    workspace: CampaignWorkspace.CHARACTERS,
    segment: 'characters',
    kind: 'entity',
    title: 'Characters',
    sidebarId: 'characters',
    indexResolver: { type: 'wikiTitle', title: 'Characters' },
    hasEntityRoutes: true,
  },
  {
    workspace: CampaignWorkspace.BESTIARY,
    segment: 'bestiary',
    kind: 'entity',
    title: 'Bestiary',
    sidebarId: 'bestiary',
    indexResolver: { type: 'wikiTitle', title: 'Bestiary' },
    hasEntityRoutes: true,
  },
  {
    workspace: CampaignWorkspace.ANCESTRIES,
    segment: 'ancestries',
    kind: 'entity',
    title: 'Ancestries',
    sidebarId: 'ancestries',
    indexResolver: { type: 'wikiTitle', title: 'Ancestries' },
    hasEntityRoutes: true,
  },
  {
    workspace: CampaignWorkspace.ORGANIZATIONS,
    segment: 'organizations',
    kind: 'entity',
    title: 'Organizations',
    sidebarId: 'organizations',
    indexResolver: { type: 'wikiTitle', title: 'Organizations' },
    hasEntityRoutes: true,
  },
  {
    workspace: CampaignWorkspace.LOCATIONS,
    segment: 'locations',
    kind: 'entity',
    title: 'Locations',
    sidebarId: 'locations',
    indexResolver: { type: 'wikiTitle', title: 'Locations' },
    hasEntityRoutes: true,
  },
  {
    workspace: CampaignWorkspace.OBJECTS,
    segment: 'objects',
    kind: 'entity',
    title: 'Objects',
    sidebarId: 'objects',
    indexResolver: { type: 'wikiTitle', title: 'Objects' },
    hasEntityRoutes: true,
  },
  {
    workspace: CampaignWorkspace.FAMILIES,
    segment: 'families',
    kind: 'entity',
    title: 'Families',
    sidebarId: 'families',
    indexResolver: { type: 'wikiTitle', title: 'Families' },
    hasEntityRoutes: true,
  },
  {
    workspace: CampaignWorkspace.RULES_RESOURCES,
    segment: 'rules-resources',
    kind: 'entity',
    title: 'Rules/Resources',
    sidebarId: 'rules-resources',
    indexResolver: { type: 'wikiTitle', title: 'Rules/Resources' },
    hasEntityRoutes: true,
  },
  {
    workspace: CampaignWorkspace.ADVENTURES,
    segment: 'adventures',
    kind: 'hub',
    title: 'Adventure',
    sidebarId: 'quests',
    systemCategoryKey: SYSTEM_CATEGORY_QUESTS,
    indexResolver: { type: 'systemCategoryKey', key: SYSTEM_CATEGORY_QUESTS },
    hasEntityRoutes: true,
  },
  {
    workspace: CampaignWorkspace.THREADS,
    segment: 'threads',
    kind: 'hub',
    title: 'Narrative Threads',
    sidebarId: 'narrativeThreads',
    systemCategoryKey: SYSTEM_CATEGORY_NARRATIVE_THREADS,
    indexResolver: {
      type: 'systemCategoryKey',
      key: SYSTEM_CATEGORY_NARRATIVE_THREADS,
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
    workspace: CampaignWorkspace.HAVENS,
    segment: 'havens',
    kind: 'entity',
    title: 'Havens',
    indexResolver: { type: 'none' },
    hasEntityRoutes: true,
  },
  {
    workspace: CampaignWorkspace.PROJECTS,
    segment: 'projects',
    kind: 'entity',
    title: 'Projects',
    indexResolver: { type: 'none' },
    hasEntityRoutes: true,
  },
  {
    workspace: CampaignWorkspace.JOURNALS,
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
    workspace: CampaignWorkspace.PAGES,
    segment: 'pages',
    kind: 'entity',
    title: 'Pages',
    indexResolver: { type: 'none' },
    hasEntityRoutes: true,
  },
];

const ROUTE_BY_SEGMENT = new Map(
  CAMPAIGN_WORKSPACE_ROUTES.map((route) => [route.segment, route]),
);

const ROUTE_BY_WORKSPACE = new Map(
  CAMPAIGN_WORKSPACE_ROUTES.filter((r) => r.workspace).map((route) => [
    route.workspace!,
    route,
  ]),
);

export const WORKSPACE_INDEX_SEGMENTS = CAMPAIGN_WORKSPACE_ROUTES.filter(
  (r) => r.indexResolver.type !== 'none' || r.segment === 'pages',
).map((r) => r.segment);

export const WORKSPACE_ENTITY_SEGMENTS = CAMPAIGN_WORKSPACE_ROUTES.filter(
  (r) => r.hasEntityRoutes,
).map((r) => r.segment);

export function workspaceToSegment(
  workspace: CampaignWorkspaceType,
): string | null {
  return WORKSPACE_TO_SEGMENT[workspace] ?? null;
}

export function segmentToWorkspace(
  segment: string,
): CampaignWorkspaceType | null {
  return SEGMENT_TO_WORKSPACE.get(segment) ?? null;
}

export function resolveWorkspaceRoute(
  segment: string,
): CampaignWorkspaceRoute | null {
  return ROUTE_BY_SEGMENT.get(segment) ?? null;
}

export function resolveWorkspaceRouteByEnum(
  workspace: CampaignWorkspaceType,
): CampaignWorkspaceRoute | null {
  return ROUTE_BY_WORKSPACE.get(workspace) ?? null;
}

export function campaignPath(handle: string, ...segments: string[]): string {
  const suffix = segments.filter(Boolean).join('/');
  return suffix ? `/campaigns/${handle}/${suffix}` : `/campaigns/${handle}`;
}

export function campaignWorkspaceIndexPath(
  handle: string,
  segment: string,
): string {
  return campaignPath(handle, segment);
}

export function campaignWorkspaceEntityPath(
  handle: string,
  segment: string,
  pathKey: string,
): string {
  return campaignPath(handle, segment, pathKey);
}

export function campaignFreeformPagePath(
  handle: string,
  pathKey: string,
): string {
  return campaignPath(handle, 'pages', pathKey);
}

/** Wiki category folder title → workspace hub URL (Characters, Maps, Quests, …). */
const CATEGORY_FOLDER_SEGMENT_ALIASES: Record<string, string> = {
  Quests: 'adventures',
  Adventure: 'adventures',
  'Narrative Threads': 'threads',
  Threads: 'threads',
};

export function resolveWorkspaceIndexPathForFolderTitle(
  handle: string,
  title: string,
): PublicPagePath | null {
  const normalized = title.trim();
  if (!normalized) return null;

  const aliasSegment = CATEGORY_FOLDER_SEGMENT_ALIASES[normalized];
  if (aliasSegment) {
    return asPublicPagePath(campaignWorkspaceIndexPath(handle, aliasSegment));
  }

  for (const route of CAMPAIGN_WORKSPACE_ROUTES) {
    if (route.title === normalized) {
      return asPublicPagePath(campaignWorkspaceIndexPath(handle, route.segment));
    }
    if (
      route.indexResolver.type === 'wikiTitle' &&
      route.indexResolver.title === normalized
    ) {
      return asPublicPagePath(campaignWorkspaceIndexPath(handle, route.segment));
    }
  }

  return null;
}

export function resolveCanonicalPagePath(
  handle: string,
  page: WikiPageWorkspaceInput & {
    workspace?: CampaignWorkspaceType | string | null;
    pathKey?: string | null;
  },
  flatPages: readonly WikiPageWorkspaceInput[],
): PublicPagePath {
  if (/^event-[a-zA-Z0-9_-]+$/.test(page.id)) {
    return asPublicPagePath(campaignPath(handle, page.id));
  }

  if (isCategoryIndexPage(page.title)) {
    const indexPath = resolveWorkspaceIndexPathForFolderTitle(handle, page.title);
    if (indexPath) return indexPath;
  }

  const workspace =
    (page.workspace as CampaignWorkspaceType | null | undefined) ??
    resolveWorkspaceForPage(page, flatPages);
  const pathSegment = page.pathKey ?? page.id;

  if (!workspace || !pathSegment) {
    return asPublicPagePath(campaignPath(handle, page.id));
  }

  const segment = workspaceToSegment(workspace);
  if (!segment) return asPublicPagePath(campaignPath(handle, page.id));
  return asPublicPagePath(campaignWorkspaceEntityPath(handle, segment, pathSegment));
}

export { isCategoryIndexPage, resolveWorkspaceForPage };
