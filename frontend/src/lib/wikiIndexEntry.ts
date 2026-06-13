/**
 * Default codex landing page when opening lore (World folder index).
 * Campaign Home lives at `/campaigns/:slug/dashboard`, not in the wiki tree.
 */

export const WIKI_INDEX_PAGE_TITLES = ['World'] as const;

export function resolveWikiIndexPageId(
  resolvePageId: (title: string) => string | undefined,
  flatPages: ReadonlyArray<{ id: string }>,
): string | undefined {
  for (const title of WIKI_INDEX_PAGE_TITLES) {
    const id = resolvePageId(title);
    if (id) return id;
  }
  return flatPages[0]?.id;
}
