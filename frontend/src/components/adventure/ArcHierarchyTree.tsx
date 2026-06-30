import { META_SECTION_LABEL_CLASS } from '@/lib/surfaceLayout';
import { useCallback, useState } from 'react';
import { Link } from 'react-router-dom';
import type {
  ArcHierarchyNode,
  ArcHierarchyProjection,
  ArcHierarchySceneSlice,
} from '@/lib/arcMetadata';
import { campaignWikiPath } from '@/lib/campaignPaths';
import { useWiki } from '@/contexts/WikiContext';
import { NarrativeProgressChip } from '@/components/adventure/NarrativeProgressChip';

const KIND_LABELS: Record<string, string> = {
  campaign_arc: 'Arc',
  questline: 'Questline',
  quest: 'Quest',
  objective: 'Objective',
  scene_ref: 'Scene',
};

interface ArcHierarchyTreeProps {
  campaignHandle: string;
  projection: ArcHierarchyProjection;
}

function SceneRefRow({
  campaignHandle,
  node,
  scenesById,
  sceneObjectiveCounts,
  pageHref,
}: {
  campaignHandle: string;
  node: ArcHierarchyNode;
  scenesById: Record<string, ArcHierarchySceneSlice>;
  sceneObjectiveCounts: Record<string, number>;
  pageHref: (pageId: string) => string;
}) {
  const slice = scenesById[node.id];
  if (!slice) return null;
  const multi = (sceneObjectiveCounts[node.id] ?? 0) > 1;
  return (
    <Link
      to={pageHref(node.id)}
      className="flex items-center gap-2 rounded px-2 py-1 text-sm hover:bg-muted"
    >
      <span className="rounded bg-muted/50 px-1.5 py-0.5 text-[10px] uppercase tracking-wide text-muted-foreground">
        Scene
      </span>
      <span>{slice.title}</span>
      <span className="text-[10px] text-muted-foreground">{slice.sceneStatus}</span>
      {multi ? (
        <span className="text-[10px] text-muted-foreground">· advances multiple objectives</span>
      ) : null}
    </Link>
  );
}

function TreeNode({
  campaignHandle,
  node,
  depth,
  expanded,
  toggle,
  scenesById,
  sceneObjectiveCounts,
  pageHref,
}: {
  campaignHandle: string;
  node: ArcHierarchyNode;
  depth: number;
  expanded: Set<string>;
  toggle: (id: string) => void;
  scenesById: Record<string, ArcHierarchySceneSlice>;
  sceneObjectiveCounts: Record<string, number>;
  pageHref: (pageId: string) => string;
}) {
  const hasChildren = node.children.length > 0;
  const isOpen = expanded.has(node.id);

  if (node.kind === 'scene_ref') {
    return (
      <div style={{ paddingLeft: depth * 12 }}>
        <SceneRefRow
          campaignHandle={campaignHandle}
          node={node}
          scenesById={scenesById}
          sceneObjectiveCounts={sceneObjectiveCounts}
          pageHref={pageHref}
        />
      </div>
    );
  }

  return (
    <div>
      <div
        className="flex items-center gap-2 rounded px-2 py-1 hover:bg-muted/50"
        style={{ paddingLeft: depth * 12 }}
      >
        {hasChildren ? (
          <button
            type="button"
            className="w-4 text-xs text-muted-foreground"
            onClick={() => toggle(node.id)}
            aria-expanded={isOpen}
          >
            {isOpen ? '▾' : '▸'}
          </button>
        ) : (
          <span className="w-4" />
        )}
        <span className="rounded bg-muted/40 px-1.5 py-0.5 text-[10px] uppercase tracking-wide text-muted-foreground">
          {KIND_LABELS[node.kind] ?? node.kind}
        </span>
        <Link
          to={pageHref(node.id)}
          className="text-sm font-medium hover:underline"
        >
          {node.title}
        </Link>
        {node.questStatus ? (
          <span className="text-[10px] text-muted-foreground">{node.questStatus}</span>
        ) : null}
        {node.objectiveStatus ? (
          <span className="text-[10px] text-muted-foreground">{node.objectiveStatus}</span>
        ) : null}
        {node.arc?.actIndex != null ? (
          <span className="text-[10px] text-muted-foreground">Act {node.arc.actIndex + 1}</span>
        ) : null}
        <NarrativeProgressChip node={node} />
      </div>
      {hasChildren && isOpen ? (
        <div>
          {node.children.map((child) => (
            <TreeNode
              key={`${child.kind}-${child.id}`}
              campaignHandle={campaignHandle}
              node={child}
              depth={depth + 1}
              expanded={expanded}
              toggle={toggle}
              scenesById={scenesById}
              sceneObjectiveCounts={sceneObjectiveCounts}
              pageHref={pageHref}
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}

export function ArcHierarchyTree({ campaignHandle, projection }: ArcHierarchyTreeProps) {
  const { flatPages } = useWiki();
  const pageHref = useCallback(
    (pageId: string) => campaignWikiPath(campaignHandle, pageId, flatPages),
    [campaignHandle, flatPages],
  );
  const [expanded, setExpanded] = useState<Set<string>>(() => new Set(projection.roots.map((r) => r.id)));
  const toggle = useCallback((id: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  if (projection.roots.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        No campaign arcs yet. Add arc overlay metadata to quest folder pages under Adventure.
      </p>
    );
  }

  return (
    <div className="space-y-1">
      {projection.roots.map((root) => (
        <TreeNode
          key={root.id}
          campaignHandle={campaignHandle}
          node={root}
          depth={0}
          expanded={expanded}
          toggle={toggle}
          scenesById={projection.scenesById}
          sceneObjectiveCounts={projection.sceneObjectiveCounts}
          pageHref={pageHref}
        />
      ))}
      {projection.orphans.quests.length > 0 ? (
        <div className="mt-4 rounded border border-dashed border-border p-2">
          <p className="mb-1 META_SECTION_LABEL_CLASS-foreground">
            Quests outside arc overlays
          </p>
          <ul className="space-y-0.5">
            {projection.orphans.quests.map((entry) => (
              <li key={entry.id}>
                <Link
                  to={pageHref(entry.id)}
                  className="text-sm text-muted-foreground hover:underline"
                >
                  {entry.title}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
      {projection.warnings.length > 0 ? (
        <div className="mt-4 rounded border border-amber-600/30 bg-amber-950/10 p-2 text-xs text-muted-foreground">
          <p className="mb-1 font-medium">Projection notes</p>
          <ul className="list-disc pl-4">
            {projection.warnings.slice(0, 5).map((w, i) => (
              <li key={i}>{w.message}</li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
