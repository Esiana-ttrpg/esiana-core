import { META_SECTION_LABEL_CLASS } from '@/lib/surfaceLayout';
import type { ConditionNode } from '@/lib/chronologyApi';

interface ConditionTreeReadOnlyProps {
  value: ConditionNode | null;
}

export function ConditionTreeReadOnly({ value }: ConditionTreeReadOnlyProps) {
  if (!value) {
    return <p className="text-xs text-muted">No conditions configured.</p>;
  }

  return (
    <div className="space-y-2 rounded border border-border bg-background/40 p-2">
      <p className={META_SECTION_LABEL_CLASS}>Conditions</p>
      <NodeView node={value} depth={0} />
    </div>
  );
}

function NodeView({ node, depth }: { node: ConditionNode; depth: number }) {
  if (node.type === 'GROUP') {
    return (
      <div
        className="space-y-1 border-l border-border pl-2"
        style={{ marginLeft: depth > 0 ? 8 : 0 }}
      >
        <p className="text-[11px] font-medium text-foreground">
          Group ({node.operator ?? 'AND'})
        </p>
        {(node.children ?? []).map((child, index) => (
          <NodeView key={index} node={child} depth={depth + 1} />
        ))}
      </div>
    );
  }

  return (
    <p className="text-[11px] text-muted" style={{ marginLeft: depth > 0 ? 8 : 0 }}>
      {node.parameter ?? 'YEAR'} {node.comparison ?? 'EQUALS'}{' '}
      {node.value ?? '—'}
      {node.moonId ? ` · moon ${node.moonId}` : ''}
    </p>
  );
}
