import type { ConditionNode } from '@/lib/chronologyApi';

export interface ConditionGroupEditorProps {
  node: ConditionNode;
}

export function ConditionGroupEditor({ node }: ConditionGroupEditorProps) {
  return (
    <div className="rounded border border-border p-2 text-[11px] text-muted">
      GROUP {node.operator ?? 'AND'} ({node.children?.length ?? 0} children)
    </div>
  );
}
