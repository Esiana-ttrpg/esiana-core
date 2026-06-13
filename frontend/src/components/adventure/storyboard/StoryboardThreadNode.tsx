import { memo } from 'react';
import { type NodeProps } from '@xyflow/react';

export type StoryboardThreadNodeData = {
  label: string;
  threadKind?: string | null;
  missing?: boolean;
};

function StoryboardThreadNodeComponent({ data }: NodeProps) {
  const nodeData = data as StoryboardThreadNodeData;
  return (
    <div
      className={`min-w-[140px] max-w-[180px] rounded-md border bg-card/95 px-2.5 py-2 shadow-sm ${
        nodeData.missing ? 'border-dashed border-amber-500/50 opacity-60' : 'border-amber-500/40'
      }`}
    >
      <p className="text-[10px] uppercase tracking-wide text-amber-400/80">
        {nodeData.threadKind ?? 'thread'}
      </p>
      <p className="truncate text-xs font-medium text-foreground">{nodeData.label}</p>
    </div>
  );
}

export const StoryboardThreadNode = memo(StoryboardThreadNodeComponent);
