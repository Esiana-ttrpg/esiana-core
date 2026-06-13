import { Plus, Trash2 } from 'lucide-react';
import type { BranchCondition } from '@shared/narrativeBranch';
import { NarrativeLifecycleStates, type NarrativeLifecycleState } from '@shared/narrativeLifecycle';
import { IdentityPagePicker } from '@/components/campaign/IdentityPagePicker';
import type { WikiTreeNode } from '@/types/wiki';

const fieldClass =
  'w-full rounded-md border border-border bg-background px-2 py-1 text-xs text-foreground outline-none focus:border-primary/60';

const CONDITION_TYPES: BranchCondition['type'][] = [
  'lifecycle',
  'calendar_event',
  'graph_edge',
  'manual_flag',
];

const LIFECYCLE_STATES = Object.values(NarrativeLifecycleStates) as NarrativeLifecycleState[];

function emptyCondition(type: BranchCondition['type']): BranchCondition {
  switch (type) {
    case 'lifecycle':
      return { type: 'lifecycle', subjectId: '', state: NarrativeLifecycleStates.LOCKED };
    case 'calendar_event':
      return { type: 'calendar_event', eventId: '' };
    case 'graph_edge':
      return { type: 'graph_edge', sourcePageId: '', targetPageId: '', kind: '' };
    case 'manual_flag':
      return { type: 'manual_flag', key: '', value: true };
  }
}

function conditionSummary(condition: BranchCondition): string {
  switch (condition.type) {
    case 'lifecycle':
      return `Lifecycle · ${condition.state}`;
    case 'calendar_event':
      return `Calendar event · ${condition.eventId || '—'}`;
    case 'graph_edge':
      return `Graph edge · ${condition.kind || '—'}`;
    case 'manual_flag':
      return `Flag · ${condition.key || '—'} = ${condition.value ? 'true' : 'false'}`;
  }
}

interface BranchConditionListEditorProps {
  label: string;
  conditions: BranchCondition[];
  flatPages: WikiTreeNode[];
  disabled?: boolean;
  onChange: (conditions: BranchCondition[]) => void;
}

export function BranchConditionListEditor({
  label,
  conditions,
  flatPages,
  disabled = false,
  onChange,
}: BranchConditionListEditorProps) {
  function updateAt(index: number, next: BranchCondition) {
    const copy = [...conditions];
    copy[index] = next;
    onChange(copy);
  }

  function removeAt(index: number) {
    onChange(conditions.filter((_, i) => i !== index));
  }

  function addCondition() {
    onChange([...conditions, emptyCondition('lifecycle')]);
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <span className="text-[10px] font-medium uppercase tracking-wide text-muted">
          {label}
        </span>
        {!disabled ? (
          <button
            type="button"
            className="inline-flex items-center gap-1 rounded border border-border px-1.5 py-0.5 text-[10px] text-muted hover:bg-muted/40"
            onClick={addCondition}
          >
            <Plus className="size-3" />
            Add
          </button>
        ) : null}
      </div>
      {conditions.length === 0 ? (
        <p className="text-[11px] text-muted">No conditions defined.</p>
      ) : (
        <ul className="space-y-2">
          {conditions.map((condition, index) => (
            <li
              key={`${condition.type}-${index}`}
              className="rounded-md border border-border/70 bg-background/40 p-2 space-y-2"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-[10px] text-muted">{conditionSummary(condition)}</span>
                {!disabled ? (
                  <button
                    type="button"
                    className="text-muted hover:text-red-400"
                    aria-label="Remove condition"
                    onClick={() => removeAt(index)}
                  >
                    <Trash2 className="size-3.5" />
                  </button>
                ) : null}
              </div>
              <label className="block space-y-0.5">
                <span className="text-[10px] text-muted">Type</span>
                <select
                  className={fieldClass}
                  disabled={disabled}
                  value={condition.type}
                  onChange={(event) => {
                    updateAt(index, emptyCondition(event.target.value as BranchCondition['type']));
                  }}
                >
                  {CONDITION_TYPES.map((type) => (
                    <option key={type} value={type}>
                      {type}
                    </option>
                  ))}
                </select>
              </label>
              {condition.type === 'lifecycle' ? (
                <div className="grid gap-2 sm:grid-cols-2">
                  <div className="space-y-0.5">
                    <span className="text-[10px] text-muted">Subject page</span>
                    <IdentityPagePicker
                      flatPages={flatPages}
                      value={condition.subjectId || null}
                      disabled={disabled}
                      placeholder="Quest, thread, scene…"
                      onChange={(subjectId) => {
                        updateAt(index, {
                          ...condition,
                          subjectId: subjectId ?? '',
                        });
                      }}
                    />
                  </div>
                  <label className="space-y-0.5">
                    <span className="text-[10px] text-muted">Required state</span>
                    <select
                      className={fieldClass}
                      disabled={disabled}
                      value={condition.state}
                      onChange={(event) => {
                        updateAt(index, {
                          ...condition,
                          state: event.target.value as NarrativeLifecycleState,
                        });
                      }}
                    >
                      {LIFECYCLE_STATES.map((state) => (
                        <option key={state} value={state}>
                          {state}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>
              ) : null}
              {condition.type === 'calendar_event' ? (
                <label className="block space-y-0.5">
                  <span className="text-[10px] text-muted">Event ID</span>
                  <input
                    type="text"
                    className={fieldClass}
                    disabled={disabled}
                    value={condition.eventId}
                    onChange={(event) => {
                      updateAt(index, { ...condition, eventId: event.target.value });
                    }}
                    placeholder="Calendar event id"
                  />
                </label>
              ) : null}
              {condition.type === 'graph_edge' ? (
                <div className="space-y-2">
                  <div className="grid gap-2 sm:grid-cols-2">
                    <div className="space-y-0.5">
                      <span className="text-[10px] text-muted">Source page</span>
                      <IdentityPagePicker
                        flatPages={flatPages}
                        value={condition.sourcePageId || null}
                        disabled={disabled}
                        placeholder="Source…"
                        onChange={(sourcePageId) => {
                          updateAt(index, {
                            ...condition,
                            sourcePageId: sourcePageId ?? '',
                          });
                        }}
                      />
                    </div>
                    <div className="space-y-0.5">
                      <span className="text-[10px] text-muted">Target page</span>
                      <IdentityPagePicker
                        flatPages={flatPages}
                        value={condition.targetPageId || null}
                        disabled={disabled}
                        placeholder="Target…"
                        onChange={(targetPageId) => {
                          updateAt(index, {
                            ...condition,
                            targetPageId: targetPageId ?? '',
                          });
                        }}
                      />
                    </div>
                  </div>
                  <label className="block space-y-0.5">
                    <span className="text-[10px] text-muted">Edge kind</span>
                    <input
                      type="text"
                      className={fieldClass}
                      disabled={disabled}
                      value={condition.kind}
                      onChange={(event) => {
                        updateAt(index, { ...condition, kind: event.target.value });
                      }}
                      placeholder="WIKI_REFERENCE, SCENE_FOLLOWS…"
                    />
                  </label>
                </div>
              ) : null}
              {condition.type === 'manual_flag' ? (
                <div className="grid gap-2 sm:grid-cols-2">
                  <label className="space-y-0.5">
                    <span className="text-[10px] text-muted">Flag key</span>
                    <input
                      type="text"
                      className={fieldClass}
                      disabled={disabled}
                      value={condition.key}
                      onChange={(event) => {
                        updateAt(index, { ...condition, key: event.target.value });
                      }}
                    />
                  </label>
                  <label className="flex items-end gap-2 pb-1">
                    <input
                      type="checkbox"
                      className="size-3.5 rounded border-border"
                      disabled={disabled}
                      checked={condition.value}
                      onChange={(event) => {
                        updateAt(index, { ...condition, value: event.target.checked });
                      }}
                    />
                    <span className="text-xs text-muted">Required value (true)</span>
                  </label>
                </div>
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
