import { memo } from 'react';
import type { SocialRelationsRenderModel } from '@shared/relationshipLensProjections';

interface RelationsConnectionsCanvasProps {
  model: SocialRelationsRenderModel;
  onSelectNode: (nodeId: string, title: string) => void;
}

const SIZE = 420;
const CENTER = SIZE / 2;

const ConnectionNode = memo(function ConnectionNode({
  x,
  y,
  title,
  isCenter,
  onSelect,
}: {
  x: number;
  y: number;
  title: string;
  isCenter: boolean;
  onSelect: () => void;
}) {
  const r = isCenter ? 28 : 20;
  return (
    <g
      role="button"
      tabIndex={0}
      className="cursor-pointer"
      onClick={onSelect}
      onKeyDown={(e) => {
        if (e.key === 'Enter') onSelect();
      }}
    >
      <circle
        cx={x}
        cy={y}
        r={r}
        className={isCenter ? 'fill-primary/30 stroke-primary' : 'fill-surface stroke-border'}
        strokeWidth={2}
      />
      <text
        x={x}
        y={y + r + 14}
        textAnchor="middle"
        className="fill-foreground text-[10px]"
      >
        {title.length > 16 ? `${title.slice(0, 14)}…` : title}
      </text>
    </g>
  );
});

function polarityStroke(polarity: string): string {
  if (polarity === 'negative') return 'var(--color-danger, #ef4444)';
  if (polarity === 'positive') return 'var(--color-success, #22c55e)';
  return 'var(--color-muted, #6b7280)';
}

export function RelationsConnectionsCanvas({
  model,
  onSelectNode,
}: RelationsConnectionsCanvasProps) {
  const nodes = model.connectionNodes;
  const edges = model.connectionEdges;
  if (nodes.length === 0) {
    return (
      <p className="text-sm text-muted">
        Select a character or use View connections from an entity page.
      </p>
    );
  }

  const positions = new Map(
    nodes.map((node) => {
      const rad = (node.angle * Math.PI) / 180;
      const x = CENTER + Math.cos(rad) * node.radius;
      const y = CENTER + Math.sin(rad) * node.radius;
      return [node.id, { x, y, node }] as const;
    }),
  );

  const centerId = nodes.find((n) => n.radius === 0)?.id ?? nodes[0]?.id;

  return (
    <svg
      viewBox={`0 0 ${SIZE} ${SIZE}`}
      className="mx-auto w-full max-w-lg rounded-lg border border-border bg-background/30"
      aria-label="Connections view"
    >
      {edges.map((edge) => {
        const src = positions.get(edge.sourceId);
        const tgt = positions.get(edge.targetId);
        if (!src || !tgt) return null;
        return (
          <line
            key={edge.id}
            x1={src.x}
            y1={src.y}
            x2={tgt.x}
            y2={tgt.y}
            stroke={polarityStroke(edge.polarity)}
            strokeWidth={edge.inferred ? 1 : 2}
            strokeDasharray={edge.inferred ? '4 4' : undefined}
            opacity={0.7}
          />
        );
      })}
      {[...positions.entries()].map(([id, { x, y, node }]) => (
        <ConnectionNode
          key={id}
          x={x}
          y={y}
          title={node.title}
          isCenter={id === centerId}
          onSelect={() => onSelectNode(node.id, node.title)}
        />
      ))}
    </svg>
  );
}
