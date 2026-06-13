import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  loadHierarchyCollapseState,
  reconcileHierarchyExpansionOnForestChange,
  resolveHierarchyExpandedIds,
  toggleHierarchyExpansion,
  type HierarchyCollapseStorage,
  type HierarchyForestNode,
} from '@/lib/hierarchyExpansionState';

interface ExpansionDelta {
  collapsedIds: Set<string>;
  extraExpandedIds: Set<string>;
}

interface UseHierarchyExpansionStateOptions<T extends HierarchyForestNode> {
  forest: T[];
  campaignHandle: string;
  categoryPageId: string;
  defaultExpanded: (forest: T[]) => Set<string>;
  storage: {
    readCollapsed: (campaignHandle: string, categoryPageId: string) => Set<string> | null;
    writeCollapsed: (
      campaignHandle: string,
      categoryPageId: string,
      collapsedIds: Set<string>,
    ) => void;
    readLegacyExpanded: (
      campaignHandle: string,
      categoryPageId: string,
    ) => Set<string> | null;
    clearLegacy: (campaignHandle: string, categoryPageId: string) => void;
  };
}

const EMPTY_DELTA: ExpansionDelta = {
  collapsedIds: new Set(),
  extraExpandedIds: new Set(),
};

export function useHierarchyExpansionState<T extends HierarchyForestNode>({
  forest,
  campaignHandle,
  categoryPageId,
  defaultExpanded,
  storage,
}: UseHierarchyExpansionStateOptions<T>) {
  const defaultExpandedIds = useMemo(
    () => defaultExpanded(forest),
    [forest, defaultExpanded],
  );

  const [delta, setDelta] = useState<ExpansionDelta>(EMPTY_DELTA);

  const expandedIds = useMemo(
    () =>
      resolveHierarchyExpandedIds(
        defaultExpandedIds,
        delta.collapsedIds,
        delta.extraExpandedIds,
      ),
    [defaultExpandedIds, delta],
  );

  const contextKey = `${campaignHandle}:${categoryPageId}`;
  const prevContextKey = useRef<string | null>(null);

  const storageAdapter = useMemo<HierarchyCollapseStorage>(
    () => ({
      readCollapsed: () => storage.readCollapsed(campaignHandle, categoryPageId),
      writeCollapsed: (ids) =>
        storage.writeCollapsed(campaignHandle, categoryPageId, ids),
      readLegacyExpanded: () =>
        storage.readLegacyExpanded(campaignHandle, categoryPageId),
      clearLegacy: () => storage.clearLegacy(campaignHandle, categoryPageId),
    }),
    [storage, campaignHandle, categoryPageId],
  );

  useEffect(() => {
    const contextChanged = prevContextKey.current !== contextKey;
    prevContextKey.current = contextKey;

    if (contextChanged) {
      const loaded = loadHierarchyCollapseState(
        forest,
        defaultExpandedIds,
        storageAdapter,
      );
      setDelta({
        collapsedIds: loaded.collapsedIds,
        extraExpandedIds: new Set(),
      });
      return;
    }

    setDelta((prev) => {
      const reconciled = reconcileHierarchyExpansionOnForestChange(
        forest,
        defaultExpandedIds,
        prev.collapsedIds,
        prev.extraExpandedIds,
      );
      if (reconciled.collapsedPruned) {
        storage.writeCollapsed(
          campaignHandle,
          categoryPageId,
          reconciled.collapsedIds,
        );
      }
      return {
        collapsedIds: reconciled.collapsedIds,
        extraExpandedIds: reconciled.extraExpandedIds,
      };
    });
  }, [
    forest,
    defaultExpandedIds,
    contextKey,
    storageAdapter,
    campaignHandle,
    categoryPageId,
    storage,
  ]);

  const toggleExpanded = useCallback(
    (nodeId: string) => {
      setDelta((prev) => {
        const currentExpanded = resolveHierarchyExpandedIds(
          defaultExpandedIds,
          prev.collapsedIds,
          prev.extraExpandedIds,
        );
        const next = toggleHierarchyExpansion(
          nodeId,
          defaultExpandedIds,
          currentExpanded,
          prev.collapsedIds,
          prev.extraExpandedIds,
        );
        storage.writeCollapsed(campaignHandle, categoryPageId, next.collapsedIds);
        return {
          collapsedIds: next.collapsedIds,
          extraExpandedIds: next.extraExpandedIds,
        };
      });
    },
    [defaultExpandedIds, campaignHandle, categoryPageId, storage],
  );

  return { expandedIds, toggleExpanded };
}
