/** Must match backend `wikiCategories.ts` titles. */
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
  'Narrative Threads',
  'Threads',
  'Journals',
  'Calendars',
  'Timelines',
  'Events',
  'Quick Access',
  'Bookmarks',
  'Relations',
  'Recent Changes',
  'Recent changes',
]);

export function isCategoryIndexPage(title: string): boolean {
  return CATEGORY_INDEX_TITLES.has(title);
}

/** Resolve canonical index category title for a folder page (sidebar + title). */
export function resolveCategoryIndexTitleForPage(
  pageId: string,
  flatPages: Array<{ id: string; title: string }>,
  pageIdByTitle: Map<string, string>,
): string | null {
  const page = flatPages.find((entry) => entry.id === pageId);
  if (page?.title && isCategoryIndexPage(page.title)) {
    return page.title;
  }

  for (const title of CATEGORY_INDEX_TITLES) {
    if (pageIdByTitle.get(title) === pageId) {
      return title;
    }
  }

  return null;
}
