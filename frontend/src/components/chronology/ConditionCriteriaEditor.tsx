import type { ConditionNode } from '@/lib/chronologyApi';

export interface ConditionCriteriaEditorProps {
  node: ConditionNode;
}

export function ConditionCriteriaEditor({ node }: ConditionCriteriaEditorProps) {
  return (
    <div className="rounded border border-border p-2 text-[11px] text-muted">
      CRITERIA {node.parameter ?? 'YEAR'} {node.comparison ?? 'EQUALS'} {node.value ?? ''}
    </div>
  );
}
