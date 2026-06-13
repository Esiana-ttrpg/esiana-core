import type { CategoryIndexChild } from '@/lib/wiki';

/** Node in a codex hierarchy forest (browse-as-hierarchy). */
export interface CodexHierarchyNode {
  id: string;
  title: string;
  child: CategoryIndexChild;
  children: CodexHierarchyNode[];
}

/** Flattened row for rendering with expand/collapse. */
export interface CodexHierarchyRow {
  node: CodexHierarchyNode;
  depth: number;
  hasChildren: boolean;
  /** Ancestor titles excluding self — for "Kingdom › Western Reach" subtitle. */
  parentTrailLabel: string | null;
}

export interface CodexHierarchyItem {
  id: string;
  title: string;
  parentId: string | null;
}

export interface BuildCodexHierarchyForestOptions {
  /** Full catalog for parent-trail context and ancestor augmentation lookup. */
  allChildren?: CategoryIndexChild[];
  /** Re-root browse to a subtree when set. */
  focusRootId?: string | null;
  /**
   * Post-filter inclusion override: ancestor IDs to add to the forest set even
   * when they did not match search/refine. Resolved from `allChildren`; not
   * computed here. Unused in v1 — extension seam for post-v1 ancestor reveal.
   */
  includeAncestorIds?: Set<string>;
}

/**
 * Build hierarchy forest from an already-resolved inclusion set.
 *
 * Pipeline (search/refine → optional ancestor augmentation → forest build):
 *   1. Caller filters catalog → `filteredChildren`
 *   2. Caller may augment via `includeAncestorIds` (from `allChildren`)
 *   3. This function builds trees from the final inclusion set only
 *
 * Orphan re-rooting: parent not in inclusion set → treat as root.
 */
export function buildCodexHierarchyForest(
  filteredChildren: CategoryIndexChild[],
  categoryPageId: string,
  options?: BuildCodexHierarchyForestOptions,
): CodexHierarchyNode[] {
  const allChildren = options?.allChildren;
  const inclusionChildren = resolveHierarchyInclusionSet(
    filteredChildren,
    allChildren,
    options?.includeAncestorIds,
  );
  const inclusionIds = new Set(inclusionChildren.map((c) => c.id));

  function isRoot(child: CategoryIndexChild): boolean {
    if (!child.parentId) return true;
    if (child.parentId === categoryPageId) return true;
    if (!inclusionIds.has(child.parentId)) return true;
    return false;
  }

  let roots = inclusionChildren.filter(isRoot);
  const focusRootId = options?.focusRootId;
  if (focusRootId) {
    const focus = inclusionChildren.find((c) => c.id === focusRootId);
    roots = focus ? [focus] : [];
  }

  roots.sort((a, b) =>
    a.title.localeCompare(b.title, undefined, { sensitivity: 'base' }),
  );

  const visited = new Set<string>();

  function buildNode(child: CategoryIndexChild): CodexHierarchyNode {
    if (visited.has(child.id)) {
      return { id: child.id, title: child.title, child, children: [] };
    }
    visited.add(child.id);

    const children = inclusionChildren
      .filter((c) => c.parentId === child.id && c.id !== child.id)
      .sort((a, b) =>
        a.title.localeCompare(b.title, undefined, { sensitivity: 'base' }),
      )
      .map(buildNode);

    return { id: child.id, title: child.title, child, children };
  }

  return roots.map(buildNode);
}

/** Merge filtered matches with caller-supplied ancestor IDs (post-v1 reveal seam). */
function resolveHierarchyInclusionSet(
  filteredChildren: CategoryIndexChild[],
  allChildren: CategoryIndexChild[] | undefined,
  includeAncestorIds: Set<string> | undefined,
): CategoryIndexChild[] {
  if (!includeAncestorIds?.size) return filteredChildren;

  const catalogById = new Map(
    (allChildren ?? filteredChildren).map((c) => [c.id, c]),
  );
  const byId = new Map(filteredChildren.map((c) => [c.id, c]));

  for (const id of includeAncestorIds) {
    if (!byId.has(id)) {
      const ancestor = catalogById.get(id);
      if (ancestor) byId.set(id, ancestor);
    }
  }
  return [...byId.values()];
}

export function buildParentTrailLabel(
  child: CategoryIndexChild,
  allById: Map<string, CategoryIndexChild>,
  categoryPageId: string,
): string | null {
  const chain: string[] = [];
  const seen = new Set<string>();
  let currentId: string | null = child.parentId;

  while (currentId && !seen.has(currentId)) {
    if (currentId === categoryPageId) break;
    seen.add(currentId);
    const parent = allById.get(currentId);
    if (!parent) break;
    chain.unshift(parent.title);
    currentId = parent.parentId;
  }

  if (chain.length === 0) return null;
  return chain.join(' › ');
}

/** Default expanded ids: roots + their direct children (levels 0–1). */
export function defaultExpandedHierarchyIds(
  forest: CodexHierarchyNode[],
): Set<string> {
  const ids = new Set<string>();
  for (const root of forest) {
    ids.add(root.id);
    for (const child of root.children) {
      ids.add(child.id);
    }
  }
  return ids;
}

export function flattenCodexHierarchy(
  forest: CodexHierarchyNode[],
  expandedIds: Set<string>,
  allById: Map<string, CategoryIndexChild>,
  categoryPageId: string,
): CodexHierarchyRow[] {
  const rows: CodexHierarchyRow[] = [];

  function walk(node: CodexHierarchyNode, depth: number) {
    const hasChildren = node.children.length > 0;
    rows.push({
      node,
      depth,
      hasChildren,
      parentTrailLabel: buildParentTrailLabel(
        node.child,
        allById,
        categoryPageId,
      ),
    });
    if (hasChildren && expandedIds.has(node.id)) {
      for (const child of node.children) {
        walk(child, depth + 1);
      }
    }
  }

  for (const root of forest) {
    walk(root, 0);
  }
  return rows;
}

export function hasHierarchyRelationships(
  filteredChildren: CategoryIndexChild[],
  categoryPageId: string,
): boolean {
  const filteredIds = new Set(filteredChildren.map((c) => c.id));
  return filteredChildren.some(
    (c) =>
      c.parentId &&
      c.parentId !== categoryPageId &&
      filteredIds.has(c.parentId),
  );
}

/** Generic hierarchy node for adapters (maps, etc.). */
export interface GenericHierarchyNode<T extends CodexHierarchyItem> {
  item: T;
  children: GenericHierarchyNode<T>[];
}

export function buildGenericHierarchyForest<T extends CodexHierarchyItem>(
  items: T[],
  resolveParentId: (item: T) => string | null,
  rootParentIds: Set<string | null> = new Set([null]),
): GenericHierarchyNode<T>[] {
  const itemIds = new Set(items.map((i) => i.id));

  function isRoot(item: T): boolean {
    const parentId = resolveParentId(item);
    if (rootParentIds.has(parentId)) return true;
    if (parentId && !itemIds.has(parentId)) return true;
    return false;
  }

  const roots = items
    .filter(isRoot)
    .sort((a, b) =>
      a.title.localeCompare(b.title, undefined, { sensitivity: 'base' }),
    );

  const visited = new Set<string>();

  function buildNode(item: T): GenericHierarchyNode<T> {
    if (visited.has(item.id)) {
      return { item, children: [] };
    }
    visited.add(item.id);
    const children = items
      .filter((c) => resolveParentId(c) === item.id && c.id !== item.id)
      .sort((a, b) =>
        a.title.localeCompare(b.title, undefined, { sensitivity: 'base' }),
      )
      .map(buildNode);
    return { item, children };
  }

  return roots.map(buildNode);
}
