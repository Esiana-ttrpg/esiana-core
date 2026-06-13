import { memo } from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import type { SceneBeatType } from '@/lib/sceneMetadata';
import { SceneBeatHeading } from '@/components/scene/SceneBeatHeading';
import { sceneBeatGroupBorderClass, sceneBeatDramaticGroup } from '@/lib/sceneBeatVisualTokens';

export type StoryboardSceneNodeData = {
  label: string;
  beatType?: SceneBeatType | string | null;
  weight?: string;
  status?: string;
  risks?: number;
  missing?: boolean;
  connectable?: boolean;
};

function StoryboardSceneNodeComponent({ data }: NodeProps) {
  const nodeData = data as StoryboardSceneNodeData;
  const group = sceneBeatDramaticGroup(nodeData.beatType);
  const borderClass = nodeData.missing
    ? 'border-dashed border-amber-500/50 opacity-60'
    : group
      ? sceneBeatGroupBorderClass(group)
      : 'border-border';

  const metaParts: string[] = [];
  if (nodeData.missing) metaParts.push('missing');
  if (nodeData.weight) metaParts.push(nodeData.weight);
  if (nodeData.status) metaParts.push(nodeData.status);
  if (nodeData.risks && nodeData.risks > 0) {
    metaParts.push(`${nodeData.risks} risk${nodeData.risks === 1 ? '' : 's'}`);
  }

  return (
    <div
      className={`min-w-[160px] max-w-[200px] rounded-md border bg-card/95 px-2.5 py-2 shadow-sm ${borderClass}`}
    >
      {nodeData.connectable !== false ? (
        <Handle type="target" position={Position.Top} className="!bg-muted-foreground/40" />
      ) : null}
      <SceneBeatHeading
        title={nodeData.label}
        beatType={nodeData.beatType}
        titleClassName="truncate text-xs font-medium text-foreground"
        meta={metaParts.length > 0 ? metaParts.join(' · ') : undefined}
      />
      {nodeData.connectable !== false ? (
        <Handle type="source" position={Position.Bottom} className="!bg-muted-foreground/40" />
      ) : null}
    </div>
  );
}

export const StoryboardSceneNode = memo(StoryboardSceneNodeComponent);
