/** Minimal forest node shape for collapse-delta expansion state. */
export interface HierarchyForestNode {
  id: string;
  children: HierarchyForestNode[];
}

/** Collect all node IDs present in a hierarchy forest. */
export function collectHierarchyNodeIds(
  forest: HierarchyForestNode[],
): Set<string> {
  const ids = new Set<string>();
  function walk(node: HierarchyForestNode) {
    ids.add(node.id);
    for (const child of node.children) walk(child);
  }
  for (const root of forest) walk(root);
  return ids;
}

/**
 * Resolve effective expanded IDs from collapse deltas.
 * Missing or stale collapsed IDs are ignored silently.
 */
export function resolveHierarchyExpandedIds(
  defaultExpandedIds: Set<string>,
  collapsedIds: Set<string>,
  extraExpandedIds: Set<string> = new Set(),
): Set<string> {
  const expanded = new Set(defaultExpandedIds);
  for (const id of collapsedIds) expanded.delete(id);
  for (const id of extraExpandedIds) expanded.add(id);
  return expanded;
}

/** Best-effort prune of collapsed IDs no longer in the forest. */
export function pruneHierarchyCollapsedIds(
  collapsedIds: Set<string>,
  forestNodeIds: Set<string>,
): Set<string> {
  const pruned = new Set<string>();
  for (const id of collapsedIds) {
    if (forestNodeIds.has(id)) pruned.add(id);
  }
  return pruned;
}

/** Best-effort prune of in-session deep expansions no longer in the forest. */
export function pruneHierarchyExtraExpandedIds(
  extraExpandedIds: Set<string>,
  forestNodeIds: Set<string>,
): Set<string> {
  const pruned = new Set<string>();
  for (const id of extraExpandedIds) {
    if (forestNodeIds.has(id)) pruned.add(id);
  }
  return pruned;
}

/** Convert legacy full expanded snapshot to collapse-delta (levels 0–1 default). */
export function legacyExpandedToCollapsedIds(
  defaultExpandedIds: Set<string>,
  legacyExpandedIds: Set<string>,
): Set<string> {
  const collapsed = new Set<string>();
  for (const id of defaultExpandedIds) {
    if (!legacyExpandedIds.has(id)) collapsed.add(id);
  }
  return collapsed;
}

export interface HierarchyExpansionToggleResult {
  expandedIds: Set<string>;
  collapsedIds: Set<string>;
  extraExpandedIds: Set<string>;
}

/** Apply expand/collapse toggle against default policy + collapse delta. */
export function toggleHierarchyExpansion(
  nodeId: string,
  defaultExpandedIds: Set<string>,
  expandedIds: Set<string>,
  collapsedIds: Set<string>,
  extraExpandedIds: Set<string>,
): HierarchyExpansionToggleResult {
  const nextCollapsed = new Set(collapsedIds);
  const nextExtraExpanded = new Set(extraExpandedIds);
  const isExpanded = expandedIds.has(nodeId);

  if (isExpanded) {
    if (defaultExpandedIds.has(nodeId)) {
      nextCollapsed.add(nodeId);
    } else {
      nextExtraExpanded.delete(nodeId);
    }
  } else if (defaultExpandedIds.has(nodeId)) {
    nextCollapsed.delete(nodeId);
  } else {
    nextExtraExpanded.add(nodeId);
  }

  return {
    collapsedIds: nextCollapsed,
    extraExpandedIds: nextExtraExpanded,
    expandedIds: resolveHierarchyExpandedIds(
      defaultExpandedIds,
      nextCollapsed,
      nextExtraExpanded,
    ),
  };
}

export interface HierarchyCollapseStorage {
  readCollapsed: () => Set<string> | null;
  writeCollapsed: (collapsedIds: Set<string>) => void;
  readLegacyExpanded?: () => Set<string> | null;
  clearLegacy?: () => void;
}

/**
 * Load collapse-delta from storage with legacy migration and soft invalidation.
 * Never throws; returns empty collapsed set on corrupt or missing storage.
 */
export function loadHierarchyCollapseState(
  forest: HierarchyForestNode[],
  defaultExpandedIds: Set<string>,
  storage: HierarchyCollapseStorage,
): {
  collapsedIds: Set<string>;
  extraExpandedIds: Set<string>;
  expandedIds: Set<string>;
} {
  const forestNodeIds = collectHierarchyNodeIds(forest);

  let collapsedIds: Set<string>;
  let shouldPersistPrune = false;

  try {
    const stored = storage.readCollapsed();
    if (stored) {
      collapsedIds = pruneHierarchyCollapsedIds(stored, forestNodeIds);
      shouldPersistPrune = collapsedIds.size !== stored.size;
    } else if (storage.readLegacyExpanded) {
      const legacy = storage.readLegacyExpanded();
      if (legacy && legacy.size > 0) {
        collapsedIds = legacyExpandedToCollapsedIds(defaultExpandedIds, legacy);
        collapsedIds = pruneHierarchyCollapsedIds(collapsedIds, forestNodeIds);
        storage.writeCollapsed(collapsedIds);
        storage.clearLegacy?.();
      } else {
        collapsedIds = new Set();
      }
    } else {
      collapsedIds = new Set();
    }
  } catch {
    collapsedIds = new Set();
  }

  if (shouldPersistPrune) {
    storage.writeCollapsed(collapsedIds);
  }

  const extraExpandedIds = new Set<string>();
  const expandedIds = resolveHierarchyExpandedIds(
    defaultExpandedIds,
    collapsedIds,
    extraExpandedIds,
  );

  return { collapsedIds, extraExpandedIds, expandedIds };
}

/**
 * Reconcile expansion state when the forest changes (filter/search/category context).
 * Preserves in-session deep expansions for nodes still visible; prunes stale collapsed IDs.
 */
export function reconcileHierarchyExpansionOnForestChange(
  forest: HierarchyForestNode[],
  defaultExpandedIds: Set<string>,
  collapsedIds: Set<string>,
  extraExpandedIds: Set<string>,
): {
  collapsedIds: Set<string>;
  extraExpandedIds: Set<string>;
  expandedIds: Set<string>;
  collapsedPruned: boolean;
  extraExpandedPruned: boolean;
} {
  const forestNodeIds = collectHierarchyNodeIds(forest);
  const prunedCollapsed = pruneHierarchyCollapsedIds(collapsedIds, forestNodeIds);
  const prunedExtra = pruneHierarchyExtraExpandedIds(
    extraExpandedIds,
    forestNodeIds,
  );

  return {
    collapsedIds: prunedCollapsed,
    extraExpandedIds: prunedExtra,
    expandedIds: resolveHierarchyExpandedIds(
      defaultExpandedIds,
      prunedCollapsed,
      prunedExtra,
    ),
    collapsedPruned: prunedCollapsed.size !== collapsedIds.size,
    extraExpandedPruned: prunedExtra.size !== extraExpandedIds.size,
  };
}
