import { useMemo } from 'react';
import { ChevronDown, ChevronRight, FileText } from 'lucide-react';
import { Link } from 'react-router-dom';
import { campaignCategoryChildPath } from '@/lib/campaignPaths';
import { useWiki } from '@/contexts/WikiContext';
import {
  buildCodexHierarchyForest,
  defaultExpandedHierarchyIds,
  flattenCodexHierarchy,
  hasHierarchyRelationships,
  type CodexHierarchyNode,
} from '@/lib/codexHierarchy';
import {
  clearCodexHierarchyExpandedIdsLegacy,
  readCodexHierarchyCollapsedIds,
  readCodexHierarchyExpandedIdsLegacy,
  writeCodexHierarchyCollapsedIds,
} from '@/lib/categoryIndexBrowseStorage';
import { useHierarchyExpansionState } from '@/hooks/useHierarchyExpansionState';
import type { CategoryIndexChild } from '@/lib/wiki';
import { getDisplayMetadata } from '@/lib/wikiMetadata';

const codexExpansionStorage = {
  readCollapsed: readCodexHierarchyCollapsedIds,
  writeCollapsed: writeCodexHierarchyCollapsedIds,
  readLegacyExpanded: readCodexHierarchyExpandedIdsLegacy,
  clearLegacy: clearCodexHierarchyExpandedIdsLegacy,
};

interface CodexHierarchyViewProps {
  filteredChildren: CategoryIndexChild[];
  allChildren: CategoryIndexChild[];
  categoryPageId: string;
  categoryTitle: string;
  campaignHandle: string;
}

export function CodexHierarchyView({
  filteredChildren,
  allChildren,
  categoryPageId,
  categoryTitle,
  campaignHandle,
}: CodexHierarchyViewProps) {
  const { flatPages } = useWiki();
  const allById = useMemo(
    () => new Map(allChildren.map((c) => [c.id, c])),
    [allChildren],
  );

  const forest = useMemo(
    () =>
      buildCodexHierarchyForest(filteredChildren, categoryPageId, {
        allChildren,
      }),
    [filteredChildren, categoryPageId, allChildren],
  );

  const { expandedIds, toggleExpanded } = useHierarchyExpansionState({
    forest,
    campaignHandle,
    categoryPageId,
    defaultExpanded: defaultExpandedHierarchyIds,
    storage: codexExpansionStorage,
  });

  const rows = useMemo(
    () =>
      flattenCodexHierarchy(
        forest,
        expandedIds,
        allById,
        categoryPageId,
      ),
    [forest, expandedIds, allById, categoryPageId],
  );

  const showHierarchyHint = !hasHierarchyRelationships(
    filteredChildren,
    categoryPageId,
  );

  if (filteredChildren.length === 0) return null;

  if (showHierarchyHint && forest.every((n) => n.children.length === 0)) {
    return (
      <div className="rounded-xl border border-dashed border-border bg-surface/40 px-6 py-12 text-center">
        <p className="text-muted">
          No parent-child structure in this selection.
        </p>
        <p className="mt-2 text-sm text-muted">
          Switch to Table or Cards to browse flat entries.
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-lg border border-border bg-surface/30">
      <ul className="divide-y divide-border">
        {rows.map(({ node, depth, hasChildren, parentTrailLabel }) => (
          <CodexHierarchyRow
            key={node.id}
            node={node}
            depth={depth}
            hasChildren={hasChildren}
            parentTrailLabel={parentTrailLabel}
            expanded={expandedIds.has(node.id)}
            onToggle={() => toggleExpanded(node.id)}
            categoryTitle={categoryTitle}
            campaignHandle={campaignHandle}
            flatPages={flatPages}
          />
        ))}
      </ul>
    </div>
  );
}

interface CodexHierarchyRowProps {
  node: CodexHierarchyNode;
  depth: number;
  hasChildren: boolean;
  parentTrailLabel: string | null;
  expanded: boolean;
  onToggle: () => void;
  categoryTitle: string;
  campaignHandle: string;
  flatPages: ReturnType<typeof useWiki>['flatPages'];
}

function CodexHierarchyRow({
  node,
  depth,
  hasChildren,
  parentTrailLabel,
  expanded,
  onToggle,
  categoryTitle,
  campaignHandle,
  flatPages,
}: CodexHierarchyRowProps) {
  const displayMetadata = getDisplayMetadata(node.child.metadata, categoryTitle);
  const primaryMeta = displayMetadata[0];

  return (
    <li
      className="flex items-start gap-2 px-3 py-2.5 transition-colors hover:bg-elevated/40"
      style={{ paddingLeft: `${12 + depth * 20}px` }}
    >
      <button
        type="button"
        onClick={onToggle}
        className={`mt-0.5 shrink-0 rounded p-0.5 text-muted hover:text-foreground ${
          hasChildren ? 'visible' : 'invisible'
        }`}
        aria-label={expanded ? 'Collapse' : 'Expand'}
        disabled={!hasChildren}
      >
        {expanded ? (
          <ChevronDown className="size-4" />
        ) : (
          <ChevronRight className="size-4" />
        )}
      </button>
      <div className="min-w-0 flex-1">
        <Link
          to={campaignCategoryChildPath(
            campaignHandle,
            node.child.id,
            categoryTitle,
            flatPages,
          )}
          className="flex items-center gap-2 text-sm font-medium text-primary hover:underline"
        >
          <FileText className="size-4 shrink-0 text-primary/70" />
          {node.title}
        </Link>
        {parentTrailLabel && (
          <p className="mt-0.5 pl-6 text-xs text-muted">{parentTrailLabel}</p>
        )}
        {primaryMeta && (
          <p className="mt-0.5 pl-6 text-xs text-muted">
            {primaryMeta.key}: {primaryMeta.value}
          </p>
        )}
      </div>
    </li>
  );
}
