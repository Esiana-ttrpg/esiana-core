import { CampaignWorkspace } from './campaignWorkspace.js';
import { normalizeEntityCategoryKey } from './entityCategoryKeys.js';
import { readEntityCategoryFromMetadata } from './wikiTemplateType.js';
import {
  resolveWorkspaceForPage,
  type WikiPageWorkspaceInput,
} from './wikiWorkspaceResolve.js';

const WORKSPACE_TO_ENTITY_CATEGORY: Partial<Record<string, string>> = {
  [CampaignWorkspace.CHARACTERS]: 'characters',
  [CampaignWorkspace.BESTIARY]: 'bestiary',
  [CampaignWorkspace.ANCESTRIES]: 'ancestries',
  [CampaignWorkspace.ORGANIZATIONS]: 'organizations',
  [CampaignWorkspace.LOCATIONS]: 'locations',
  [CampaignWorkspace.OBJECTS]: 'objects',
  [CampaignWorkspace.FAMILIES]: 'families',
  [CampaignWorkspace.RULES_RESOURCES]: 'rules-resources',
  [CampaignWorkspace.JOURNALS]: 'journals',
};

export type CanonicalEntityCategoryInput = {
  id: string;
  title: string;
  parentId?: string | null;
  templateType: string;
  metadata?: unknown;
};

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
    current = node.parentId ?? null;
  }
  return false;
}

const CATEGORY_TITLE_TO_ENTITY_KEY: Record<string, string> = {
  Characters: 'characters',
  Bestiary: 'bestiary',
  Ancestries: 'ancestries',
  Organizations: 'organizations',
  Locations: 'locations',
  Objects: 'objects',
  Families: 'families',
  'Rules/Resources': 'rules-resources',
  Journals: 'journals',
};

/**
 * Canonical entity category for a wiki page.
 * Uses metadata.entityCategory first, then tree/module placement — never legacy templateType.
 */
export function resolveCanonicalEntityCategory(
  page: CanonicalEntityCategoryInput,
  flatPages: readonly WikiPageWorkspaceInput[] = [],
): string | null {
  const fromMetadata = readEntityCategoryFromMetadata(page.metadata);
  if (fromMetadata) return fromMetadata;

  if (flatPages.length > 0) {
    for (const [title, key] of Object.entries(CATEGORY_TITLE_TO_ENTITY_KEY)) {
      if (isPageUnderCategoryTitle(page.id, flatPages, title)) {
        return key;
      }
    }

    const workspace = resolveWorkspaceForPage(page, flatPages);
    if (workspace && WORKSPACE_TO_ENTITY_CATEGORY[workspace]) {
      return WORKSPACE_TO_ENTITY_CATEGORY[workspace] ?? null;
    }
  }

  return null;
}

/** Whether metadata or tree placement identifies this page as a character entity. */
export function isCharacterEntityPage(
  page: CanonicalEntityCategoryInput,
  flatPages: readonly WikiPageWorkspaceInput[] = [],
): boolean {
  return resolveCanonicalEntityCategory(page, flatPages) === 'characters';
}
