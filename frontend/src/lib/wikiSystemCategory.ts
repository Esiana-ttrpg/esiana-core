/**
 * Immutable wiki category folder identifiers (sidebar route ids).
 */

export const WIKI_SYSTEM_CATEGORY_KEY = 'systemCategoryKey';

export const SYSTEM_CATEGORY_QUESTS = 'quests';
export const SYSTEM_CATEGORY_PARTY = 'party';
export const SYSTEM_CATEGORY_NARRATIVE_THREADS = 'narrative_threads';
export const SYSTEM_CATEGORY_NARRATIVE_SCENES = 'narrative_scenes';
export const SYSTEM_CATEGORY_DOWNTIME = 'downtime';

export function isPartyCategoryPage(metadata: unknown): boolean {
  return parseSystemCategoryKey(metadata) === SYSTEM_CATEGORY_PARTY;
}

export function isPartyHubCategoryPage(metadata: unknown): boolean {
  return isPartyCategoryPage(metadata);
}

type WikiTreeParentNode = {
  id: string;
  parentId: string | null;
  metadata?: unknown;
};

/** True when `pageId` is nested under the Party system category folder. */
export function isPageUnderPartyCategory(
  pageId: string,
  flatPages: readonly WikiTreeParentNode[],
): boolean {
  const pageById = new Map(flatPages.map((page) => [page.id, page]));
  const visited = new Set<string>();
  let current = pageById.get(pageId)?.parentId ?? null;
  while (current) {
    if (visited.has(current)) break;
    visited.add(current);
    const node = pageById.get(current);
    if (!node) break;
    if (isPartyCategoryPage(node.metadata)) return true;
    current = node.parentId;
  }
  return false;
}

export function parseSystemCategoryKey(metadata: unknown): string | null {
  if (!metadata || typeof metadata !== 'object') return null;
  const raw = (metadata as Record<string, unknown>)[WIKI_SYSTEM_CATEGORY_KEY];
  return typeof raw === 'string' && raw.trim() ? raw.trim() : null;
}

export function isQuestsCategoryPage(metadata: unknown): boolean {
  return parseSystemCategoryKey(metadata) === SYSTEM_CATEGORY_QUESTS;
}

export function isQuestHubCategoryPage(metadata: unknown): boolean {
  return isQuestsCategoryPage(metadata);
}

export function isNarrativeThreadsCategoryPage(metadata: unknown): boolean {
  return parseSystemCategoryKey(metadata) === SYSTEM_CATEGORY_NARRATIVE_THREADS;
}

export function isThreadHubCategoryPage(metadata: unknown): boolean {
  return isNarrativeThreadsCategoryPage(metadata);
}

export function isNarrativeScenesCategoryPage(metadata: unknown): boolean {
  return parseSystemCategoryKey(metadata) === SYSTEM_CATEGORY_NARRATIVE_SCENES;
}

export function isDowntimeCategoryPage(metadata: unknown): boolean {
  return parseSystemCategoryKey(metadata) === SYSTEM_CATEGORY_DOWNTIME;
}

export function isDowntimeHubCategoryPage(metadata: unknown): boolean {
  return isDowntimeCategoryPage(metadata);
}
