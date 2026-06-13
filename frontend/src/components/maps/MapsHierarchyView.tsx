import { useMemo } from 'react';
import { ChevronDown, ChevronRight, Map } from 'lucide-react';
import { Link } from 'react-router-dom';
import { campaignPath } from '@/lib/campaignPaths';
import {
  buildMapHierarchyForest,
  defaultMapHierarchyExpandedIds,
  flattenMapHierarchy,
  type MapHierarchyNode,
} from '@/lib/mapsBrowse';
import {
  clearMapsHierarchyExpandedIdsLegacy,
  readMapsHierarchyCollapsedIds,
  readMapsHierarchyExpandedIdsLegacy,
  writeMapsHierarchyCollapsedIds,
} from '@/lib/categoryIndexBrowseStorage';
import { useHierarchyExpansionState } from '@/hooks/useHierarchyExpansionState';
import { ElevatedBrowseVisibilityChip } from '@/components/narrative/VisibilityTierChip';

const mapsExpansionStorage = {
  readCollapsed: readMapsHierarchyCollapsedIds,
  writeCollapsed: writeMapsHierarchyCollapsedIds,
  readLegacyExpanded: readMapsHierarchyExpandedIdsLegacy,
  clearLegacy: clearMapsHierarchyExpandedIdsLegacy,
};

interface MapsHierarchyViewProps {
  filteredMaps: import('@/types/maps').CampaignMapAsset[];
  allMaps: import('@/types/maps').CampaignMapAsset[];
  campaignHandle: string;
  categoryPageId: string;
  canManage?: boolean;
}

export function MapsHierarchyView({
  filteredMaps,
  allMaps,
  campaignHandle,
  categoryPageId,
  canManage = false,
}: MapsHierarchyViewProps) {
  const forest = useMemo(
    () => buildMapHierarchyForest(filteredMaps),
    [filteredMaps],
  );

  const { expandedIds, toggleExpanded } = useHierarchyExpansionState({
    forest,
    campaignHandle,
    categoryPageId,
    defaultExpanded: defaultMapHierarchyExpandedIds,
    storage: mapsExpansionStorage,
  });

  const rows = useMemo(
    () => flattenMapHierarchy(forest, expandedIds, allMaps),
    [forest, expandedIds, allMaps],
  );

  if (filteredMaps.length === 0) return null;

  return (
    <div className="overflow-hidden rounded-lg border border-border bg-surface/30">
      <ul className="divide-y divide-border">
        {rows.map(({ node, depth, hasChildren, parentTrailLabel }) => (
          <MapHierarchyRow
            key={node.id}
            node={node}
            depth={depth}
            hasChildren={hasChildren}
            parentTrailLabel={parentTrailLabel}
            expanded={expandedIds.has(node.id)}
            onToggle={() => toggleExpanded(node.id)}
            campaignHandle={campaignHandle}
            canManage={canManage}
          />
        ))}
      </ul>
    </div>
  );
}

function MapHierarchyRow({
  node,
  depth,
  hasChildren,
  parentTrailLabel,
  expanded,
  onToggle,
  campaignHandle,
  canManage,
}: {
  node: MapHierarchyNode;
  depth: number;
  hasChildren: boolean;
  parentTrailLabel: string | null;
  expanded: boolean;
  onToggle: () => void;
  campaignHandle: string;
  canManage: boolean;
}) {
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
        <div className="flex flex-wrap items-center gap-1.5">
          <Link
            to={campaignPath(campaignHandle, 'maps', node.map.id)}
            className="flex items-center gap-2 text-sm font-medium text-primary hover:underline"
          >
            <Map className="size-4 shrink-0 text-primary/70" />
            {node.title}
          </Link>
          <ElevatedBrowseVisibilityChip
            pageVisibility={node.map.visibility}
            showWhenElevated={canManage}
            compact
          />
        </div>
        {parentTrailLabel && (
          <p className="mt-0.5 pl-6 text-xs text-muted">{parentTrailLabel}</p>
        )}
      </div>
    </li>
  );
}
