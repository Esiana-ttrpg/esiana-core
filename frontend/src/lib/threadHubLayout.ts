import type { WikiTreeNode } from '@/types/wiki';
import { SYSTEM_CATEGORY_NARRATIVE_THREADS, parseSystemCategoryKey } from '@/lib/wikiSystemCategory';

export function isPageUnderNarrativeThreadsCategory(
  pageId: string,
  flatPages: readonly WikiTreeNode[],
): boolean {
  const pageById = new Map(flatPages.map((page) => [page.id, page]));
  const visited = new Set<string>();
  let current = pageById.get(pageId)?.parentId ?? null;
  while (current) {
    if (visited.has(current)) break;
    visited.add(current);
    const node = pageById.get(current);
    if (!node) break;
    if (parseSystemCategoryKey(node.metadata) === SYSTEM_CATEGORY_NARRATIVE_THREADS) {
      return true;
    }
    current = node.parentId;
  }
  return false;
}

/** Wiki page id of the Narrative Threads system category folder, if present. */
export function resolveNarrativeThreadsRootId(
  flatPages: readonly WikiTreeNode[],
): string | null {
  for (const page of flatPages) {
    if (parseSystemCategoryKey(page.metadata) === SYSTEM_CATEGORY_NARRATIVE_THREADS) {
      return page.id;
    }
  }
  return null;
}
