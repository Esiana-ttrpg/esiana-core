import { useTranslation } from 'react-i18next';
import { Trash2 } from 'lucide-react';
import { filterNpcPages, filterOrganizationPages, isPageUnderQuestsCategory } from '@/lib/questHubLayout';
import type { WikiTreeNode } from '@/types/wiki';
import { ALL_PAGE_NARRATIVE_STATUSES } from '@shared/pageNarrativeStatus';
import { NarrativeLifecycleStates } from '@shared/narrativeLifecycle';
import type {
  ReleaseCriteria,
  ReleaseCriteriaKind,
  ReleaseGroupOperator,
  ReleaseNode,
  ComparisonOperator,
  ReleaseRuleEnvelope,
} from '@shared/journalReleaseRule';
import { translateGroupOperator } from '@/i18n/journalRelease';

const BUILDER_KINDS = [
  'session_number_at_least',
  'real_world_date_after',
  'character_status_is',
  'quest_lifecycle_is',
  'faction_reputation_at_least',
] as const satisfies readonly ReleaseCriteriaKind[];

const COMPARISON_OPS: ComparisonOperator[] = ['=', '!=', '>', '<', '>=', '<='];

const OP_I18N: Record<ComparisonOperator, string> = {
  '=': 'journal.planner.opIs',
  '!=': 'journal.planner.opIsNot',
  '>': 'journal.planner.opGreaterThan',
  '<': 'journal.planner.opLessThan',
  '>=': 'journal.planner.opAtLeast',
  '<=': 'journal.planner.opAtMost',
};

const STARTER_I18N: Record<(typeof BUILDER_KINDS)[number], string> = {
  session_number_at_least: 'journal.planner.condSessionNumberSubject',
  real_world_date_after: 'journal.planner.condRealWorldDateSubject',
  character_status_is: 'journal.planner.condCharacterStatusSubject',
  quest_lifecycle_is: 'journal.planner.condQuestStatusSubject',
  faction_reputation_at_least: 'journal.planner.condFactionRepSubject',
};

function flattenWikiTree(nodes: WikiTreeNode[]): WikiTreeNode[] {
  const out: WikiTreeNode[] = [];
  const walk = (list: WikiTreeNode[]) => {
    for (const node of list) {
      out.push(node);
      if (node.children?.length) walk(node.children);
    }
  };
  walk(nodes);
  return out;
}

function unwrapNode(rule: ReleaseNode | ReleaseRuleEnvelope | null): ReleaseNode | null {
  if (!rule) return null;
  if ((rule as ReleaseRuleEnvelope).node) return (rule as ReleaseRuleEnvelope).node ?? null;
  return rule as ReleaseNode;
}

function makeCriteria(kind: ReleaseCriteriaKind): ReleaseCriteria {
  switch (kind) {
    case 'session_number_at_least':
      return { kind, value: 1, operator: '>=' };
    case 'real_world_date_after':
      return { kind, isoDate: new Date().toISOString().slice(0, 10), operator: '>=' };
    case 'character_status_is':
      return { kind, pageId: '', status: 'DEAD', label: '' };
    case 'quest_lifecycle_is':
      return { kind, pageId: '', state: 'COMPLETED', label: '' };
    case 'faction_reputation_at_least':
      return { kind, factionPageId: '', axis: 'trust', value: 35, label: '' };
    default:
      return { kind: 'manual_release' };
  }
}

const inputClass =
  'rounded-md border border-border bg-background px-2 py-1 text-sm text-foreground';

function OperatorSelect({
  value,
  onChange,
}: {
  value: ComparisonOperator;
  onChange: (op: ComparisonOperator) => void;
}) {
  const { t } = useTranslation();
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value as ComparisonOperator)}
      className={`${inputClass} max-w-[9rem]`}
      aria-label={t('journal.planner.operatorLabel')}
    >
      {COMPARISON_OPS.map((op) => (
        <option key={op} value={op}>
          {t(OP_I18N[op])}
        </option>
      ))}
    </select>
  );
}

function PageSelect({
  pages,
  value,
  onChange,
  label,
}: {
  pages: WikiTreeNode[];
  value: string;
  onChange: (pageId: string, title: string) => void;
  label: string;
}) {
  return (
    <select
      value={value}
      onChange={(e) => {
        const page = pages.find((p) => p.id === e.target.value);
        onChange(e.target.value, page?.title ?? '');
      }}
      className={`${inputClass} min-w-[10rem] max-w-[14rem]`}
      aria-label={label}
    >
      <option value="">—</option>
      {pages.map((page) => (
        <option key={page.id} value={page.id}>
          {page.title}
        </option>
      ))}
    </select>
  );
}

function CriteriaNode({
  criteria,
  onChange,
  onRemove,
  wikiTree,
}: {
  criteria: ReleaseCriteria;
  onChange: (next: ReleaseCriteria) => void;
  onRemove: () => void;
  wikiTree: WikiTreeNode[];
}) {
  const { t } = useTranslation();
  const flat = flattenWikiTree(wikiTree);
  const characterPages = filterNpcPages(flat);
  const questPages = flat.filter((page) => isPageUnderQuestsCategory(page.id, flat));
  const factionPages = filterOrganizationPages(flat);

  let body: React.ReactNode;
  if (criteria.kind === 'session_number_at_least') {
    body = (
      <div className="flex flex-wrap items-center gap-2 text-sm">
        <span className="text-muted">{t('journal.planner.releaseWhen')}</span>
        <span className="text-foreground">{t('journal.planner.condSessionNumberSubject')}</span>
        <OperatorSelect
          value={(criteria as { operator?: ComparisonOperator }).operator ?? '>='}
          onChange={(operator) => onChange({ ...criteria, operator })}
        />
        <input
          type="number"
          min={1}
          value={criteria.value}
          onChange={(event) =>
            onChange({ kind: 'session_number_at_least', value: Number(event.target.value) || 1, operator: (criteria as any).operator })
          }
          className={`${inputClass} w-20`}
        />
      </div>
    );
  } else if (criteria.kind === 'real_world_date_after') {
    body = (
      <div className="flex flex-wrap items-center gap-2 text-sm">
        <span className="text-muted">{t('journal.planner.releaseWhen')}</span>
        <span className="text-foreground">{t('journal.planner.condRealWorldDateSubject')}</span>
        <OperatorSelect
          value={(criteria as { operator?: ComparisonOperator }).operator ?? '>='}
          onChange={(operator) => onChange({ ...criteria, operator })}
        />
        <input
          type="date"
          value={criteria.isoDate.slice(0, 10)}
          onChange={(event) =>
            onChange({ kind: 'real_world_date_after', isoDate: event.target.value, operator: (criteria as any).operator })
          }
          className={inputClass}
        />
      </div>
    );
  } else if (criteria.kind === 'character_status_is') {
    body = (
      <div className="flex flex-wrap items-center gap-2 text-sm">
        <span className="text-muted">{t('journal.planner.releaseWhen')}</span>
        <span className="text-foreground">{t('journal.planner.condCharacterStatusSubject')}</span>
        <PageSelect
          pages={characterPages}
          value={criteria.pageId}
          label={t('journal.planner.pickCharacter')}
          onChange={(pageId, title) =>
            onChange({ ...criteria, pageId, label: title || criteria.label })
          }
        />
        <span className="text-muted">{t('journal.planner.opIs')}</span>
        <select
          value={criteria.status}
          onChange={(e) => onChange({ ...criteria, status: e.target.value })}
          className={inputClass}
        >
          {ALL_PAGE_NARRATIVE_STATUSES.map((status) => (
            <option key={status} value={status}>
              {status}
            </option>
          ))}
        </select>
      </div>
    );
  } else if (criteria.kind === 'quest_lifecycle_is') {
    body = (
      <div className="flex flex-wrap items-center gap-2 text-sm">
        <span className="text-muted">{t('journal.planner.releaseWhen')}</span>
        <span className="text-foreground">{t('journal.planner.condQuestStatusSubject')}</span>
        <PageSelect
          pages={questPages}
          value={criteria.pageId}
          label={t('journal.planner.pickQuest')}
          onChange={(pageId, title) =>
            onChange({ ...criteria, pageId, label: title || criteria.label })
          }
        />
        <span className="text-muted">{t('journal.planner.opIs')}</span>
        <select
          value={criteria.state}
          onChange={(e) => onChange({ ...criteria, state: e.target.value })}
          className={inputClass}
        >
          {Object.values(NarrativeLifecycleStates).map((state) => (
            <option key={state} value={state}>
              {state}
            </option>
          ))}
        </select>
      </div>
    );
  } else if (criteria.kind === 'faction_reputation_at_least') {
    body = (
      <div className="flex flex-wrap items-center gap-2 text-sm">
        <span className="text-muted">{t('journal.planner.releaseWhen')}</span>
        <span className="text-foreground">{t('journal.planner.condFactionRepSubject')}</span>
        <PageSelect
          pages={factionPages}
          value={criteria.factionPageId}
          label={t('journal.planner.pickFaction')}
          onChange={(factionPageId, title) =>
            onChange({ ...criteria, factionPageId, label: title || criteria.label })
          }
        />
        <select
          value={criteria.axis}
          onChange={(e) =>
            onChange({ ...criteria, axis: e.target.value as 'trust' | 'notoriety' })
          }
          className={inputClass}
        >
          <option value="trust">{t('journal.planner.axisTrust')}</option>
          <option value="notoriety">{t('journal.planner.axisNotoriety')}</option>
        </select>
        <span className="text-muted">{t('journal.planner.opAtLeast')}</span>
        <input
          type="number"
          value={criteria.value}
          onChange={(e) =>
            onChange({ ...criteria, value: Number(e.target.value) || 0 })
          }
          className={`${inputClass} w-20`}
        />
      </div>
    );
  } else if (criteria.kind === 'manual_release') {
    body = <span className="text-sm text-muted">{t('journal.planner.condManual')}</span>;
  } else {
    body = (
      <span className="flex items-center gap-2 text-sm text-muted">
        <span className="rounded-md border border-border bg-elevated/30 px-2 py-1">
          {criteria.label ?? criteria.kind}
        </span>
        <span className="text-xs">{t('journal.planner.ruleReadOnly')}</span>
      </span>
    );
  }

  return (
    <div className="flex items-start justify-between gap-2 rounded-lg border border-border/60 bg-surface px-3 py-2">
      <div className="min-w-0 flex-1">{body}</div>
      <button
        type="button"
        onClick={onRemove}
        aria-label={t('journal.planner.removeCondition')}
        className="shrink-0 text-muted hover:text-red-400"
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
  wikiTree,
}: {
  node: ReleaseNode;
  onChange: (next: ReleaseNode) => void;
  onRemove?: () => void;
  depth: number;
  wikiTree: WikiTreeNode[];
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

  return (
    <div
      className="flex flex-col gap-2 rounded-lg border border-border/50 p-3"
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
                operator === op ? 'bg-primary/15 text-foreground' : 'text-muted hover:text-foreground',
              ].join(' ')}
            >
              {op === 'ALL' ? t('journal.planner.groupAll') : t('journal.planner.groupAny')}
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
              wikiTree={wikiTree}
              onChange={(next) => updateChild(index, next)}
              onRemove={() => removeChild(index)}
            />
          ) : (
            <CriteriaNode
              key={index}
              wikiTree={wikiTree}
              criteria={child.criteria ?? { kind: 'manual_release' }}
              onChange={(criteria) => updateChild(index, { type: 'criteria', criteria })}
              onRemove={() => removeChild(index)}
            />
          ),
        )}
      </div>

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
            {t(STARTER_I18N[kind])}
          </option>
        ))}
      </select>
    </div>
  );
}

export function ReleaseRuleEditor({
  rule,
  onChange,
  wikiTree,
  diagnostics,
}: {
  rule: ReleaseNode | ReleaseRuleEnvelope | null;
  onChange: (next: ReleaseNode | null) => void;
  wikiTree: WikiTreeNode[];
  diagnostics?: { outcome: string }[];
}) {
  const { t } = useTranslation();
  const currentNode = unwrapNode(rule);

  if (!currentNode || currentNode.type !== 'group') {
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

  return (
    <div className="flex flex-col gap-3">
      <GroupNode
        node={currentNode}
        depth={0}
        wikiTree={wikiTree}
        onChange={(next) => onChange(next)}
        onRemove={() => onChange(null)}
      />
      {diagnostics && diagnostics.length > 0 && (
        <p className="text-xs text-muted">
          {t('journal.planner.waitingOn', {
            count: diagnostics.filter((d) => d.outcome !== 'met').length,
          })}
        </p>
      )}
    </div>
  );
}

export default ReleaseRuleEditor;
