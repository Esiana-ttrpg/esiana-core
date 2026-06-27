import { META_SECTION_LABEL_CLASS } from '@/lib/surfaceLayout';
import type { ConditionNode } from '@/lib/chronologyApi';

interface ConditionTreeBuilderProps {
  value: ConditionNode | null;
  onChange: (next: ConditionNode | null) => void;
}

const PARAMETERS = ['YEAR', 'MONTH', 'DAY', 'WEEKDAY', 'MOON_PHASE', 'SEASON', 'CYCLE'] as const;
const COMPARISONS = ['EQUALS', 'NOT_EQUALS', 'GREATER_THAN', 'LESS_THAN', 'PHASE_MATCH'] as const;
const OPERATORS = ['AND', 'OR', 'NAND', 'XOR'] as const;

export function ConditionTreeBuilder({ value, onChange }: ConditionTreeBuilderProps) {
  return (
    <div className="space-y-2 rounded-lg border border-border bg-background/60 p-3">
      <div className="flex items-center justify-between">
        <p className={META_SECTION_LABEL_CLASS}>Conditions</p>
        {!value ? (
          <button
            type="button"
            className="rounded border border-border px-2 py-1 text-[11px] text-foreground hover:bg-elevated"
            onClick={() =>
              onChange({ type: 'GROUP', operator: 'AND', children: [{ type: 'CRITERIA', parameter: 'YEAR', comparison: 'EQUALS', value: '' }] })
            }
          >
            Add root group
          </button>
        ) : (
          <button
            type="button"
            className="rounded border border-border px-2 py-1 text-[11px] text-foreground hover:bg-elevated"
            onClick={() => onChange(null)}
          >
            Clear
          </button>
        )}
      </div>
      {value && <NodeEditor node={value} onChange={(next) => onChange(next)} onDelete={() => onChange(null)} />}
    </div>
  );
}

function NodeEditor({
  node,
  onChange,
  onDelete,
}: {
  node: ConditionNode;
  onChange: (next: ConditionNode) => void;
  onDelete: () => void;
}) {
  if (node.type === 'GROUP') {
    const children = node.children ?? [];
    return (
      <div className="space-y-2 rounded border border-border p-2">
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-semibold text-muted">Group</span>
          <select
            value={node.operator ?? 'AND'}
            onChange={(event) =>
              onChange({ ...node, operator: event.target.value as (typeof OPERATORS)[number] })
            }
            className="rounded border border-border bg-background px-2 py-1 text-[11px]"
          >
            {OPERATORS.map((operator) => (
              <option key={operator} value={operator}>
                {operator}
              </option>
            ))}
          </select>
          <button type="button" className="ml-auto text-[11px] text-red-300" onClick={onDelete}>
            Delete
          </button>
        </div>
        <div className="space-y-2 pl-2">
          {children.map((child, index) => (
            <NodeEditor
              key={index}
              node={child}
              onDelete={() => {
                const nextChildren = children.filter((_, childIndex) => childIndex !== index);
                onChange({ ...node, children: nextChildren });
              }}
              onChange={(nextChild) => {
                const nextChildren = children.map((row, childIndex) => (childIndex === index ? nextChild : row));
                onChange({ ...node, children: nextChildren });
              }}
            />
          ))}
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            className="rounded border border-border px-2 py-1 text-[11px]"
            onClick={() =>
              onChange({
                ...node,
                children: [...children, { type: 'CRITERIA', parameter: 'YEAR', comparison: 'EQUALS', value: '' }],
              })
            }
          >
            + Criteria
          </button>
          <button
            type="button"
            className="rounded border border-border px-2 py-1 text-[11px]"
            onClick={() =>
              onChange({
                ...node,
                children: [...children, { type: 'GROUP', operator: 'AND', children: [] }],
              })
            }
          >
            + Group
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-2 rounded border border-border bg-surface/30 p-2">
      <div className="flex items-center">
        <span className="text-[11px] font-semibold text-muted">Criteria</span>
        <button type="button" className="ml-auto text-[11px] text-red-300" onClick={onDelete}>
          Delete
        </button>
      </div>
      <div className="grid gap-2 md:grid-cols-3">
        <select
          value={node.parameter ?? 'YEAR'}
          onChange={(event) => onChange({ ...node, parameter: event.target.value as (typeof PARAMETERS)[number] })}
          className="rounded border border-border bg-background px-2 py-1 text-[11px]"
        >
          {PARAMETERS.map((parameter) => (
            <option key={parameter} value={parameter}>
              {parameter}
            </option>
          ))}
        </select>
        <select
          value={node.comparison ?? 'EQUALS'}
          onChange={(event) =>
            onChange({ ...node, comparison: event.target.value as (typeof COMPARISONS)[number] })
          }
          className="rounded border border-border bg-background px-2 py-1 text-[11px]"
        >
          {COMPARISONS.map((comparison) => (
            <option key={comparison} value={comparison}>
              {comparison}
            </option>
          ))}
        </select>
        <input
          value={node.value ?? ''}
          onChange={(event) => onChange({ ...node, value: event.target.value })}
          placeholder="Value"
          className="rounded border border-border bg-background px-2 py-1 text-[11px]"
        />
      </div>
      {(node.parameter ?? 'YEAR') === 'MOON_PHASE' && (
        <input
          value={node.moonId ?? ''}
          onChange={(event) => onChange({ ...node, moonId: event.target.value })}
          placeholder="moonId"
          className="w-full rounded border border-border bg-background px-2 py-1 text-[11px]"
        />
      )}
    </div>
  );
}
