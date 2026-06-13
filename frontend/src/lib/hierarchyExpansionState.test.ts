import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import type { CodexHierarchyNode } from './codexHierarchy.ts';
import {
  collectHierarchyNodeIds,
  legacyExpandedToCollapsedIds,
  loadHierarchyCollapseState,
  pruneHierarchyCollapsedIds,
  reconcileHierarchyExpansionOnForestChange,
  resolveHierarchyExpandedIds,
  toggleHierarchyExpansion,
} from './hierarchyExpansionState.ts';

function node(id: string, children: CodexHierarchyNode[] = []): CodexHierarchyNode {
  return {
    id,
    title: id,
    child: {
      id,
      title: id,
      parentId: null,
      visibility: 'Party',
      updatedAt: '',
      snippet: '',
    },
    children,
  };
}

describe('hierarchyExpansionState', () => {
  const forest = [
    node('root-a', [node('child-a1', [node('grand-a1')]), node('child-a2')]),
    node('root-b'),
  ];
  const defaultExpanded = new Set(['root-a', 'child-a1', 'child-a2', 'root-b']);
  const forestNodeIds = collectHierarchyNodeIds(forest);

  it('resolveHierarchyExpandedIds applies collapse delta to defaults', () => {
    const expanded = resolveHierarchyExpandedIds(
      defaultExpanded,
      new Set(['root-a']),
      new Set(['grand-a1']),
    );
    assert.equal(expanded.has('root-a'), false);
    assert.equal(expanded.has('child-a1'), true);
    assert.equal(expanded.has('grand-a1'), true);
  });

  it('toggleHierarchyExpansion tracks collapses and deep expansions separately', () => {
    const collapsed = new Set<string>();
    const extra = new Set<string>();
    const expanded = resolveHierarchyExpandedIds(defaultExpanded, collapsed, extra);

    const collapseRoot = toggleHierarchyExpansion(
      'root-a',
      defaultExpanded,
      expanded,
      collapsed,
      extra,
    );
    assert.equal(collapseRoot.collapsedIds.has('root-a'), true);
    assert.equal(collapseRoot.expandedIds.has('root-a'), false);

    const expandDeep = toggleHierarchyExpansion(
      'grand-a1',
      defaultExpanded,
      collapseRoot.expandedIds,
      collapseRoot.collapsedIds,
      collapseRoot.extraExpandedIds,
    );
    assert.equal(expandDeep.extraExpandedIds.has('grand-a1'), true);
    assert.equal(expandDeep.collapsedIds.has('root-a'), true);
  });

  it('legacyExpandedToCollapsedIds converts full expanded snapshot', () => {
    const legacy = new Set(['root-a', 'child-a1', 'root-b']);
    const collapsed = legacyExpandedToCollapsedIds(defaultExpanded, legacy);
    assert.deepEqual([...collapsed].sort(), ['child-a2']);
  });

  it('pruneHierarchyCollapsedIds tolerates missing IDs silently', () => {
    const pruned = pruneHierarchyCollapsedIds(
      new Set(['root-a', 'removed-node']),
      forestNodeIds,
    );
    assert.deepEqual([...pruned], ['root-a']);
  });

  it('reconcileHierarchyExpansionOnForestChange prunes stale collapsed IDs', () => {
    const reconciled = reconcileHierarchyExpansionOnForestChange(
      forest,
      defaultExpanded,
      new Set(['root-a', 'removed-node']),
      new Set(['grand-a1', 'removed-node']),
    );
    assert.equal(reconciled.collapsedPruned, true);
    assert.equal(reconciled.extraExpandedPruned, true);
    assert.deepEqual([...reconciled.collapsedIds], ['root-a']);
    assert.deepEqual([...reconciled.extraExpandedIds], ['grand-a1']);
  });

  it('loadHierarchyCollapseState never throws on corrupt storage', () => {
    const loaded = loadHierarchyCollapseState(forest, defaultExpanded, {
      readCollapsed: () => {
        throw new Error('corrupt');
      },
      writeCollapsed: () => undefined,
    });
    assert.equal(loaded.collapsedIds.size, 0);
    assert.equal(loaded.expandedIds.size, defaultExpanded.size);
  });

  it('loadHierarchyCollapseState migrates legacy expanded snapshot', () => {
    let written: Set<string> | null = null;
    const loaded = loadHierarchyCollapseState(forest, defaultExpanded, {
      readCollapsed: () => null,
      readLegacyExpanded: () => new Set(['root-a', 'child-a1', 'root-b']),
      writeCollapsed: (ids) => {
        written = ids;
      },
      clearLegacy: () => undefined,
    });
    assert.deepEqual([...loaded.collapsedIds].sort(), ['child-a2']);
    assert.deepEqual([...written!].sort(), ['child-a2']);
  });
});
