import type { ArcHierarchyNode } from '@/lib/arcMetadata';
import { computeArcNodeProgress } from '@shared/arcProgress';

interface NarrativeProgressChipProps {
  node: ArcHierarchyNode;
}

export function NarrativeProgressChip({ node }: NarrativeProgressChipProps) {
  const progress = computeArcNodeProgress(node);
  if (!progress || progress.total < 2) return null;

  return (
    <span
      className="rounded bg-primary/10 px-1.5 py-0.5 text-[10px] font-medium text-primary"
      title={`${progress.completed} of ${progress.total} structural steps complete`}
    >
      {progress.percent}%
    </span>
  );
}
