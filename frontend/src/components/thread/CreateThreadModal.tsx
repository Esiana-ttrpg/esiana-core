import { META_FIELD_LABEL_CLASS } from '@/lib/surfaceLayout';
import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, ChevronRight, GitBranch, Plus, X } from 'lucide-react';
import { ThreadKindPicker } from '@/components/thread/ThreadKindPicker';
import { ThreadCreatePlacementPreview } from '@/components/thread/ThreadCreatePlacementPreview';
import { PageIdListEditor } from '@/components/entity/codexMetadataEditorShared';
import { IdentityPagePicker } from '@/components/campaign/IdentityPagePicker';
import {
  allowedThreadStatusesForLifecycle,
  defaultThreadStatusForLifecycle,
  THREAD_NARRATIVE_WEIGHTS,
  DEFAULT_THREAD_NARRATIVE_WEIGHT,
  type ThreadKind,
  type ThreadNarrativeWeight,
  type ThreadStatus,
} from '@/lib/threadMetadata';
import {
  THREAD_NARRATIVE_WEIGHT_HINTS,
  THREAD_NARRATIVE_WEIGHT_LABELS,
} from '@/lib/threadVisualTokens';
import { suggestThreadKindFromContext } from '@/lib/threadCreate';
import { createThreadPage } from '@/lib/wiki';
import { resolveNarrativeThreadsRootId } from '@/lib/threadHubLayout';
import { campaignWikiPath } from '@/lib/campaignPaths';
import { NarrativeLifecycleStates } from '@shared/narrativeLifecycle';
import type { NarrativeLifecycleState } from '@shared/narrativeLifecycle';
import type { WikiTreeNode } from '@/types/wiki';

const WIZARD_LIFECYCLE_OPTIONS: Array<{
  value: NarrativeLifecycleState;
  label: string;
  hint: string;
}> = [
  {
    value: NarrativeLifecycleStates.LOCKED,
    label: 'Locked',
    hint: 'GM only — not on party surfaces yet',
  },
  {
    value: NarrativeLifecycleStates.DISCOVERED,
    label: 'Discoverable',
    hint: 'Party can see; pacing OPEN or DORMANT',
  },
  {
    value: NarrativeLifecycleStates.ACTIVE,
    label: 'Active',
    hint: 'Party-visible; OPEN momentum only',
  },
];

export type ThreadCreateLaunchContext = {
  launchSurface: 'hub' | 'wiki_page';
  sourcePageId?: string;
  suggestedKind?: ThreadKind;
  entityCategoryKey?: string | null;
  relatedPageIds?: string[];
};

interface CreateThreadModalProps {
  open: boolean;
  campaignHandle: string;
  flatPages: WikiTreeNode[];
  context?: ThreadCreateLaunchContext;
  onClose: () => void;
  onCreated?: (page: WikiTreeNode) => void;
}

const STEP_LABELS = [
  'Identity',
  'Visibility',
  'Status',
  'Connections',
  'Placement',
  'Review',
] as const;

export function CreateThreadModal({
  open,
  campaignHandle,
  flatPages,
  context,
  onClose,
  onCreated,
}: CreateThreadModalProps) {
  const navigate = useNavigate();
  const threadsRootId = useMemo(
    () => resolveNarrativeThreadsRootId(flatPages),
    [flatPages],
  );

  const [step, setStep] = useState(0);
  const [title, setTitle] = useState('');
  const [threadKind, setThreadKind] = useState<ThreadKind>('mystery');
  const [narrativeWeight, setNarrativeWeight] = useState<ThreadNarrativeWeight>(
    DEFAULT_THREAD_NARRATIVE_WEIGHT,
  );
  const [lifecycle, setLifecycle] = useState<NarrativeLifecycleState>(
    NarrativeLifecycleStates.LOCKED,
  );
  const [threadStatus, setThreadStatus] = useState<ThreadStatus>('OPEN');
  const [relatedPageIds, setRelatedPageIds] = useState<string[]>([]);
  const [payoffPageId, setPayoffPageId] = useState<string | null>(null);
  const [introducedSessionId, setIntroducedSessionId] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const playerSubmitted = threadKind === 'theory';
  const allowedStatuses = useMemo(
    () => allowedThreadStatusesForLifecycle(lifecycle),
    [lifecycle],
  );

  const pickerPages = useMemo(
    () => flatPages.filter((page) => page.id !== threadsRootId),
    [flatPages, threadsRootId],
  );

  useEffect(() => {
    if (!open) return;
    setStep(0);
    setTitle('');
    const suggested =
      context?.suggestedKind ??
      suggestThreadKindFromContext(context?.entityCategoryKey);
    setThreadKind(suggested);
    setNarrativeWeight(DEFAULT_THREAD_NARRATIVE_WEIGHT);
    setLifecycle(NarrativeLifecycleStates.LOCKED);
    setThreadStatus('OPEN');
    setRelatedPageIds(
      context?.relatedPageIds ??
        (context?.sourcePageId ? [context.sourcePageId] : []),
    );
    setPayoffPageId(null);
    setIntroducedSessionId('');
    setError(null);
  }, [open, context]);

  useEffect(() => {
    if (!allowedStatuses.includes(threadStatus)) {
      setThreadStatus(defaultThreadStatusForLifecycle(lifecycle));
    }
  }, [lifecycle, allowedStatuses, threadStatus]);

  useEffect(() => {
    if (threadKind === 'theory') {
      setThreadStatus('OPEN');
    }
  }, [threadKind]);

  if (!open) return null;

  const maxStep = STEP_LABELS.length - 1;

  function goNext() {
    if (step === 0 && !title.trim()) {
      setError('Title is required.');
      return;
    }
    setError(null);
    setStep((s) => Math.min(maxStep, s + 1));
  }

  function goBack() {
    setError(null);
    setStep((s) => Math.max(0, s - 1));
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!threadsRootId) {
      setError('Narrative Threads category is not set up for this campaign.');
      return;
    }
    if (!title.trim()) {
      setError('Title is required.');
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const page = await createThreadPage(campaignHandle, threadsRootId, {
        title: title.trim(),
        threadKind,
        narrativeWeight,
        initialLifecycle: lifecycle,
        threadStatus,
        relatedPageIds,
        payoffPageId,
        introducedSessionId: introducedSessionId.trim() || null,
        playerSubmitted,
      });
      onCreated?.(page);
      onClose();
      navigate(campaignWikiPath(campaignHandle, page.id, flatPages));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to create thread.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="create-thread-title"
    >
      <div className="flex max-h-[90vh] w-full max-w-2xl flex-col rounded-xl border border-border bg-surface shadow-xl">
        <div className="flex shrink-0 items-center justify-between border-b border-border px-5 py-4">
          <div>
            <h2
              id="create-thread-title"
              className="flex items-center gap-2 text-lg font-semibold text-foreground"
            >
              <GitBranch className="size-5 text-amber-400" />
              Create narrative thread
            </h2>
            <p className="mt-0.5 text-xs text-muted">
              Step {step + 1} of {STEP_LABELS.length}: {STEP_LABELS[step]}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1 text-muted hover:bg-elevated"
            aria-label="Close"
          >
            <X className="size-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col">
          <div className="min-h-0 flex-1 overflow-y-auto p-5">
            {error ? (
              <p className="mb-4 rounded-lg bg-red-950/50 px-3 py-2 text-sm text-red-300">
                {error}
              </p>
            ) : null}

            {step === 0 ? (
              <div className="space-y-4">
                <p className="text-sm text-muted">
                  What role does this thread play in the story?
                </p>
                <label className="block space-y-1">
                  <span className="text-sm text-muted">Title *</span>
                  <input
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="w-full rounded-lg border border-border bg-background px-3 py-2 text-foreground outline-none focus:border-primary/60"
                    placeholder="The Missing Heir"
                  />
                </label>
                <div>
                  <span className="mb-2 block text-sm text-muted">Thread kind *</span>
                  <ThreadKindPicker value={threadKind} onChange={setThreadKind} />
                </div>
                {threadKind === 'theory' ? (
                  <p className="text-xs text-cyan-200/90">
                    Player theories are tracked separately from authored setup
                    obligations.
                  </p>
                ) : null}
                <div>
                  <span className="mb-2 block text-sm text-muted">
                    Narrative weight *
                  </span>
                  <p className="mb-2 text-[11px] text-muted">
                    How much campaign attention should this thread command?
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {THREAD_NARRATIVE_WEIGHTS.map((weight) => (
                      <button
                        key={weight}
                        type="button"
                        onClick={() => setNarrativeWeight(weight)}
                        className={`rounded-lg border px-3 py-2 text-left text-xs transition-colors ${
                          narrativeWeight === weight
                            ? 'border-primary/50 bg-primary/10 text-primary'
                            : 'border-border hover:border-primary/30'
                        }`}
                      >
                        <span className="font-medium">
                          {THREAD_NARRATIVE_WEIGHT_LABELS[weight]}
                        </span>
                        <span className="mt-0.5 block text-muted">
                          {THREAD_NARRATIVE_WEIGHT_HINTS[weight]}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            ) : null}

            {step === 1 ? (
              <div className="space-y-3">
                <p className="text-sm text-muted">
                  Lifecycle controls orchestration visibility. Status (next step)
                  tracks narrative momentum.
                </p>
                {WIZARD_LIFECYCLE_OPTIONS.map((opt) => (
                  <label
                    key={opt.value}
                    className={`flex cursor-pointer gap-3 rounded-lg border p-3 ${
                      lifecycle === opt.value
                        ? 'border-primary/50 bg-primary/5'
                        : 'border-border'
                    }`}
                  >
                    <input
                      type="radio"
                      name="thread-lifecycle"
                      checked={lifecycle === opt.value}
                      onChange={() => setLifecycle(opt.value)}
                      className="mt-1"
                    />
                    <span>
                      <span className="font-medium text-foreground">{opt.label}</span>
                      <span className="mt-0.5 block text-xs text-muted">{opt.hint}</span>
                    </span>
                  </label>
                ))}
              </div>
            ) : null}

            {step === 2 ? (
              <div className="space-y-3">
                <p className="text-sm text-muted">
                  Status tracks pacing within the selected lifecycle. Invalid
                  combinations are disabled.
                </p>
                <label className="block space-y-1">
                  <span className="text-sm text-muted">Thread status</span>
                  <select
                    value={threadStatus}
                    onChange={(e) =>
                      setThreadStatus(e.target.value as ThreadStatus)
                    }
                    className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
                    disabled={threadKind === 'theory'}
                  >
                    {(['OPEN', 'DORMANT', 'RESOLVED', 'ABANDONED'] as const).map(
                      (status) => (
                        <option
                          key={status}
                          value={status}
                          disabled={!allowedStatuses.includes(status)}
                        >
                          {status}
                        </option>
                      ),
                    )}
                  </select>
                </label>
              </div>
            ) : null}

            {step === 3 ? (
              <div className="space-y-4">
                <PageIdListEditor
                  label="Related pages"
                  ids={relatedPageIds}
                  pickerPages={pickerPages}
                  flatPages={flatPages}
                  placeholder="NPC, location, quest…"
                  onChange={setRelatedPageIds}
                />
                <div className="space-y-0.5">
                  <span className={META_FIELD_LABEL_CLASS}>
                    Payoff page
                  </span>
                  <IdentityPagePicker
                    flatPages={pickerPages}
                    value={payoffPageId}
                    placeholder="Optional resolution target…"
                    onChange={setPayoffPageId}
                  />
                </div>
                <label className="block space-y-1">
                  <span className="text-sm text-muted">Introduced session (ID)</span>
                  <input
                    value={introducedSessionId}
                    onChange={(e) => setIntroducedSessionId(e.target.value)}
                    className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
                    placeholder="session-uuid or label"
                  />
                </label>
              </div>
            ) : null}

            {step === 4 ? (
              <ThreadCreatePlacementPreview
                threadKind={threadKind}
                playerSubmitted={playerSubmitted}
              />
            ) : null}

            {step === 5 ? (
              <dl className="space-y-2 text-sm">
                <div className="flex justify-between gap-4">
                  <dt className="text-muted">Title</dt>
                  <dd className="text-right font-medium">{title}</dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-muted">Kind</dt>
                  <dd className="capitalize">{threadKind}</dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-muted">Weight</dt>
                  <dd>{THREAD_NARRATIVE_WEIGHT_LABELS[narrativeWeight]}</dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-muted">Lifecycle</dt>
                  <dd>{lifecycle}</dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-muted">Status</dt>
                  <dd>{threadStatus}</dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-muted">Related</dt>
                  <dd>{relatedPageIds.length} page(s)</dd>
                </div>
              </dl>
            ) : null}
          </div>

          <div className="flex shrink-0 flex-wrap gap-3 border-t border-border px-5 py-4">
            {step > 0 ? (
              <button
                type="button"
                onClick={goBack}
                disabled={submitting}
                className="inline-flex items-center gap-1 rounded-lg border border-border px-4 py-2.5 text-sm"
              >
                <ChevronLeft className="size-4" />
                Back
              </button>
            ) : (
              <button
                type="button"
                onClick={onClose}
                disabled={submitting}
                className="rounded-lg border border-border px-4 py-2.5 text-sm"
              >
                Cancel
              </button>
            )}
            {step < maxStep ? (
              <button
                type="button"
                onClick={goNext}
                className="ml-auto inline-flex items-center gap-1 rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-background"
              >
                Next
                <ChevronRight className="size-4" />
              </button>
            ) : (
              <button
                type="submit"
                disabled={submitting || !threadsRootId}
                className="ml-auto inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-background disabled:opacity-50"
              >
                <Plus className="size-4" />
                Create thread
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}
