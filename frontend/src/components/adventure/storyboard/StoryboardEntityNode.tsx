import { memo } from 'react';
import { type NodeProps } from '@xyflow/react';

export type StoryboardEntityNodeData = {
  label: string;
  entityType: string;
  codexType?: string | null;
  missing?: boolean;
};

function StoryboardEntityNodeComponent({ data }: NodeProps) {
  const nodeData = data as StoryboardEntityNodeData;
  const kindLabel = nodeData.codexType ?? nodeData.entityType;
  return (
    <div
      className={`min-w-[120px] max-w-[160px] rounded-md border bg-card/95 px-2.5 py-2 shadow-sm ${
        nodeData.missing ? 'border-dashed border-amber-500/50 opacity-60' : 'border-border'
      }`}
    >
      <p className="text-[10px] uppercase tracking-wide text-muted-foreground">{kindLabel}</p>
      <p className="truncate text-xs font-medium text-foreground">{nodeData.label}</p>
    </div>
  );
}

export const StoryboardEntityNode = memo(StoryboardEntityNodeComponent);
