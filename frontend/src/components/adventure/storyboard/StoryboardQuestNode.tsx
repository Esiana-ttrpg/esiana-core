import { memo } from 'react';
import { type NodeProps } from '@xyflow/react';

export type StoryboardQuestNodeData = {
  label: string;
  questStatus?: string | null;
  missing?: boolean;
};

function StoryboardQuestNodeComponent({ data }: NodeProps) {
  const nodeData = data as StoryboardQuestNodeData;
  return (
    <div
      className={`min-w-[140px] max-w-[180px] rounded-md border bg-card/95 px-2.5 py-2 shadow-sm ${
        nodeData.missing ? 'border-dashed border-amber-500/50 opacity-60' : 'border-emerald-500/40'
      }`}
    >
      <p className="text-[10px] uppercase tracking-wide text-emerald-400/80">Quest</p>
      <p className="truncate text-xs font-medium text-foreground">{nodeData.label}</p>
      {nodeData.questStatus ? (
        <p className="text-[10px] text-muted-foreground">{nodeData.questStatus}</p>
      ) : null}
    </div>
  );
}

export const StoryboardQuestNode = memo(StoryboardQuestNodeComponent);
