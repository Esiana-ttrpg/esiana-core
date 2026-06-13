import { useEffect, useMemo, useState } from 'react';
import type {
  ThreadMetadataFields,
  ThreadKind,
  ThreadNarrativeWeight,
  ThreadStatus,
} from '@/lib/threadMetadata';
import {
  THREAD_KINDS,
  THREAD_STATUSES,
  THREAD_NARRATIVE_WEIGHTS,
  allowedThreadStatusesForLifecycle,
} from '@/lib/threadMetadata';
import {
  THREAD_KIND_LABELS,
  THREAD_NARRATIVE_WEIGHT_LABELS,
} from '@/lib/threadVisualTokens';
import {
  NarrativeLifecycleStates,
  type NarrativeLifecycleState,
} from '@shared/narrativeLifecycle';
import { PageIdListEditor } from '@/components/entity/codexMetadataEditorShared';
import { IdentityPagePicker } from '@/components/campaign/IdentityPagePicker';
import type { WikiTreeNode } from '@/types/wiki';

const fieldClass =
  'w-full rounded-md border border-border bg-background px-2 py-1 text-xs text-foreground outline-none focus:border-primary/60';

const LIFECYCLE_OPTIONS: NarrativeLifecycleState[] = [
  NarrativeLifecycleStates.LOCKED,
  NarrativeLifecycleStates.DISCOVERED,
  NarrativeLifecycleStates.ACTIVE,
  NarrativeLifecycleStates.COMPLETED,
  NarrativeLifecycleStates.FAILED,
];

interface ThreadCardPropertiesProps {
  thread: ThreadMetadataFields;
  lifecycleState: NarrativeLifecycleState;
  flatPages: WikiTreeNode[];
  pageId: string;
  disabled?: boolean;
  onThreadPatch: (patch: Partial<ThreadMetadataFields>) => Promise<void>;
  onLifecycleChange: (state: NarrativeLifecycleState) => Promise<void>;
}

export function ThreadCardProperties({
  thread,
  lifecycleState,
  flatPages,
  pageId,
  disabled = false,
  onThreadPatch,
  onLifecycleChange,
}: ThreadCardPropertiesProps) {
  const allowedStatuses = useMemo(
    () => allowedThreadStatusesForLifecycle(lifecycleState),
    [lifecycleState],
  );

  const pickerPages = useMemo(
    () => flatPages.filter((page) => page.id !== pageId),
    [flatPages, pageId],
  );

  const [kindDraft, setKindDraft] = useState<ThreadKind>(thread.threadKind);

  useEffect(() => {
    setKindDraft(thread.threadKind);
  }, [thread.threadKind]);

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-4">
        <label className="space-y-0.5">
          <span className="text-[10px] font-medium uppercase tracking-wide text-muted">
            Kind
          </span>
          <select
            className={fieldClass}
            disabled={disabled}
            value={kindDraft}
            onChange={(event) => {
              const next = event.target.value as ThreadKind;
              setKindDraft(next);
              const patch: Partial<ThreadMetadataFields> = { threadKind: next };
              if (next === 'theory') {
                patch.playerSubmitted = true;
                patch.threadStatus = 'OPEN';
              }
              void onThreadPatch(patch);
            }}
          >
            {THREAD_KINDS.map((kind) => (
              <option key={kind} value={kind}>
                {THREAD_KIND_LABELS[kind]}
              </option>
            ))}
          </select>
        </label>

        <label className="space-y-0.5">
          <span className="text-[10px] font-medium uppercase tracking-wide text-muted">
            Lifecycle
          </span>
          <select
            className={fieldClass}
            disabled={disabled}
            value={lifecycleState}
            onChange={(event) => {
              void onLifecycleChange(event.target.value as NarrativeLifecycleState);
            }}
          >
            {LIFECYCLE_OPTIONS.map((state) => (
              <option key={state} value={state}>
                {state}
              </option>
            ))}
          </select>
        </label>

        <label className="space-y-0.5">
          <span className="text-[10px] font-medium uppercase tracking-wide text-muted">
            Status
          </span>
          <select
            className={fieldClass}
            disabled={disabled}
            value={thread.threadStatus}
            onChange={(event) => {
              void onThreadPatch({
                threadStatus: event.target.value as ThreadStatus,
              });
            }}
          >
            {THREAD_STATUSES.map((status) => (
              <option
                key={status}
                value={status}
                disabled={!allowedStatuses.includes(status)}
              >
                {status}
              </option>
            ))}
          </select>
        </label>

        <label className="space-y-0.5">
          <span className="text-[10px] font-medium uppercase tracking-wide text-muted">
            Narrative weight
          </span>
          <select
            className={fieldClass}
            disabled={disabled}
            value={thread.narrativeWeight}
            onChange={(event) => {
              void onThreadPatch({
                narrativeWeight: event.target.value as ThreadNarrativeWeight,
              });
            }}
          >
            {THREAD_NARRATIVE_WEIGHTS.map((weight) => (
              <option key={weight} value={weight}>
                {THREAD_NARRATIVE_WEIGHT_LABELS[weight]}
              </option>
            ))}
          </select>
        </label>

        <label className="flex items-end gap-2 pb-1 sm:col-span-2">
          <input
            type="checkbox"
            className="size-3.5 rounded border-border"
            disabled={disabled || thread.threadKind === 'theory'}
            checked={thread.playerSubmitted}
            onChange={(event) => {
              void onThreadPatch({ playerSubmitted: event.target.checked });
            }}
          />
          <span className="text-xs text-muted">Player-submitted theory</span>
        </label>
      </div>

      {thread.threadKind === 'theory' ? (
        <p className="text-[11px] text-cyan-200/80">
          Theories are player speculation — they do not count as authored setup debt.
        </p>
      ) : null}

      <PageIdListEditor
        label="Related pages"
        ids={thread.relatedPageIds}
        pickerPages={pickerPages}
        flatPages={flatPages}
        placeholder="Link quest, NPC, location…"
        onChange={(nextIds) => {
          void onThreadPatch({ relatedPageIds: nextIds });
        }}
      />

      <div className="space-y-0.5">
        <span className="text-[10px] font-medium uppercase tracking-wide text-muted">
          Payoff page
        </span>
        <IdentityPagePicker
          flatPages={pickerPages}
          value={thread.payoffPageId}
          disabled={disabled}
          placeholder="Optional resolution target…"
          onChange={(nextId) => {
            void onThreadPatch({ payoffPageId: nextId });
          }}
        />
      </div>

      <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
        <label className="space-y-0.5">
          <span className="text-[10px] font-medium uppercase tracking-wide text-muted">
            Introduced session
          </span>
          <input
            type="text"
            className={fieldClass}
            disabled={disabled}
            value={thread.introducedSessionId ?? ''}
            onChange={(event) => {
              const value = event.target.value.trim();
              void onThreadPatch({
                introducedSessionId: value.length > 0 ? value : null,
              });
            }}
            placeholder="Session id"
          />
        </label>
        <label className="space-y-0.5">
          <span className="text-[10px] font-medium uppercase tracking-wide text-muted">
            Last advanced
          </span>
          <input
            type="text"
            className={fieldClass}
            disabled={disabled}
            value={thread.lastAdvancedSessionId ?? ''}
            onChange={(event) => {
              const value = event.target.value.trim();
              void onThreadPatch({
                lastAdvancedSessionId: value.length > 0 ? value : null,
              });
            }}
            placeholder="Session id"
          />
        </label>
        <label className="space-y-0.5">
          <span className="text-[10px] font-medium uppercase tracking-wide text-muted">
            Resolved session
          </span>
          <input
            type="text"
            className={fieldClass}
            disabled={disabled}
            value={thread.resolvedSessionId ?? ''}
            onChange={(event) => {
              const value = event.target.value.trim();
              void onThreadPatch({
                resolvedSessionId: value.length > 0 ? value : null,
              });
            }}
            placeholder="Session id"
          />
        </label>
      </div>
    </div>
  );
}
