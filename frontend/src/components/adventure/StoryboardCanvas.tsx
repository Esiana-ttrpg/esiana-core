import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  type Node,
  type Edge,
  type Connection,
  type OnEdgesDelete,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import type { StoryboardProjection, StoryboardViewV1 } from '@/lib/sceneMetadata';
import type { SceneBeatType } from '@/lib/sceneMetadata';
import type { SceneHubNode } from '@/lib/adventure';
import type { DramaticTopologyFinding } from '@shared/dramaticTopology';
import type { StoryboardActiveMode } from '@shared/storyboardProjection';
import type { StoryboardProjectedEdge } from '@shared/storyboardEdgeDerivation';
import { EntityRelationKinds } from '@shared/entityGraph';
import { STORYBOARD_PRESETS } from '@shared/storyboardProjection';
import { patchStoryboardLayout } from '@/lib/adventure';
import { updateSceneMetadata } from '@/lib/wiki';
import { storyboardNodeTypes, storyboardNodeTypeForEntity } from '@/components/adventure/storyboard/storyboardNodeTypes';
import {
  StoryboardBeatFilter,
  nodeMatchesBeatFilter,
} from '@/components/adventure/StoryboardBeatFilter';
import { DramaticPacingPanel } from '@/components/adventure/DramaticPacingPanel';
import { StoryboardArcFilter } from '@/components/adventure/StoryboardArcFilter';
import { StoryboardModeToolbar } from '@/components/adventure/storyboard/StoryboardModeToolbar';
import { StoryboardLaneOverlay, snapNodeToLane } from '@/components/adventure/storyboard/StoryboardLaneOverlay';
import { STORYBOARD_LANE_HEIGHT } from '@/components/adventure/storyboard/storyboardLayoutConstants';
import {
  projectedEdgeToFlowEdge,
  storyboardEdgeTypes,
  type StoryboardEdgeData,
} from '@/components/adventure/storyboard/StoryboardProvenanceEdge';
import { StoryboardEdgeInspector } from '@/components/adventure/storyboard/StoryboardEdgeInspector';

interface StoryboardCanvasProps {
  campaignHandle: string;
  scenes: SceneHubNode[];
  storyboard: StoryboardProjection;
  arcFilterOptions?: Array<{ id: string; title: string }>;
  readOnly?: boolean;
  dramaticTopology?: DramaticTopologyFinding[];
  onLayoutSaved?: () => void;
  onSelectScene?: (sceneId: string) => void;
  selectedSceneId?: string | null;
}

function projectedNodeToFlowNode(
  node: StoryboardProjection['nodes'][number],
): Node {
  const nodeType = storyboardNodeTypeForEntity(node.entityType);
  const base = {
    id: node.entityId,
    position: { x: node.x, y: node.y },
    type: nodeType,
    data: {
      label: node.title,
      missing: node.missing,
      entityType: node.entityType,
      codexType: node.codexType,
      beatType: node.beatType,
      weight: node.narrativeWeight,
      status: node.sceneStatus,
      questStatus: node.questStatus,
      threadKind: node.threadKind,
      risks: node.continuityRiskCount,
      connectable: node.entityType === 'scene',
    },
  };
  return base;
}

function buildInitialNodes(
  scenes: SceneHubNode[],
  storyboard: StoryboardProjection,
): Node[] {
  const layoutNodes = storyboard.nodes;
  if (layoutNodes.length > 0) {
    return layoutNodes.map(projectedNodeToFlowNode);
  }
  return scenes.map((scene, index) => ({
    id: scene.id,
    position: { x: (index % 4) * 220, y: Math.floor(index / 4) * 140 },
    type: 'storyboardScene',
    data: {
      label: scene.title,
      beatType: scene.scene.beatType,
      weight: scene.scene.narrativeWeight,
      status: scene.scene.sceneStatus,
      risks: 0,
      connectable: true,
      entityType: 'scene',
    },
  }));
}

function buildInitialEdges(storyboard: StoryboardProjection): Edge[] {
  return storyboard.edges.map((e, i) => projectedEdgeToFlowEdge(e, i));
}

function nodesToLayoutPatch(
  nodes: Node[],
  baseLayout: StoryboardViewV1,
): StoryboardViewV1 {
  const existingById = new Map(baseLayout.nodes.map((n) => [n.entityId, n]));
  const layoutNodes = nodes.map((node) => {
    const existing = existingById.get(node.id);
    const data = node.data as { entityType?: string };
    return {
      entityType: (data.entityType ?? existing?.entityType ?? 'scene') as StoryboardViewV1['nodes'][0]['entityType'],
      entityId: node.id,
      x: node.position.x,
      y: node.position.y,
      laneId: existing?.laneId,
      collapsed: existing?.collapsed,
    };
  });
  return { ...baseLayout, nodes: layoutNodes };
}

export function StoryboardCanvas({
  campaignHandle,
  scenes,
  storyboard,
  arcFilterOptions = [],
  readOnly = false,
  dramaticTopology = [],
  onLayoutSaved,
  onSelectScene,
  selectedSceneId,
}: StoryboardCanvasProps) {
  const [nodes, setNodes, onNodesChange] = useNodesState(
    buildInitialNodes(scenes, storyboard),
  );
  const [edges, setEdges, onEdgesChange] = useEdgesState(buildInitialEdges(storyboard));
  const [selectedEdge, setSelectedEdge] = useState<StoryboardProjectedEdge | null>(null);
  const [hideCompleted, setHideCompleted] = useState(
    storyboard.layout.visibility.hideCompletedScenes ?? false,
  );
  const [beatFilter, setBeatFilter] = useState<SceneBeatType[]>(
    storyboard.layout.visibility.beatTypes ?? [],
  );
  const [arcFilter, setArcFilter] = useState<string[]>(
    storyboard.layout.visibility.collapseByArc ?? [],
  );
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const layoutRef = useRef(storyboard.layout);
  const scenesById = useMemo(() => new Map(scenes.map((s) => [s.id, s])), [scenes]);

  useEffect(() => {
    layoutRef.current = storyboard.layout;
    setNodes(buildInitialNodes(scenes, storyboard));
    setEdges(buildInitialEdges(storyboard));
    setHideCompleted(storyboard.layout.visibility.hideCompletedScenes ?? false);
    setBeatFilter(storyboard.layout.visibility.beatTypes ?? []);
    setArcFilter(storyboard.layout.visibility.collapseByArc ?? []);
    setSelectedEdge(null);
  }, [scenes, storyboard, setNodes, setEdges]);

  const persistLayout = useCallback(
    (patch: Partial<StoryboardViewV1>, nextNodes?: Node[]) => {
      if (readOnly) return;
      const merged: StoryboardViewV1 = {
        ...layoutRef.current,
        ...patch,
        visibility: {
          ...layoutRef.current.visibility,
          ...(patch.visibility ?? {}),
        },
      };
      layoutRef.current = merged;
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
      saveTimerRef.current = setTimeout(() => {
        const layoutPayload = nextNodes
          ? nodesToLayoutPatch(nextNodes, merged)
          : merged;
        void patchStoryboardLayout(campaignHandle, layoutPayload).then(() => onLayoutSaved?.());
      }, 400);
    },
    [campaignHandle, onLayoutSaved, readOnly],
  );

  const scheduleLayoutSave = useCallback(
    (nextNodes: Node[]) => {
      persistLayout({}, nextNodes);
    },
    [persistLayout],
  );

  const handleNodeDragStop = useCallback(
    (_event: MouseEvent | TouchEvent, node: Node) => {
      if (readOnly) return;
      setNodes((current) => {
        const snapped = snapNodeToLane(
          node.position.y,
          layoutRef.current.lanes,
          STORYBOARD_LANE_HEIGHT,
        );
        const updated = current.map((entry) =>
          entry.id === node.id
            ? {
                ...entry,
                position: { x: node.position.x, y: snapped.y },
              }
            : entry,
        );
        if (snapped.laneId) {
          const existingById = new Map(layoutRef.current.nodes.map((n) => [n.entityId, n]));
          const layoutNodes = updated.map((n) => {
            const existing = existingById.get(n.id);
            const data = n.data as { entityType?: string };
            return {
              entityType: (data.entityType ?? existing?.entityType ?? 'scene') as StoryboardViewV1['nodes'][0]['entityType'],
              entityId: n.id,
              x: n.position.x,
              y: n.position.y,
              laneId: n.id === node.id ? snapped.laneId : existing?.laneId,
              collapsed: existing?.collapsed,
            };
          });
          persistLayout({ nodes: layoutNodes }, updated);
        } else {
          scheduleLayoutSave(updated);
        }
        return updated;
      });
    },
    [readOnly, scheduleLayoutSave, persistLayout, setNodes],
  );

  const handleConnect = useCallback(
    (connection: Connection) => {
      if (readOnly || !connection.source || !connection.target) return;
      const sourceScene = scenesById.get(connection.source);
      if (!sourceScene) return;
      const follows = [...sourceScene.scene.followsScenePageIds];
      if (!follows.includes(connection.target)) {
        follows.push(connection.target);
      }
      void updateSceneMetadata(campaignHandle, connection.source, {
        followsScenePageIds: follows,
      }).then(() => onLayoutSaved?.());
    },
    [campaignHandle, onLayoutSaved, readOnly, scenesById],
  );

  const handleEdgesDelete: OnEdgesDelete = useCallback(
    (deletedEdges) => {
      if (readOnly) return;
      for (const edge of deletedEdges) {
        const data = edge.data as StoryboardEdgeData | undefined;
        if (!data?.editable || data.relationKind !== EntityRelationKinds.SCENE_FOLLOWS) {
          continue;
        }
        const sourceScene = scenesById.get(edge.source);
        if (!sourceScene) continue;
        const follows = sourceScene.scene.followsScenePageIds.filter(
          (id) => id !== edge.target,
        );
        void updateSceneMetadata(campaignHandle, edge.source, {
          followsScenePageIds: follows,
        }).then(() => onLayoutSaved?.());
      }
    },
    [campaignHandle, onLayoutSaved, readOnly, scenesById],
  );

  const handleBeatFilterChange = useCallback(
    (nextBeatTypes: SceneBeatType[]) => {
      setBeatFilter(nextBeatTypes);
      persistLayout({
        visibility: {
          ...layoutRef.current.visibility,
          beatTypes: nextBeatTypes.length > 0 ? nextBeatTypes : undefined,
        },
      });
    },
    [persistLayout],
  );

  const handleArcFilterChange = useCallback(
    (nextArcIds: string[]) => {
      setArcFilter(nextArcIds);
      persistLayout({
        visibility: {
          ...layoutRef.current.visibility,
          collapseByArc: nextArcIds.length > 0 ? nextArcIds : undefined,
        },
      });
      onLayoutSaved?.();
    },
    [onLayoutSaved, persistLayout],
  );

  const handleModeChange = useCallback(
    (mode: StoryboardActiveMode) => {
      persistLayout({ activeMode: mode });
      onLayoutSaved?.();
    },
    [onLayoutSaved, persistLayout],
  );

  const handleLaneCollapse = useCallback(
    (laneId: string) => {
      const lanes = layoutRef.current.lanes.map((lane) =>
        lane.id === laneId ? { ...lane, collapsed: !lane.collapsed } : lane,
      );
      persistLayout({ lanes });
      onLayoutSaved?.();
    },
    [onLayoutSaved, persistLayout],
  );

  const applyPreset = useCallback(
    (presetId: string) => {
      const preset = STORYBOARD_PRESETS.find((p) => p.id === presetId);
      if (!preset) return;
      persistLayout({
        lanes: preset.lanes,
        activeMode: preset.activeMode ?? layoutRef.current.activeMode,
      });
      onLayoutSaved?.();
    },
    [onLayoutSaved, persistLayout],
  );

  const visibleNodes = useMemo(
    () =>
      nodes
        .filter((n) => {
          const data = n.data as { status?: string; beatType?: string | null };
          if (hideCompleted && data.status === 'PLAYED') return false;
          return nodeMatchesBeatFilter(data.beatType, beatFilter);
        })
        .map((node) => ({
          ...node,
          selected: selectedSceneId === node.id,
        })),
    [nodes, hideCompleted, beatFilter, selectedSceneId],
  );

  const visibleEdges = useMemo(() => {
    const visibleIds = new Set(visibleNodes.map((n) => n.id));
    return edges.filter((e) => visibleIds.has(e.source) && visibleIds.has(e.target));
  }, [edges, visibleNodes]);

  const canvasMinHeight =
    storyboard.layout.lanes.length > 0
      ? storyboard.layout.lanes.length * STORYBOARD_LANE_HEIGHT
      : 420;

  return (
    <div className="flex h-full min-h-[420px] flex-col gap-2">
      {!readOnly && dramaticTopology.length > 0 ? (
        <DramaticPacingPanel findings={dramaticTopology} />
      ) : null}
      <StoryboardModeToolbar
        activeMode={storyboard.layout.activeMode}
        modeLegend={storyboard.modeLegend}
        readOnly={readOnly}
        onChange={handleModeChange}
      />
      <div className="flex flex-wrap items-start gap-4 text-xs text-muted-foreground">
        <label className="flex items-center gap-1.5 pt-1">
          <input
            type="checkbox"
            checked={hideCompleted}
            onChange={(e) => {
              const checked = e.target.checked;
              setHideCompleted(checked);
              persistLayout({
                visibility: {
                  ...layoutRef.current.visibility,
                  hideCompletedScenes: checked || undefined,
                },
              });
            }}
          />
          Hide completed scenes
        </label>
        {storyboard.layout.lanes.length > 0 ? (
          <span className="pt-1">
            {storyboard.layout.lanes.length} act lane
            {storyboard.layout.lanes.length === 1 ? '' : 's'}
          </span>
        ) : null}
        {!readOnly ? (
          <div className="flex flex-wrap gap-1 pt-0.5">
            {STORYBOARD_PRESETS.map((preset) => (
              <button
                key={preset.id}
                type="button"
                className="rounded border border-border px-2 py-0.5 text-[10px] hover:bg-muted"
                onClick={() => applyPreset(preset.id)}
              >
                {preset.label}
              </button>
            ))}
          </div>
        ) : null}
      </div>
      <StoryboardBeatFilter
        selectedBeatTypes={beatFilter}
        readOnly={readOnly}
        onChange={handleBeatFilterChange}
      />
      <StoryboardArcFilter
        arcOptions={arcFilterOptions}
        selectedArcIds={arcFilter}
        readOnly={readOnly}
        onChange={handleArcFilterChange}
      />
      <div
        className="relative min-h-0 flex-1 rounded-md border border-border bg-muted/20"
        style={{ minHeight: canvasMinHeight }}
      >
        <StoryboardLaneOverlay
          lanes={storyboard.layout.lanes}
          laneHeight={STORYBOARD_LANE_HEIGHT}
          readOnly={readOnly}
          onToggleCollapse={handleLaneCollapse}
        />
        <ReactFlow
          nodes={visibleNodes}
          edges={visibleEdges}
          nodeTypes={storyboardNodeTypes}
          edgeTypes={storyboardEdgeTypes}
          onNodesChange={readOnly ? undefined : onNodesChange}
          onNodeDragStop={readOnly ? undefined : handleNodeDragStop}
          onEdgesChange={readOnly ? undefined : onEdgesChange}
          onConnect={readOnly ? undefined : handleConnect}
          onEdgesDelete={readOnly ? undefined : handleEdgesDelete}
          onEdgeClick={(_event, edge) => {
            const data = edge.data as StoryboardEdgeData | undefined;
            setSelectedEdge(data ?? null);
          }}
          onNodeClick={(_event, node) => {
            const data = node.data as { entityType?: string };
            if (data.entityType === 'scene' || scenesById.has(node.id)) {
              onSelectScene?.(node.id);
            }
          }}
          fitView
          nodesDraggable={!readOnly}
          nodesConnectable={!readOnly}
          edgesFocusable
          proOptions={{ hideAttribution: true }}
          className="z-10"
        >
          <Background />
          <Controls />
          <MiniMap />
        </ReactFlow>
      </div>
      <StoryboardEdgeInspector
        edge={selectedEdge}
        campaignHandle={campaignHandle}
        sourceTitle={
          selectedEdge
            ? (nodes.find((n) => n.id === selectedEdge.sourceId)?.data as { label?: string })
                ?.label
            : undefined
        }
      />
      <p className="text-[10px] text-muted-foreground/70">
        Drag moves layout only. Scene sequence edges edit followsScenePageIds on the source scene.
        Hover edges for relation kind; click for provenance.
      </p>
    </div>
  );
}
