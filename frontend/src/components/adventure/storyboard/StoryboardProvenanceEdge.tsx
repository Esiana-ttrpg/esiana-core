import { memo } from 'react';
import {
  BaseEdge,
  EdgeLabelRenderer,
  getBezierPath,
  type Edge,
  type EdgeProps,
} from '@xyflow/react';
import type { StoryboardProjectedEdge } from '@shared/storyboardEdgeDerivation';
import {
  storyboardEdgeAnimated,
  storyboardEdgeDash,
  storyboardEdgeStroke,
} from '@/components/adventure/storyboard/storyboardEdgeStyles';

export type StoryboardEdgeData = StoryboardProjectedEdge & {
  selected?: boolean;
};

function StoryboardProvenanceEdgeComponent({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  data,
  selected,
}: EdgeProps) {
  const edgeData = (data ?? {}) as unknown as StoryboardEdgeData;
  const [edgePath, labelX, labelY] = getBezierPath({
    sourceX,
    sourceY,
    targetX,
    targetY,
    sourcePosition,
    targetPosition,
  });

  const stroke = storyboardEdgeStroke(edgeData);
  const dash = storyboardEdgeDash(edgeData);

  return (
    <>
      <BaseEdge
        id={id}
        path={edgePath}
        style={{
          stroke,
          strokeWidth: selected || edgeData.selected ? 2.5 : 1.5,
          strokeDasharray: dash,
        }}
        interactionWidth={20}
      />
      {edgeData.relationKind ? (
        <EdgeLabelRenderer>
          <div
            className="pointer-events-none absolute rounded bg-card/90 px-1.5 py-0.5 text-[9px] text-muted-foreground shadow-sm"
            style={{
              transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY}px)`,
            }}
            title={edgeData.explanation}
          >
            {edgeData.relationKind}
          </div>
        </EdgeLabelRenderer>
      ) : null}
    </>
  );
}

export const StoryboardProvenanceEdge = memo(StoryboardProvenanceEdgeComponent);

export const storyboardEdgeTypes = {
  storyboardProvenance: StoryboardProvenanceEdge,
};

export function projectedEdgeToFlowEdge(
  edge: StoryboardProjectedEdge,
  index: number,
): Edge {
  return {
    id: `sb-${index}-${edge.relationKind}-${edge.sourceId}-${edge.targetId}`,
    source: edge.sourceId,
    target: edge.targetId,
    type: 'storyboardProvenance',
    animated: storyboardEdgeAnimated(edge),
    data: { ...edge } as Record<string, unknown>,
  };
}
