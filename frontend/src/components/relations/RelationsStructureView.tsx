import { useMemo } from 'react';
import {
  Background,
  Controls,
  ReactFlow,
  type NodeProps,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import type { StructureRelationsRenderModel } from '@shared/relationshipLensProjections';
import { layoutStructureHierarchy } from '@/lib/relationshipLensRenderers';

interface RelationsStructureViewProps {
  model: StructureRelationsRenderModel;
  onSelectNode: (id: string, title: string) => void;
}

function StructureNodeCard({ data, id }: NodeProps) {
  const label = typeof data.label === 'string' ? data.label : id;
  const role = typeof data.role === 'string' ? data.role : null;
  return (
    <div className="rounded-md border border-border bg-surface/80 px-2 py-1.5 text-center shadow-sm">
      <p className="truncate text-xs font-medium text-foreground">{label}</p>
      {role ? <p className="truncate text-[10px] text-muted">{role}</p> : null}
    </div>
  );
}

const nodeTypes = { structure: StructureNodeCard };

export function RelationsStructureView({ model, onSelectNode }: RelationsStructureViewProps) {
  const { flowNodes, flowEdges } = useMemo(
    () => layoutStructureHierarchy(model.nodes),
    [model.nodes],
  );

  const nodes = useMemo(
    () =>
      flowNodes.map((node) => ({
        ...node,
        type: 'structure',
      })),
    [flowNodes],
  );

  if (model.nodes.length === 0) {
    return (
      <p className="text-sm text-muted">
        Select an organization focus to explore its command structure.
      </p>
    );
  }

  const height = Math.max(280, (Math.max(...model.nodes.map((n) => n.depth)) + 1) * 72 + 80);

  return (
    <div className="rounded-lg border border-border/50 bg-surface/20" style={{ height }}>
      <ReactFlow
        nodes={nodes}
        edges={flowEdges}
        nodeTypes={nodeTypes}
        nodesDraggable={false}
        nodesConnectable={false}
        elementsSelectable
        fitView
        fitViewOptions={{ padding: 0.2 }}
        proOptions={{ hideAttribution: true }}
        onNodeClick={(_event, node) => {
          const label = typeof node.data.label === 'string' ? node.data.label : node.id;
          onSelectNode(node.id, label);
        }}
      >
        <Background gap={16} />
        <Controls showInteractive={false} />
      </ReactFlow>
    </div>
  );
}
