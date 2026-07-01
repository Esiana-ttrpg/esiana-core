import { CampaignWorkspace, type CampaignWorkspace as CampaignWorkspaceType } from './campaignWorkspace.js';
import { ENTITY_CATEGORY_DISPLAY_BY_KEY, normalizeEntityCategoryKey } from './entityCategoryKeys.js';
import { isThreadMetadataPresent } from './threadMetadata.js';
import {
  SYSTEM_CATEGORY_NARRATIVE_THREADS,
  SYSTEM_CATEGORY_QUESTS,
  WIKI_SYSTEM_CATEGORY_KEY,
  isCategoryIndexPage,
  resolveWorkspaceForPage,
  type WikiPageWorkspaceInput,
} from './wikiWorkspaceResolve.js';

export type PageSurfaceKey =
  | 'character'
  | 'bestiary'
  | 'thread'
  | 'quest'
  | 'event-lore'
  | 'default';

export type PageModuleScope = {
  moduleKey: string;
  anchorPageId: string | null;
  workspace: CampaignWorkspaceType | null;
  surfaceKey: PageSurfaceKey;
};

export type PageModuleInput = WikiPageWorkspaceInput;

const WORKSPACE_TO_MODULE_KEY: Partial<Record<CampaignWorkspaceType, string>> = {
  [CampaignWorkspace.CHARACTERS]: 'characters',
  [CampaignWorkspace.BESTIARY]: 'bestiary',
  [CampaignWorkspace.ANCESTRIES]: 'ancestries',
  [CampaignWorkspace.ORGANIZATIONS]: 'organizations',
  [CampaignWorkspace.LOCATIONS]: 'locations',
  [CampaignWorkspace.OBJECTS]: 'objects',
  [CampaignWorkspace.FAMILIES]: 'families',
  [CampaignWorkspace.RULES_RESOURCES]: 'rules-resources',
  [CampaignWorkspace.JOURNALS]: 'journals',
  [CampaignWorkspace.ADVENTURES]: 'quests',
  [CampaignWorkspace.THREADS]: 'threads',
  [CampaignWorkspace.HAVENS]: 'havens',
  [CampaignWorkspace.PROJECTS]: 'projects',
  [CampaignWorkspace.PAGES]: 'pages',
  [CampaignWorkspace.CUSTOM]: 'custom',
};

function parseSystemCategoryKey(metadata: unknown): string | null {
  if (!metadata || typeof metadata !== 'object') return null;
  const raw = (metadata as Record<string, unknown>)[WIKI_SYSTEM_CATEGORY_KEY];
  return typeof raw === 'string' && raw.trim() ? raw.trim() : null;
}

function isPageUnderSystemCategory(
  pageId: string,
  flatPages: readonly PageModuleInput[],
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
  flatPages: readonly PageModuleInput[],
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
  return normalizeEntityCategoryKey(typeof raw === 'string' ? raw : null);
}

function isQuestMetadataPresent(metadata: unknown): boolean {
  if (!metadata || typeof metadata !== 'object') return false;
  const raw = (metadata as Record<string, unknown>).questStatus;
  return typeof raw === 'string' && raw.trim().length > 0;
}

export function isEventLorePageId(pageId: string): boolean {
  return /^event-[a-zA-Z0-9_-]+$/.test(pageId);
}

export function resolvePageSurfaceKey(
  page: PageModuleInput,
  flatPages: readonly PageModuleInput[],
): PageSurfaceKey {
  if (isEventLorePageId(page.id)) return 'event-lore';

  if (isPageUnderSystemCategory(page.id, flatPages, SYSTEM_CATEGORY_NARRATIVE_THREADS)) {
    return 'thread';
  }
  if (
    isPageUnderSystemCategory(page.id, flatPages, SYSTEM_CATEGORY_QUESTS) ||
    page.templateType === 'QUEST' ||
    isQuestMetadataPresent(page.metadata)
  ) {
    return 'quest';
  }

  if (page.templateType === 'CHARACTER') return 'character';

  const entityCategory = readEntityCategory(page.metadata);
  if (entityCategory === 'bestiary' || isPageUnderCategoryTitle(page.id, flatPages, 'Bestiary')) {
    return 'bestiary';
  }
  if (entityCategory === 'characters' || isPageUnderCategoryTitle(page.id, flatPages, 'Characters')) {
    return 'character';
  }

  return 'default';
}

function resolveAnchorPageId(
  flatPages: readonly PageModuleInput[],
  moduleKey: string,
): string | null {
  if (moduleKey === 'quests') {
    const questsFolder = flatPages.find(
      (page) => parseSystemCategoryKey(page.metadata) === SYSTEM_CATEGORY_QUESTS,
    );
    if (questsFolder) return questsFolder.id;
    const legacy = flatPages.find((page) => page.title === 'Quests');
    return legacy?.id ?? null;
  }

  if (moduleKey === 'threads') {
    const threadsFolder = flatPages.find(
      (page) => parseSystemCategoryKey(page.metadata) === SYSTEM_CATEGORY_NARRATIVE_THREADS,
    );
    if (threadsFolder) return threadsFolder.id;
    const legacy = flatPages.find(
      (page) => page.title === 'Narrative Threads' || page.title === 'Threads',
    );
    return legacy?.id ?? null;
  }

  if (moduleKey === 'characters') {
    const partyFolder = flatPages.find(
      (page) => parseSystemCategoryKey(page.metadata) === 'party',
    );
    if (partyFolder) return partyFolder.id;
  }

  const displayTitle = ENTITY_CATEGORY_DISPLAY_BY_KEY[moduleKey];
  if (displayTitle) {
    const folder = flatPages.find(
      (page) => page.title === displayTitle && isCategoryIndexPage(page.title),
    );
    if (folder) return folder.id;
  }

  return null;
}

export function resolvePageModuleScope(
  page: PageModuleInput,
  flatPages: readonly PageModuleInput[],
): PageModuleScope {
  const surfaceKey = resolvePageSurfaceKey(page, flatPages);

  if (surfaceKey === 'event-lore') {
    return {
      moduleKey: 'event-lore',
      anchorPageId: null,
      workspace: null,
      surfaceKey,
    };
  }

  if (surfaceKey === 'thread') {
    return {
      moduleKey: 'threads',
      anchorPageId: resolveAnchorPageId(flatPages, 'threads'),
      workspace: CampaignWorkspace.THREADS,
      surfaceKey,
    };
  }

  if (surfaceKey === 'quest') {
    return {
      moduleKey: 'quests',
      anchorPageId: resolveAnchorPageId(flatPages, 'quests'),
      workspace: CampaignWorkspace.ADVENTURES,
      surfaceKey,
    };
  }

  if (surfaceKey === 'character') {
    return {
      moduleKey: 'characters',
      anchorPageId: resolveAnchorPageId(flatPages, 'characters'),
      workspace: CampaignWorkspace.CHARACTERS,
      surfaceKey,
    };
  }

  if (surfaceKey === 'bestiary') {
    return {
      moduleKey: 'bestiary',
      anchorPageId: resolveAnchorPageId(flatPages, 'bestiary'),
      workspace: CampaignWorkspace.BESTIARY,
      surfaceKey,
    };
  }

  const workspace = resolveWorkspaceForPage(page, flatPages);
  const moduleKey =
    (workspace ? WORKSPACE_TO_MODULE_KEY[workspace] : null) ??
    readEntityCategory(page.metadata) ??
    'pages';

  return {
    moduleKey,
    anchorPageId: resolveAnchorPageId(flatPages, moduleKey),
    workspace,
    surfaceKey,
  };
}

export function isSameModuleScope(a: PageModuleScope, b: PageModuleScope): boolean {
  return a.moduleKey === b.moduleKey;
}

function collectDescendantIds(
  pageId: string,
  flatPages: readonly PageModuleInput[],
): Set<string> {
  const excluded = new Set<string>();
  const childrenByParent = new Map<string, string[]>();
  for (const page of flatPages) {
    if (!page.parentId) continue;
    const siblings = childrenByParent.get(page.parentId) ?? [];
    siblings.push(page.id);
    childrenByParent.set(page.parentId, siblings);
  }

  const queue = [pageId];
  while (queue.length > 0) {
    const current = queue.pop()!;
    for (const childId of childrenByParent.get(current) ?? []) {
      if (excluded.has(childId)) continue;
      excluded.add(childId);
      queue.push(childId);
    }
  }

  return excluded;
}

export function filterPagesInModuleScope<T extends PageModuleInput>(
  flatPages: readonly T[],
  scope: PageModuleScope,
  pageId: string,
): T[] {
  const descendants = collectDescendantIds(pageId, flatPages);

  return flatPages.filter((page) => {
    if (page.id === pageId || descendants.has(page.id)) return false;
    if (scope.anchorPageId && page.id === scope.anchorPageId) return true;
    const pageScope = resolvePageModuleScope(page, flatPages);
    return pageScope.moduleKey === scope.moduleKey;
  });
}

export function moduleKeyToDisplayLabel(moduleKey: string): string {
  if (moduleKey === 'event-lore') return 'Event lore';
  if (moduleKey === 'quests') return 'Quests';
  if (moduleKey === 'threads') return 'Narrative threads';
  const label = ENTITY_CATEGORY_DISPLAY_BY_KEY[moduleKey];
  if (label) return label;
  return moduleKey
    .split('-')
    .map((part) => (part ? part[0].toUpperCase() + part.slice(1) : part))
    .join(' ');
}

export function resolveTargetModuleAnchorPageId(
  flatPages: readonly PageModuleInput[],
  targetModuleKey: string,
): string | null {
  return resolveAnchorPageId(flatPages, targetModuleKey);
}
