import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { X } from 'lucide-react';
import {
  LEDGER_CATEGORIES,
  LEDGER_ENTRY_KINDS,
  LEDGER_NARRATIVE_MAX_LENGTH,
  formatLedgerCategoryLabel,
  type LedgerCategory,
  type LedgerEntryKind,
} from '@shared/ledgerMetadata';
import type { LedgerSuggestionLine, LedgerTransactionLine } from '@shared/downtimeHub';
import {
  acceptLedgerSuggestion,
  createLedgerEntry,
  listDowntimeProjects,
  updateLedgerEntry,
  type CreateLedgerEntryInput,
} from '@/lib/downtimeLedger';
import { fetchDowntimeHavens } from '@/lib/downtime';

const fieldClass =
  'mt-1 w-full rounded border border-border bg-background px-2.5 py-1.5 text-sm text-foreground outline-none transition-colors focus:border-primary/60';

function formatEntryKindLabel(kind: LedgerEntryKind): string {
  switch (kind) {
    case 'credit':
      return 'Income / credit';
    case 'debit':
      return 'Expense / debit';
    case 'debt_open':
      return 'Open debt';
    case 'debt_payment':
      return 'Debt payment';
    default:
      return kind;
  }
}

export type LedgerEntryDraft = Partial<CreateLedgerEntryInput>;

interface AddLedgerEntryModalProps {
  open: boolean;
  campaignHandle: string;
  editingLine: LedgerTransactionLine | null;
  initialDraft?: LedgerEntryDraft | null;
  acceptingSuggestion?: LedgerSuggestionLine | null;
  characterOptions?: Array<{ id: string; label: string }>;
  showContributor?: boolean;
  onClose: () => void;
  onSaved: () => void;
}

export function AddLedgerEntryModal({
  open,
  campaignHandle,
  editingLine,
  initialDraft,
  acceptingSuggestion,
  characterOptions = [],
  showContributor = false,
  onClose,
  onSaved,
}: AddLedgerEntryModalProps) {
  const [entryKind, setEntryKind] = useState<LedgerEntryKind>('debit');
  const [category, setCategory] = useState<LedgerCategory>('other');
  const [title, setTitle] = useState('');
  const [amount, setAmount] = useState('');
  const [narrative, setNarrative] = useState('');
  const [projectId, setProjectId] = useState('');
  const [havenWikiPageId, setHavenWikiPageId] = useState('');
  const [contributorPageId, setContributorPageId] = useState('');
  const [projectOptions, setProjectOptions] = useState<Array<{ id: string; label: string }>>([]);
  const [havenOptions, setHavenOptions] = useState<Array<{ id: string; label: string }>>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isEditing = editingLine != null;
  const isAcceptingSuggestion = acceptingSuggestion != null;

  const modalTitle = isAcceptingSuggestion
    ? 'Review suggested entry'
    : isEditing
      ? 'Edit ledger entry'
      : 'Add ledger entry';

  useEffect(() => {
    if (!open) {
      setEntryKind('debit');
      setCategory('other');
      setTitle('');
      setAmount('');
      setNarrative('');
      setProjectId('');
      setHavenWikiPageId('');
      setContributorPageId('');
      setError(null);
      return;
    }

    if (editingLine) {
      setEntryKind(editingLine.entryKind);
      setCategory(editingLine.category);
      setTitle(editingLine.title);
      setAmount(String(editingLine.amount));
      setNarrative(editingLine.narrative ?? '');
      setProjectId(editingLine.projectId ?? '');
      setHavenWikiPageId(editingLine.havenWikiPageId ?? '');
      setContributorPageId(editingLine.contributorPageId ?? '');
    } else if (acceptingSuggestion) {
      setEntryKind(acceptingSuggestion.entryKind);
      setCategory(acceptingSuggestion.category);
      setTitle(acceptingSuggestion.title);
      setAmount(
        acceptingSuggestion.amount != null ? String(acceptingSuggestion.amount) : '',
      );
      setNarrative(acceptingSuggestion.narrative ?? '');
      setProjectId(acceptingSuggestion.projectId ?? '');
      setHavenWikiPageId(acceptingSuggestion.havenWikiPageId ?? '');
      setContributorPageId('');
    } else if (initialDraft) {
      setEntryKind(initialDraft.entryKind ?? 'debit');
      setCategory(initialDraft.category ?? 'other');
      setTitle(initialDraft.title ?? '');
      setAmount(initialDraft.amount != null ? String(initialDraft.amount) : '');
      setNarrative(initialDraft.narrative ?? '');
      setProjectId(initialDraft.projectId ?? '');
      setHavenWikiPageId(initialDraft.havenWikiPageId ?? '');
      setContributorPageId(initialDraft.contributorPageId ?? '');
    }

    void (async () => {
      try {
        const [projects, havens] = await Promise.all([
          listDowntimeProjects(campaignHandle),
          fetchDowntimeHavens(campaignHandle),
        ]);
        setProjectOptions(
          projects.map((project: { id: string; title: string }) => ({
            id: project.id,
            label: project.title,
          })),
        );
        setHavenOptions(
          havens.map((haven: { wikiPageId: string; title: string }) => ({
            id: haven.wikiPageId,
            label: haven.title,
          })),
        );
      } catch {
        setProjectOptions([]);
        setHavenOptions([]);
      }
    })();
  }, [open, editingLine, acceptingSuggestion, initialDraft, campaignHandle]);

  const contextHint = useMemo(
    () =>
      `Optional one-line context (max ${LEDGER_NARRATIVE_MAX_LENGTH} chars) — e.g. "Paid half upfront"`,
    [],
  );

  if (!open) return null;

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);

    const parsedAmount = Number.parseInt(amount.trim(), 10);
    if (!title.trim()) {
      setError('Title is required.');
      setSubmitting(false);
      return;
    }
    if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
      setError('Amount must be a positive number.');
      setSubmitting(false);
      return;
    }

    try {
      const payload = {
        entryKind,
        category,
        title: title.trim(),
        amount: parsedAmount,
        narrative: narrative.trim() || null,
        projectId: projectId || null,
        havenWikiPageId: havenWikiPageId || null,
        contributorPageId: contributorPageId || null,
      };

      if (isAcceptingSuggestion && acceptingSuggestion) {
        await acceptLedgerSuggestion(campaignHandle, acceptingSuggestion.id, payload);
      } else if (isEditing && editingLine) {
        await updateLedgerEntry(campaignHandle, editingLine.id, payload);
      } else {
        await createLedgerEntry(campaignHandle, payload);
      }

      onSaved();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save entry.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="ledger-entry-modal-title"
        className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-lg border border-border bg-background p-5 shadow-xl"
      >
        <div className="mb-4 flex items-start justify-between gap-3">
          <h2 id="ledger-entry-modal-title" className="text-lg font-semibold">
            {modalTitle}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
            aria-label="Close"
          >
            <X className="size-4" />
          </button>
        </div>

        {isAcceptingSuggestion ? (
          <p className="mb-4 text-sm text-muted-foreground">
            Confirm or adjust this suggested treasury event before it affects the balance.
          </p>
        ) : null}

        <form onSubmit={(event) => void handleSubmit(event)} className="space-y-4">
          <div>
            <label className="text-sm text-muted-foreground" htmlFor="ledger-entry-kind">
              Type
            </label>
            <select
              id="ledger-entry-kind"
              className={fieldClass}
              value={entryKind}
              onChange={(event) => setEntryKind(event.target.value as LedgerEntryKind)}
            >
              {LEDGER_ENTRY_KINDS.map((kind) => (
                <option key={kind} value={kind}>
                  {formatEntryKindLabel(kind)}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-sm text-muted-foreground" htmlFor="ledger-entry-category">
              Category
            </label>
            <select
              id="ledger-entry-category"
              className={fieldClass}
              value={category}
              onChange={(event) => setCategory(event.target.value as LedgerCategory)}
            >
              {LEDGER_CATEGORIES.map((value) => (
                <option key={value} value={value}>
                  {formatLedgerCategoryLabel(value)}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-sm text-muted-foreground" htmlFor="ledger-entry-title">
              Title
            </label>
            <input
              id="ledger-entry-title"
              className={fieldClass}
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="Ship repairs"
              required
            />
          </div>

          <div>
            <label className="text-sm text-muted-foreground" htmlFor="ledger-entry-amount">
              Amount
            </label>
            <input
              id="ledger-entry-amount"
              className={fieldClass}
              inputMode="numeric"
              value={amount}
              onChange={(event) => setAmount(event.target.value.replace(/[^\d]/g, ''))}
              placeholder="450"
              required
            />
          </div>

          <div>
            <label className="text-sm text-muted-foreground" htmlFor="ledger-entry-context">
              Context (optional)
            </label>
            <input
              id="ledger-entry-context"
              className={fieldClass}
              value={narrative}
              maxLength={LEDGER_NARRATIVE_MAX_LENGTH}
              onChange={(event) => setNarrative(event.target.value)}
              placeholder="Paid half upfront"
            />
            <p className="mt-1 text-xs text-muted-foreground">{contextHint}</p>
          </div>

          {showContributor && characterOptions.length > 0 ? (
            <div>
              <label className="text-sm text-muted-foreground" htmlFor="ledger-entry-contributor">
                Contributor (optional)
              </label>
              <select
                id="ledger-entry-contributor"
                className={fieldClass}
                value={contributorPageId}
                onChange={(event) => setContributorPageId(event.target.value)}
              >
                <option value="">Party (unspecified)</option>
                {characterOptions.map((option) => (
                  <option key={option.id} value={option.id}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
          ) : null}

          {projectOptions.length > 0 ? (
            <div>
              <label className="text-sm text-muted-foreground" htmlFor="ledger-entry-project">
                Linked project (optional)
              </label>
              <select
                id="ledger-entry-project"
                className={fieldClass}
                value={projectId}
                onChange={(event) => setProjectId(event.target.value)}
              >
                <option value="">None</option>
                {projectOptions.map((option) => (
                  <option key={option.id} value={option.id}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
          ) : null}

          {havenOptions.length > 0 ? (
            <div>
              <label className="text-sm text-muted-foreground" htmlFor="ledger-entry-haven">
                Linked haven (optional)
              </label>
              <select
                id="ledger-entry-haven"
                className={fieldClass}
                value={havenWikiPageId}
                onChange={(event) => setHavenWikiPageId(event.target.value)}
              >
                <option value="">None</option>
                {havenOptions.map((option) => (
                  <option key={option.id} value={option.id}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
          ) : null}

          {error ? (
            <p className="rounded bg-red-950/40 px-3 py-2 text-sm text-red-300">{error}</p>
          ) : null}

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-md border border-border px-3 py-1.5 text-sm text-muted-foreground hover:text-foreground"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground disabled:opacity-60"
            >
              {submitting
                ? 'Saving…'
                : isAcceptingSuggestion
                  ? 'Accept entry'
                  : isEditing
                    ? 'Save changes'
                    : 'Add entry'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
