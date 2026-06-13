import { CampaignWorkspace, type CampaignWorkspace as CampaignWorkspaceType } from './campaignWorkspace.js';
import { normalizeEntityCategoryKey } from './entityCategoryKeys.js';
import { DOWNTIME_HAVEN_TEMPLATE_TYPE } from './havenMetadata.js';
import { DOWNTIME_PROJECT_TEMPLATE_TYPE } from './projectMetadata.js';

export const WIKI_SYSTEM_CATEGORY_KEY = 'systemCategoryKey';
export const SYSTEM_CATEGORY_QUESTS = 'quests';
export const SYSTEM_CATEGORY_NARRATIVE_THREADS = 'narrative_threads';

/** Folder titles that are index hubs — not routable entity URLs. */
export const CATEGORY_INDEX_TITLES = new Set([
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

export type WikiPageWorkspaceInput = {
  id: string;
  title: string;
  parentId: string | null;
  templateType: string;
  metadata?: unknown;
};

function parseSystemCategoryKey(metadata: unknown): string | null {
  if (!metadata || typeof metadata !== 'object') return null;
  const raw = (metadata as Record<string, unknown>)[WIKI_SYSTEM_CATEGORY_KEY];
  return typeof raw === 'string' && raw.trim() ? raw.trim() : null;
}

function isPageUnderSystemCategory(
  pageId: string,
  flatPages: readonly WikiPageWorkspaceInput[],
  systemKey: string,
): boolean {
  const pageById = new Map(flatPages.map((p) => [p.id, p]));
  let current = pageById.get(pageId)?.parentId ?? null;
  const visited = new Set<string>();
  while (current) {
    if (visited.has(current)) break;
    visited.add(current);
    const node = pageById.get(current);
    if (!node) break;
    if (parseSystemCategoryKey(node.metadata) === systemKey) return true;
    current = node.parentId;
  }
  return false;
}

function isPageUnderCategoryTitle(
  pageId: string,
  flatPages: readonly WikiPageWorkspaceInput[],
  categoryTitle: string,
): boolean {
  const pageById = new Map(flatPages.map((p) => [p.id, p]));
  let current = pageById.get(pageId)?.parentId ?? null;
  const visited = new Set<string>();
  while (current) {
    if (visited.has(current)) break;
    visited.add(current);
    const node = pageById.get(current);
    if (!node) break;
    if (node.title === categoryTitle) return true;
    current = node.parentId;
  }
  return false;
}

function readEntityCategory(metadata: unknown): string | null {
  if (!metadata || typeof metadata !== 'object') return null;
  const raw = (metadata as Record<string, unknown>).entityCategory;
  return normalizeEntityCategoryKey(
    typeof raw === 'string' ? raw : null,
  );
}

const ENTITY_CATEGORY_TO_WORKSPACE: Record<string, CampaignWorkspaceType> = {
  characters: CampaignWorkspace.CHARACTERS,
  bestiary: CampaignWorkspace.BESTIARY,
  ancestries: CampaignWorkspace.ANCESTRIES,
  organizations: CampaignWorkspace.ORGANIZATIONS,
  locations: CampaignWorkspace.LOCATIONS,
  objects: CampaignWorkspace.OBJECTS,
  families: CampaignWorkspace.FAMILIES,
  'rules-resources': CampaignWorkspace.RULES_RESOURCES,
  journals: CampaignWorkspace.JOURNALS,
};

const CATEGORY_TITLE_TO_WORKSPACE: Record<string, CampaignWorkspaceType> = {
  Characters: CampaignWorkspace.CHARACTERS,
  Bestiary: CampaignWorkspace.BESTIARY,
  Ancestries: CampaignWorkspace.ANCESTRIES,
  Organizations: CampaignWorkspace.ORGANIZATIONS,
  Locations: CampaignWorkspace.LOCATIONS,
  Objects: CampaignWorkspace.OBJECTS,
  Families: CampaignWorkspace.FAMILIES,
  'Rules/Resources': CampaignWorkspace.RULES_RESOURCES,
  Journals: CampaignWorkspace.JOURNALS,
};

export function isCategoryIndexPage(title: string | null | undefined): boolean {
  if (!title) return false;
  return CATEGORY_INDEX_TITLES.has(title.trim());
}

/** Whether a page should have workspace+pathKey (routable in public URLs). */
export function isRoutableWikiPage(page: WikiPageWorkspaceInput): boolean {
  if (/^event-[a-zA-Z0-9_-]+$/.test(page.id)) return false;
  if (CATEGORY_INDEX_TITLES.has(page.title.trim())) return false;
  if (page.templateType === 'SESSION_NOTE') return false;
  const systemKey = parseSystemCategoryKey(page.metadata);
  if (
    systemKey === 'party' ||
    systemKey === 'downtime' ||
    systemKey === SYSTEM_CATEGORY_QUESTS ||
    systemKey === SYSTEM_CATEGORY_NARRATIVE_THREADS
  ) {
    return false;
  }
  return true;
}

/**
 * Resolve stored workspace for a wiki page.
 * Returns null for category folders and non-routable infrastructure pages.
 */
export function resolveWorkspaceForPage(
  page: WikiPageWorkspaceInput,
  flatPages: readonly WikiPageWorkspaceInput[],
): CampaignWorkspaceType | null {
  if (!isRoutableWikiPage(page)) return null;

  if (page.templateType === DOWNTIME_HAVEN_TEMPLATE_TYPE) {
    return CampaignWorkspace.HAVENS;
  }
  if (page.templateType === DOWNTIME_PROJECT_TEMPLATE_TYPE) {
    return CampaignWorkspace.PROJECTS;
  }
  if (page.templateType === 'CHARACTER') {
    return CampaignWorkspace.CHARACTERS;
  }
  if (page.templateType === 'ORGANIZATION') {
    return CampaignWorkspace.ORGANIZATIONS;
  }
  if (page.templateType === 'FAMILY') {
    return CampaignWorkspace.FAMILIES;
  }
  if (page.templateType === 'LOCATION') {
    return CampaignWorkspace.LOCATIONS;
  }

  if (isPageUnderSystemCategory(page.id, flatPages, SYSTEM_CATEGORY_NARRATIVE_THREADS)) {
    return CampaignWorkspace.THREADS;
  }
  if (isPageUnderSystemCategory(page.id, flatPages, SYSTEM_CATEGORY_QUESTS)) {
    return CampaignWorkspace.ADVENTURES;
  }
  if (isPageUnderCategoryTitle(page.id, flatPages, 'Adventure')) {
    return CampaignWorkspace.ADVENTURES;
  }
  if (isPageUnderCategoryTitle(page.id, flatPages, 'Quests')) {
    return CampaignWorkspace.ADVENTURES;
  }
  if (isPageUnderCategoryTitle(page.id, flatPages, 'Narrative Threads')) {
    return CampaignWorkspace.THREADS;
  }
  if (isPageUnderCategoryTitle(page.id, flatPages, 'Threads')) {
    return CampaignWorkspace.THREADS;
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

  return CampaignWorkspace.PAGES;
}
