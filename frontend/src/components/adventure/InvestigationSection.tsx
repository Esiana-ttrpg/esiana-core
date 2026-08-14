import { useCallback, useMemo, useState, useEffect, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { ExternalLink, GitBranch, AlertTriangle } from 'lucide-react';
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  type Node,
  type Edge,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import type { AdventureHubPayload } from '@/lib/adventure';
import { campaignWikiPath, campaignWorkspaceIndexPath } from '@/lib/campaignPaths';
import { useWiki } from '@/contexts/WikiContext';
import { InvestigationDependencyMatrix } from '@/components/adventure/InvestigationDependencyMatrix';
import { CreateThreadModal } from '@/components/thread/CreateThreadModal';
import { CategoryIndexToolbar } from '@/components/wiki/indexBrowse/CategoryIndexToolbar';

interface InvestigationSectionProps {
  campaignHandle: string;
  data: AdventureHubPayload['investigation'];
  threadsCategoryId?: string | null;
  embedded?: boolean;
  onHeaderActionsChange?: (actions: ReactNode | null) => void;
}

type InvestigationTab = 'matrix' | 'topology';

function buildTopologyGraph(
  nodes: NonNullable<AdventureHubPayload['investigation']>['nodes'],
  edges: NonNullable<AdventureHubPayload['investigation']>['edges'],
): { flowNodes: Node[]; flowEdges: Edge[] } {
  const flowNodes: Node[] = (nodes ?? []).map((node, index) => ({
    id: node.id,
    position: { x: (index % 5) * 180, y: Math.floor(index / 5) * 100 },
    data: { label: node.title, kind: node.kind },
    style: {
      fontSize: 11,
      padding: 8,
      borderRadius: 6,
      border:
        node.kind === 'clue' && !node.reachable
          ? '1px solid rgb(245 158 11 / 0.6)'
          : '1px solid rgb(63 63 70)',
      background: node.reachable ? 'rgb(16 185 129 / 0.08)' : 'rgb(39 39 42)',
      opacity: node.reachable ? 1 : 0.75,
    },
  }));

  const flowEdges: Edge[] = (edges ?? []).map((edge, i) => ({
    id: `inv-${i}-${edge.sourceId}-${edge.targetId}`,
    source: edge.sourceId,
    target: edge.targetId,
    style:
      edge.edgeKind === 'spof_risk'
        ? { stroke: '#ef4444', strokeWidth: 2 }
        : { stroke: '#71717a' },
    animated: edge.edgeKind === 'spof_risk',
  }));

  return { flowNodes, flowEdges };
}

function InvestigationTopologyView({
  campaignHandle,
  data,
}: {
  campaignHandle: string;
  data: NonNullable<AdventureHubPayload['investigation']>;
}) {
  const { flatPages } = useWiki();
  const spofClueIds = useMemo(() => {
    const ids = new Set<string>();
    for (const edge of data.edges) {
      if (edge.edgeKind === 'spof_risk') ids.add(edge.sourceId);
    }
    return ids;
  }, [data.edges]);

  const { flowNodes, flowEdges } = useMemo(
    () => buildTopologyGraph(data.nodes, data.edges),
    [data.nodes, data.edges],
  );

  if (data.nodes.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        No investigation nodes yet. Add clue-kind threads in Threads Hub to populate this view.
      </p>
    );
  }

  return (
    <>
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {data.nodes.map((node) => {
          const isSpof = node.kind === 'clue' && spofClueIds.has(node.id);
          return (
            <Link
              key={node.id}
              to={campaignWikiPath(campaignHandle, node.id, flatPages)}
              className={`block rounded border p-3 text-sm transition-colors hover:border-primary/40 ${
                isSpof
                  ? 'border-red-500/50 bg-red-500/5'
                  : node.reachable
                    ? 'border-emerald-500/40 bg-emerald-500/5'
                    : 'border-amber-500/40 bg-amber-500/5 opacity-90'
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 font-medium">{node.title}</div>
                {isSpof ? (
                  <AlertTriangle
                    className="size-3.5 shrink-0 text-red-400"
                    aria-label="Single point of failure"
                  />
                ) : null}
              </div>
              <div className="mt-1 text-xs capitalize text-muted-foreground">{node.kind}</div>
              {node.pressureAccumulating ? (
                <div className="mt-1 text-[10px] text-amber-400">Pressure accumulating</div>
              ) : null}
              {!node.reachable && !isSpof ? (
                <div className="mt-1 text-[10px] text-muted-foreground">Not yet party-visible</div>
              ) : null}
            </Link>
          );
        })}
      </div>

      {flowNodes.length > 0 ? (
        <div className="mt-4 h-[320px] overflow-hidden rounded-lg border border-border">
          <ReactFlow
            nodes={flowNodes}
            edges={flowEdges}
            fitView
            nodesDraggable={false}
            nodesConnectable={false}
            elementsSelectable={false}
            panOnDrag
            zoomOnScroll
            proOptions={{ hideAttribution: true }}
          >
            <Background gap={16} size={1} />
            <Controls showInteractive={false} />
            <MiniMap pannable zoomable nodeStrokeWidth={2} />
          </ReactFlow>
        </div>
      ) : null}

      <p className="mt-3 text-xs text-muted-foreground">
        {data.edges.length} lead connection{data.edges.length === 1 ? '' : 's'} · red edges
        indicate single-point-of-failure risk
      </p>
    </>
  );
}

export function InvestigationSection({
  campaignHandle,
  data,
  threadsCategoryId,
  embedded = false,
  onHeaderActionsChange,
}: InvestigationSectionProps) {
  const { flatPages, refresh } = useWiki();
  const [activeTab, setActiveTab] = useState<InvestigationTab>('matrix');
  const [searchQuery, setSearchQuery] = useState('');
  const [spofOnly, setSpofOnly] = useState(false);
  const [unreachableOnly, setUnreachableOnly] = useState(false);
  const [isCreateOpen, setIsCreateOpen] = useState(false);

  const openCreate = useCallback(() => setIsCreateOpen(true), []);

  const headerToolbar = useMemo(
    () => (
      <CategoryIndexToolbar
        createLabel="New thread"
        onCreate={openCreate}
      />
    ),
    [openCreate],
  );

  useEffect(() => {
    if (!embedded || !onHeaderActionsChange || !threadsCategoryId) return;
    onHeaderActionsChange(headerToolbar);
    return () => onHeaderActionsChange(null);
  }, [embedded, onHeaderActionsChange, threadsCategoryId, headerToolbar]);

  if (!data) {
    return <p className="text-sm text-muted-foreground">Loading investigation topology…</p>;
  }

  const threadsHubPath = campaignWorkspaceIndexPath(campaignHandle, 'threads');

  return (
    <div className="space-y-6">
      {!embedded ? (
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold">Investigation</h2>
            <p className="text-sm text-muted-foreground">
              Clue & lead dependency ledger — edit threads and scenes in their hubs.
            </p>
          </div>
          {threadsHubPath ? (
            <Link
              to={threadsHubPath}
            className="inline-flex items-center gap-1.5 rounded-md border border-border px-3 py-1.5 text-xs text-muted-foreground transition-colors hover:border-amber-500/40 hover:text-foreground"
          >
            <GitBranch className="size-3.5 text-amber-400" />
            Open Threads Hub
            <ExternalLink className="size-3" />
          </Link>
        ) : null}
        </div>
      ) : null}

      <div className="flex flex-wrap items-center gap-2 border-b border-border pb-3">
        <button
          type="button"
          onClick={() => setActiveTab('matrix')}
          className={`rounded px-3 py-1.5 text-sm ${
            activeTab === 'matrix'
              ? 'bg-primary/15 font-medium text-primary'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          Dependency matrix
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('topology')}
          className={`rounded px-3 py-1.5 text-sm ${
            activeTab === 'topology'
              ? 'bg-primary/15 font-medium text-primary'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          Topology
        </button>

        {activeTab === 'matrix' ? (
          <div className="ml-auto flex flex-wrap items-center gap-2">
            <input
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search rows…"
              className="rounded border border-border bg-surface px-2 py-1 text-xs"
            />
            <label className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
              <input
                type="checkbox"
                checked={spofOnly}
                onChange={(e) => setSpofOnly(e.target.checked)}
              />
              SPOF only
            </label>
            <label className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
              <input
                type="checkbox"
                checked={unreachableOnly}
                onChange={(e) => setUnreachableOnly(e.target.checked)}
              />
              Unreachable only
            </label>
          </div>
        ) : null}
      </div>

      {activeTab === 'matrix' ? (
        <InvestigationDependencyMatrix
          campaignHandle={campaignHandle}
          ledger={data.ledger}
          searchQuery={searchQuery}
          spofOnly={spofOnly}
          unreachableOnly={unreachableOnly}
        />
      ) : (
        <InvestigationTopologyView campaignHandle={campaignHandle} data={data} />
      )}

      {threadsCategoryId ? (
        <CreateThreadModal
          open={isCreateOpen}
          campaignHandle={campaignHandle}
          flatPages={flatPages}
          context={{ launchSurface: 'hub' }}
          onClose={() => setIsCreateOpen(false)}
          onCreated={() => {
            setIsCreateOpen(false);
            void refresh();
          }}
        />
      ) : null}
    </div>
  );
}
