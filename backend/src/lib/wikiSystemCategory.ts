/**
 * Immutable wiki category folder identifiers (sidebar route ids).
 * Stored on category folder WikiPage.metadata.systemCategoryKey.
 */

export const WIKI_SYSTEM_CATEGORY_KEY = 'systemCategoryKey';

export const SYSTEM_CATEGORY_QUESTS = 'quests';
export const SYSTEM_CATEGORY_PARTY = 'party';
export const SYSTEM_CATEGORY_NARRATIVE_THREADS = 'narrative_threads';
export const SYSTEM_CATEGORY_NARRATIVE_SCENES = 'narrative_scenes';
export const SYSTEM_CATEGORY_DOWNTIME = 'downtime';

export function parseSystemCategoryKey(metadata: unknown): string | null {
  if (!metadata || typeof metadata !== 'object') return null;
  const raw = (metadata as Record<string, unknown>)[WIKI_SYSTEM_CATEGORY_KEY];
  return typeof raw === 'string' && raw.trim() ? raw.trim() : null;
}

export function isQuestsCategoryPage(metadata: unknown): boolean {
  return parseSystemCategoryKey(metadata) === SYSTEM_CATEGORY_QUESTS;
}

export function buildQuestsCategoryMetadata(): Record<string, string> {
  return { [WIKI_SYSTEM_CATEGORY_KEY]: SYSTEM_CATEGORY_QUESTS };
}

export function isPartyCategoryPage(metadata: unknown): boolean {
  return parseSystemCategoryKey(metadata) === SYSTEM_CATEGORY_PARTY;
}

export function buildPartyCategoryMetadata(): Record<string, string> {
  return { [WIKI_SYSTEM_CATEGORY_KEY]: SYSTEM_CATEGORY_PARTY };
}

export function resolvePartyCategoryPage(
  pages: WikiPageSystemCategoryRow[],
): WikiPageSystemCategoryRow | null {
  const byKey = pages.find((page) => isPartyCategoryPage(page.metadata));
  if (byKey) return byKey;

  const worldFolder = pages.find((page) => page.title === 'World' && !page.parentId);
  const worldId = worldFolder?.id;
  const legacy = pages.find(
    (page) =>
      page.title === 'Party' &&
      (worldId ? page.parentId === worldId : page.parentId != null),
  );
  return legacy ?? null;
}

export type WikiPageSystemCategoryRow = {
  id: string;
  title: string;
  parentId: string | null;
  metadata: unknown;
};

export function resolveQuestsCategoryPage(
  pages: WikiPageSystemCategoryRow[],
): WikiPageSystemCategoryRow | null {
  return pages.find((page) => isQuestsCategoryPage(page.metadata)) ?? null;
}

export function isNarrativeThreadsCategoryPage(metadata: unknown): boolean {
  return parseSystemCategoryKey(metadata) === SYSTEM_CATEGORY_NARRATIVE_THREADS;
}

export function buildNarrativeThreadsCategoryMetadata(): Record<string, string> {
  return { [WIKI_SYSTEM_CATEGORY_KEY]: SYSTEM_CATEGORY_NARRATIVE_THREADS };
}

export function resolveNarrativeThreadsCategoryPage(
  pages: WikiPageSystemCategoryRow[],
): WikiPageSystemCategoryRow | null {
  const byKey = pages.find((page) => isNarrativeThreadsCategoryPage(page.metadata));
  if (byKey) return byKey;

  const gameFolder = pages.find((page) => page.title === 'Game' && !page.parentId);
  const gameId = gameFolder?.id;
  const legacy = pages.find(
    (page) =>
      (page.title === 'Threads' || page.title === 'Narrative Threads') &&
      (gameId ? page.parentId === gameId : page.parentId != null),
  );
  return legacy ?? null;
}

export function isNarrativeScenesCategoryPage(metadata: unknown): boolean {
  return parseSystemCategoryKey(metadata) === SYSTEM_CATEGORY_NARRATIVE_SCENES;
}

export function buildNarrativeScenesCategoryMetadata(): Record<string, string> {
  return { [WIKI_SYSTEM_CATEGORY_KEY]: SYSTEM_CATEGORY_NARRATIVE_SCENES };
}

export function resolveNarrativeScenesCategoryPage(
  pages: WikiPageSystemCategoryRow[],
): WikiPageSystemCategoryRow | null {
  const byKey = pages.find((page) => isNarrativeScenesCategoryPage(page.metadata));
  if (byKey) return byKey;

  const gameFolder = pages.find((page) => page.title === 'Game' && !page.parentId);
  const gameId = gameFolder?.id;
  const legacy = pages.find(
    (page) =>
      page.title === 'Scenes' &&
      (gameId ? page.parentId === gameId : page.parentId != null),
  );
  return legacy ?? null;
}

export function isDowntimeCategoryPage(metadata: unknown): boolean {
  return parseSystemCategoryKey(metadata) === SYSTEM_CATEGORY_DOWNTIME;
}

export function buildDowntimeCategoryMetadata(): Record<string, string> {
  return { [WIKI_SYSTEM_CATEGORY_KEY]: SYSTEM_CATEGORY_DOWNTIME };
}

export function resolveDowntimeCategoryPage(
  pages: WikiPageSystemCategoryRow[],
): WikiPageSystemCategoryRow | null {
  return pages.find((page) => isDowntimeCategoryPage(page.metadata)) ?? null;
}
