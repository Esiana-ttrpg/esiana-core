import { useTranslation } from 'react-i18next';
import { Trash2 } from 'lucide-react';
import type {
  ReleaseCriteria,
  ReleaseCriteriaKind,
  ReleaseGroupOperator,
  ReleaseNode,
} from '@shared/journalReleaseRule';
import { translateGroupOperator } from '@/i18n/journalRelease';

/**
 * Builder-editable criteria. Entity-anchored criteria (characters, events,
 * projects…) need per-subsystem pickers and are shown read-only here; they can
 * still be removed. Value-only criteria are fully editable.
 */
const BUILDER_KINDS: ReleaseCriteriaKind[] = [
  'session_number_at_least',
  'real_world_date_after',
  'manual_release',
];

const BUILDER_KIND_LABEL: Partial<Record<ReleaseCriteriaKind, string>> = {
  session_number_at_least: 'journal.planner.condSessionNumber',
  real_world_date_after: 'journal.planner.condRealWorldDate',
  manual_release: 'journal.planner.condManual',
};

function makeCriteria(kind: ReleaseCriteriaKind): ReleaseCriteria {
  switch (kind) {
    case 'session_number_at_least':
      return { kind, value: 1 };
    case 'real_world_date_after':
      return { kind, isoDate: new Date().toISOString().slice(0, 10) };
    default:
      return { kind: 'manual_release' };
  }
}

const inputClass = 'rounded-md border border-border bg-background px-2 py-1 text-sm text-foreground';
const chipClass = 'rounded-md border border-border bg-elevated/30 px-2 py-1 text-sm text-foreground';

function CriteriaNode({
  criteria,
  onChange,
  onRemove,
}: {
  criteria: ReleaseCriteria;
  onChange: (next: ReleaseCriteria) => void;
  onRemove: () => void;
}) {
  const { t } = useTranslation();

  let body: React.ReactNode;
  if (criteria.kind === 'session_number_at_least') {
    body = (
      <label className="flex items-center gap-2">
        <span className="text-sm text-muted">{t('journal.planner.condSessionNumber')}</span>
        <input
          type="number"
          min={1}
          value={criteria.value}
          onChange={(event) =>
            onChange({ kind: 'session_number_at_least', value: Number(event.target.value) || 1 })
          }
          className={`${inputClass} w-20`}
        />
      </label>
    );
  } else if (criteria.kind === 'real_world_date_after') {
    body = (
      <label className="flex items-center gap-2">
        <span className="text-sm text-muted">{t('journal.planner.condRealWorldDate')}</span>
        <input
          type="date"
          value={criteria.isoDate.slice(0, 10)}
          onChange={(event) =>
            onChange({ kind: 'real_world_date_after', isoDate: event.target.value })
          }
          className={inputClass}
        />
      </label>
    );
  } else if (criteria.kind === 'manual_release') {
    body = <span className="text-sm text-foreground">{t('journal.planner.condManual')}</span>;
  } else {
    body = (
      <span className="flex items-center gap-2 text-sm text-muted">
        <span className={chipClass}>{criteria.label ?? criteria.kind}</span>
        <span className="text-xs">{t('journal.planner.ruleReadOnly')}</span>
      </span>
    );
  }

  return (
    <div className="flex items-center justify-between gap-2 rounded-lg border border-border bg-surface px-3 py-2">
      {body}
      <button
        type="button"
        onClick={onRemove}
        aria-label={t('journal.planner.removeCondition')}
        className="text-muted hover:text-red-400"
      >
        <Trash2 className="size-4" aria-hidden />
      </button>
    </div>
  );
}

function GroupNode({
  node,
  onChange,
  onRemove,
  depth,
}: {
  node: ReleaseNode;
  onChange: (next: ReleaseNode) => void;
  onRemove?: () => void;
  depth: number;
}) {
  const { t } = useTranslation();
  const operator: ReleaseGroupOperator = node.operator ?? 'ALL';
  const children = node.children ?? [];

  const updateChild = (index: number, next: ReleaseNode) => {
    onChange({ ...node, children: children.map((child, i) => (i === index ? next : child)) });
  };
  const removeChild = (index: number) => {
    onChange({ ...node, children: children.filter((_, i) => i !== index) });
  };
  const addCriteria = (kind: ReleaseCriteriaKind) => {
    onChange({
      ...node,
      children: [...children, { type: 'criteria', criteria: makeCriteria(kind) }],
    });
  };
  const addGroup = () => {
    onChange({
      ...node,
      children: [...children, { type: 'group', operator: 'ALL', children: [] }],
    });
  };

  return (
    <div
      className="flex flex-col gap-2 rounded-lg border border-border p-3"
      style={{ marginLeft: depth > 0 ? 8 : 0 }}
    >
      <div className="flex items-center justify-between gap-2">
        <div className="inline-flex overflow-hidden rounded-md border border-border text-xs">
          {(['ALL', 'ANY'] as ReleaseGroupOperator[]).map((op) => (
            <button
              key={op}
              type="button"
              onClick={() => onChange({ ...node, operator: op })}
              className={[
                'px-2 py-1',
                operator === op ? 'bg-primary text-background' : 'text-muted hover:text-foreground',
              ].join(' ')}
            >
              {translateGroupOperator(op, t)}
            </button>
          ))}
        </div>
        {onRemove && (
          <button
            type="button"
            onClick={onRemove}
            aria-label={t('journal.planner.removeCondition')}
            className="text-muted hover:text-red-400"
          >
            <Trash2 className="size-4" aria-hidden />
          </button>
        )}
      </div>

      <div className="flex flex-col gap-2">
        {children.map((child, index) =>
          child.type === 'group' ? (
            <GroupNode
              key={index}
              node={child}
              depth={depth + 1}
              onChange={(next) => updateChild(index, next)}
              onRemove={() => removeChild(index)}
            />
          ) : (
            <CriteriaNode
              key={index}
              criteria={child.criteria ?? { kind: 'manual_release' }}
              onChange={(criteria) => updateChild(index, { type: 'criteria', criteria })}
              onRemove={() => removeChild(index)}
            />
          ),
        )}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <select
          value=""
          onChange={(event) => {
            const kind = event.target.value as ReleaseCriteriaKind;
            if (kind) addCriteria(kind);
            event.target.value = '';
          }}
          className={`${inputClass} text-xs`}
        >
          <option value="">{t('journal.planner.addCondition')}</option>
          {BUILDER_KINDS.map((kind) => (
            <option key={kind} value={kind}>
              {t(BUILDER_KIND_LABEL[kind] ?? 'journal.planner.addCondition')}
            </option>
          ))}
        </select>
        <button
          type="button"
          onClick={addGroup}
          className="text-xs text-primary hover:underline"
        >
          {t('journal.planner.addGroup')}
        </button>
      </div>
    </div>
  );
}

export function ReleaseRuleEditor({
  rule,
  onChange,
}: {
  rule: ReleaseNode | null;
  onChange: (next: ReleaseNode | null) => void;
}) {
  const { t } = useTranslation();

  if (!rule || rule.type !== 'group') {
    return (
      <div className="flex flex-col items-start gap-2">
        <p className="text-sm text-muted">{t('journal.planner.noPlanYet')}</p>
        <button
          type="button"
          onClick={() => onChange({ type: 'group', operator: 'ALL', children: [] })}
          className="text-sm text-primary hover:underline"
        >
          {t('journal.planner.addCondition')}
        </button>
      </div>
    );
  }

  return <GroupNode node={rule} depth={0} onChange={onChange} onRemove={() => onChange(null)} />;
}

export default ReleaseRuleEditor;
