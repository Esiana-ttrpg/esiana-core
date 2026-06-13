import type { WikiPageParentRef, WikiTreeNode } from '@/types/wiki';
import { isCategoryIndexPage } from '@/lib/wikiCategories';
import {
  isReservedSystemWikiPage,
  isStructuralDividerTitle,
} from '@/lib/wikiSystemPages';

export interface WikiBreadcrumb {
  id: string;
  title: string;
}

function flattenParentChain(
  parentChain: WikiPageParentRef | null | undefined,
): WikiBreadcrumb[] {
  const crumbs: WikiBreadcrumb[] = [];
  const visited = new Set<string>();
  let node: WikiPageParentRef | null | undefined = parentChain;
  while (node) {
    if (visited.has(node.id)) break;
    visited.add(node.id);
    crumbs.unshift({ id: node.id, title: node.title });
    node = node.parent ?? null;
  }
  return crumbs;
}

function isStructuralBreadcrumbCrumb(crumb: WikiBreadcrumb): boolean {
  if (isStructuralDividerTitle(crumb.title)) return true;
  if (isCategoryIndexPage(crumb.title)) return true;
  return isReservedSystemWikiPage({ title: crumb.title });
}

/** Nav trail: keeps category index folders; strips World/Dashboard/reserved only. */
function isNavStructuralBreadcrumbCrumb(crumb: WikiBreadcrumb): boolean {
  if (isStructuralDividerTitle(crumb.title)) return true;
  return isReservedSystemWikiPage({ title: crumb.title });
}

/** O(N) id → node map; memoize at call sites when `flatPages` is stable. */
export function buildWikiPageLookup(
  flatPages: WikiTreeNode[],
): Map<string, WikiTreeNode> {
  return new Map(flatPages.map((page) => [page.id, page]));
}

type ParentRef = { id: string; title: string; parentId: string | null };

/** Walk ancestor ids root→leaf with cycle protection. */
export function walkAncestorIds(
  pageId: string,
  pageById: Map<string, ParentRef | WikiTreeNode>,
): string[] {
  const page = pageById.get(pageId);
  if (!page?.parentId) return [];

  const ancestorIds: string[] = [];
  const visited = new Set<string>();
  let currentId: string | null | undefined = page.parentId;

  while (currentId) {
    if (visited.has(currentId)) break;
    visited.add(currentId);
    const ancestor = pageById.get(currentId);
    if (!ancestor) break;
    ancestorIds.push(currentId);
    currentId = ancestor.parentId;
  }

  return ancestorIds;
}

/** Walk ancestors and fold into nested `WikiPageParentRef` (immediate parent outermost). */
export function buildParentChainFromFlatPages(
  pageId: string,
  pageById: Map<string, WikiTreeNode>,
): WikiPageParentRef | null {
  const ancestorIds = walkAncestorIds(pageId, pageById);
  if (ancestorIds.length === 0) return null;

  let acc: WikiPageParentRef | null = null;
  for (let i = ancestorIds.length - 1; i >= 0; i--) {
    const ancestor = pageById.get(ancestorIds[i]!);
    if (!ancestor) continue;
    acc = {
      id: ancestor.id,
      title: ancestor.title,
      parent: acc,
    };
  }
  return acc;
}

/** Replace titles in a nested parent chain from the latest flat tree lookup. */
export function hydrateParentChainTitles(
  chain: WikiPageParentRef | null | undefined,
  pageById: Map<string, WikiTreeNode>,
): WikiPageParentRef | null {
  if (!chain) return null;
  const visited = new Set<string>();
  let node: WikiPageParentRef | null = chain;
  let root: WikiPageParentRef | null = null;
  let tail: WikiPageParentRef | null = null;

  while (node) {
    if (visited.has(node.id)) break;
    visited.add(node.id);
    const freshTitle = pageById.get(node.id)?.title ?? node.title;
    const hydrated: WikiPageParentRef = {
      id: node.id,
      title: freshTitle,
      parent: null,
    };
    if (!root) {
      root = hydrated;
      tail = hydrated;
    } else if (tail) {
      tail.parent = hydrated;
      tail = hydrated;
    }
    node = node.parent ?? null;
  }

  return root;
}

/** Prefer full tree chain when the page exists in `pageById`; else API parent. */
export function resolveWikiParentChain(
  pageId: string,
  apiParent: WikiPageParentRef | null | undefined,
  pageById: Map<string, WikiTreeNode>,
): WikiPageParentRef | null {
  if (pageById.size === 0 || !pageById.has(pageId)) {
    return hydrateParentChainTitles(apiParent ?? null, pageById);
  }
  const built = buildParentChainFromFlatPages(pageId, pageById);
  return hydrateParentChainTitles(built, pageById);
}

/**
 * Location trail for index rows when a page lives outside the category folder root.
 * Returns null when the page is a direct child of the category folder.
 */
export function formatIndexLocationTrail(
  child: { id: string; title: string; parentId: string | null },
  categoryPageId: string,
  categoryTitle: string,
  pageById: Map<string, WikiTreeNode>,
): string | null {
  if (child.parentId === categoryPageId) return null;
  if (pageById.size === 0) return null;

  const trailParts = [...walkAncestorIds(child.id, pageById)]
    .reverse()
    .map((id) => pageById.get(id)?.title ?? '')
    .filter((title) => title && title !== categoryTitle);

  if (trailParts.length === 0) return null;
  return trailParts.join(' › ');
}

/** Flatten parent chain, drop structural dividers, then append the current page. */
export function buildWikiBreadcrumbs(
  parentChain: WikiPageParentRef | null | undefined,
  currentPage?: { id: string; title: string },
): WikiBreadcrumb[] {
  const filteredTrail = flattenParentChain(parentChain).filter(
    (crumb) => !isStructuralBreadcrumbCrumb(crumb),
  );

  if (currentPage) {
    return [...filteredTrail, { id: currentPage.id, title: currentPage.title }];
  }

  return filteredTrail;
}

/** Wiki page header trail — includes category folders (Characters, Locations, …). */
export function buildWikiNavBreadcrumbs(
  parentChain: WikiPageParentRef | null | undefined,
  currentPage?: { id: string; title: string },
): WikiBreadcrumb[] {
  const filteredTrail = flattenParentChain(parentChain).filter(
    (crumb) => !isNavStructuralBreadcrumbCrumb(crumb),
  );

  if (currentPage) {
    return [...filteredTrail, { id: currentPage.id, title: currentPage.title }];
  }

  return filteredTrail;
}

/** IDs that must not be selectable as parent (page itself + all descendants). */
export function collectDescendantIds(
  pageId: string,
  flatPages: WikiTreeNode[],
): Set<string> {
  const excluded = new Set<string>([pageId]);
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

function getPageDepth(pageId: string, flatPages: WikiTreeNode[]): number {
  const pageById = buildWikiPageLookup(flatPages);
  const ancestorIds = walkAncestorIds(pageId, pageById);
  return ancestorIds.length;
}

/** Whether a page must not appear as a parent target in the picker. */
export function isExcludedParentCandidate(
  page: WikiTreeNode,
  pageId: string,
  flatPages: WikiTreeNode[],
): boolean {
  const descendantIds = collectDescendantIds(pageId, flatPages);
  if (page.id === pageId || descendantIds.has(page.id)) {
    return true;
  }

  if (isStructuralDividerTitle(page.title)) {
    return true;
  }

  if (
    isReservedSystemWikiPage({
      title: page.title,
      templateType: page.templateType,
    })
  ) {
    return true;
  }

  return false;
}

/** Human-readable label with ancestor trail (structural dividers omitted). */
export function formatParentOptionLabel(
  node: WikiTreeNode,
  flatPages: WikiTreeNode[],
): string {
  const pageById = buildWikiPageLookup(flatPages);
  const parts: string[] = [];
  const visited = new Set<string>();
  let current: WikiTreeNode | undefined = node;

  while (current) {
    if (visited.has(current.id)) break;
    visited.add(current.id);
    if (
      !isStructuralDividerTitle(current.title) &&
      !isCategoryIndexPage(current.title)
    ) {
      parts.unshift(pageById.get(current.id)?.title ?? current.title);
    }
    current = current.parentId
      ? pageById.get(current.parentId)
      : undefined;
  }

  const displayTitle =
    parts.length > 0 ? parts.join(' › ') : node.title.trim();
  const depth = getPageDepth(node.id, flatPages);
  const indent = depth > 0 ? `${'  '.repeat(depth)}` : '';
  return `${indent}${displayTitle}`;
}
