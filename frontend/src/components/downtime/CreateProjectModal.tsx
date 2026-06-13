import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, X } from 'lucide-react';
import {
  DEFAULT_PROJECT_TYPE,
  OPERATION_POSTURES,
  PROJECT_TYPES,
  formatOperationPostureLabel,
  type OperationPosture,
  type ProjectType,
} from '@shared/projectMetadata';
import type { ProjectCreateConstraintKind } from '@/lib/downtime';
import { IdentityPagePicker } from '@/components/campaign/IdentityPagePicker';
import {
  createDowntimeProject,
  durationInputToMinutes,
  formatExpectedDurationHint,
} from '@/lib/downtime';
import { campaignWikiPath } from '@/lib/campaignPaths';
import type { WikiTreeNode } from '@/types/wiki';

interface CreateProjectModalProps {
  open: boolean;
  campaignHandle: string;
  flatPages: WikiTreeNode[];
  onClose: () => void;
  onCreated?: () => void;
}

type ConstraintDraft = {
  id: string;
  label: string;
  kind: ProjectCreateConstraintKind;
};

const fieldClass =
  'mt-1 w-full rounded border border-border bg-background px-2.5 py-1.5 text-sm text-foreground outline-none transition-colors focus:border-primary/60';
const sectionClass = 'space-y-3 border-t border-border/60 pt-4 first:border-t-0 first:pt-0';

function formatProjectTypeLabel(type: ProjectType): string {
  return type.charAt(0).toUpperCase() + type.slice(1);
}

function nextDraftId(): string {
  return `draft-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function CreateProjectModal({
  open,
  campaignHandle,
  flatPages,
  onClose,
  onCreated,
}: CreateProjectModalProps) {
  const navigate = useNavigate();
  const [title, setTitle] = useState('');
  const [projectType, setProjectType] = useState<ProjectType>(DEFAULT_PROJECT_TYPE);
  const [ownerPageId, setOwnerPageId] = useState<string | null>(null);
  const [durationAmount, setDurationAmount] = useState('');
  const [durationUnit, setDurationUnit] = useState<'days' | 'weeks'>('weeks');
  const [operationPosture, setOperationPosture] = useState<OperationPosture | ''>('');
  const [operationBrief, setOperationBrief] = useState('');
  const [stakes, setStakes] = useState('');
  const [constraints, setConstraints] = useState<ConstraintDraft[]>([]);
  const [constraintDraft, setConstraintDraft] = useState('');
  const [constraintKind, setConstraintKind] = useState<ProjectCreateConstraintKind>('requirement');
  const [treasuryProjectCost, setTreasuryProjectCost] = useState('');
  const [treasuryCompletionAmount, setTreasuryCompletionAmount] = useState('');
  const [treasuryCompletionKind, setTreasuryCompletionKind] = useState<'credit' | 'debit'>(
    'credit',
  );
  const [treasuryCompletionTitle, setTreasuryCompletionTitle] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const durationHint = useMemo(() => {
    const amount = Number(durationAmount);
    if (!durationAmount.trim() || !Number.isFinite(amount) || amount <= 0) {
      return 'Begins when created — duration optional.';
    }
    return formatExpectedDurationHint(amount, durationUnit);
  }, [durationAmount, durationUnit]);

  useEffect(() => {
    if (!open) {
      setTitle('');
      setProjectType(DEFAULT_PROJECT_TYPE);
      setOwnerPageId(null);
      setDurationAmount('');
      setDurationUnit('weeks');
      setOperationPosture('');
      setOperationBrief('');
      setStakes('');
      setConstraints([]);
      setConstraintDraft('');
      setConstraintKind('requirement');
      setTreasuryProjectCost('');
      setTreasuryCompletionAmount('');
      setTreasuryCompletionKind('credit');
      setTreasuryCompletionTitle('');
      setError(null);
    }
  }, [open]);

  if (!open) return null;

  function addConstraint() {
    const label = constraintDraft.trim();
    if (!label) return;
    setConstraints((prev) => [
      ...prev,
      { id: nextDraftId(), label, kind: constraintKind },
    ]);
    setConstraintDraft('');
  }

  function removeConstraint(id: string) {
    setConstraints((prev) => prev.filter((entry) => entry.id !== id));
  }

  function toggleConstraintKind(id: string) {
    setConstraints((prev) =>
      prev.map((entry) =>
        entry.id === id
          ? {
              ...entry,
              kind: entry.kind === 'requirement' ? 'obstacle' : 'requirement',
            }
          : entry,
      ),
    );
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;

    setSubmitting(true);
    setError(null);

    try {
      const amount = Number(durationAmount);
      const durationTotalMinutes = durationInputToMinutes(amount, durationUnit);

      const payloadConstraints = constraints.map(({ label, kind }) => ({ label, kind }));
      const parsedProjectCost = Number(treasuryProjectCost.replace(/[^\d]/g, ''));
      const parsedCompletionAmount = Number(treasuryCompletionAmount.replace(/[^\d]/g, ''));

      const project = await createDowntimeProject(campaignHandle, {
        title: title.trim(),
        operationBrief: operationBrief.trim() || undefined,
        stakes: stakes.trim() || undefined,
        constraints: payloadConstraints.length > 0 ? payloadConstraints : undefined,
        operationPosture: operationPosture || null,
        projectType,
        durationTotalMinutes,
        ownerPageId,
        treasuryProjectCost:
          Number.isFinite(parsedProjectCost) && parsedProjectCost > 0
            ? parsedProjectCost
            : null,
        treasuryCompletion:
          Number.isFinite(parsedCompletionAmount) && parsedCompletionAmount > 0
            ? {
                amount: parsedCompletionAmount,
                kind: treasuryCompletionKind,
                title: treasuryCompletionTitle.trim() || null,
              }
            : null,
      });

      onCreated?.();
      onClose();
      navigate(campaignWikiPath(campaignHandle, project.wikiPageId, flatPages));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to begin operation');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="flex max-h-[90vh] w-full max-w-lg flex-col rounded-lg border border-border bg-background shadow-lg">
        <div className="flex shrink-0 items-center justify-between border-b border-border px-4 py-3">
          <h2 className="text-lg font-semibold">Begin operation</h2>
          <button
            type="button"
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form
          onSubmit={(e) => void handleSubmit(e)}
          className="flex min-h-0 flex-1 flex-col"
        >
          <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-4 py-4">
            <section className={sectionClass}>
              <h3 className="text-sm font-medium text-foreground">Identity</h3>

              <label className="block text-sm text-muted-foreground">
                Operation title
                <input
                  className={fieldClass}
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Temple reconstruction"
                  required
                />
              </label>

              <label className="block text-sm text-muted-foreground">
                Operation type
                <select
                  className={fieldClass}
                  value={projectType}
                  onChange={(e) => setProjectType(e.target.value as ProjectType)}
                >
                  {PROJECT_TYPES.map((type) => (
                    <option key={type} value={type}>
                      {formatProjectTypeLabel(type)}
                    </option>
                  ))}
                </select>
              </label>

              <div className="block text-sm text-muted-foreground">
                <span>Led by</span>
                <p className="mt-0.5 text-xs">Who is leading or sponsoring this operation?</p>
                <div className="mt-1">
                  <IdentityPagePicker
                    flatPages={flatPages}
                    value={ownerPageId}
                    onChange={setOwnerPageId}
                    placeholder="Search characters, factions, havens…"
                  />
                </div>
              </div>

              <div className="block text-sm text-muted-foreground">
                <span>Expected duration</span>
                <div className="mt-1 flex gap-2">
                  <input
                    type="number"
                    min={1}
                    className={`${fieldClass} mt-0 flex-1`}
                    value={durationAmount}
                    onChange={(e) => setDurationAmount(e.target.value)}
                    placeholder="2"
                  />
                  <select
                    className={`${fieldClass} mt-0 w-28 shrink-0`}
                    value={durationUnit}
                    onChange={(e) => setDurationUnit(e.target.value as 'days' | 'weeks')}
                  >
                    <option value="days">Days</option>
                    <option value="weeks">Weeks</option>
                  </select>
                </div>
                {durationHint ? (
                  <p className="mt-1 text-xs text-muted-foreground/90">{durationHint}</p>
                ) : null}
              </div>

              <label className="block text-sm text-muted-foreground">
                Current posture
                <select
                  className={fieldClass}
                  value={operationPosture}
                  onChange={(e) =>
                    setOperationPosture(e.target.value as OperationPosture | '')
                  }
                >
                  <option value="">— Optional —</option>
                  {OPERATION_POSTURES.map((posture) => (
                    <option key={posture} value={posture}>
                      {formatOperationPostureLabel(posture)}
                    </option>
                  ))}
                </select>
              </label>
            </section>

            <section className={sectionClass}>
              <h3 className="text-sm font-medium text-foreground">Operation brief</h3>
              <label className="block text-sm text-muted-foreground">
                What is this operation attempting to achieve?
                <textarea
                  className={`${fieldClass} min-h-[120px] resize-y`}
                  rows={5}
                  value={operationBrief}
                  onChange={(e) => setOperationBrief(e.target.value)}
                  placeholder="Rebuild the shrine walls before winter refugees arrive…"
                />
              </label>
            </section>

            <section className={sectionClass}>
              <h3 className="text-sm font-medium text-foreground">Stakes</h3>
              <label className="block text-sm text-muted-foreground">
                What is at stake if this succeeds, stalls, or fails?
                <textarea
                  className={`${fieldClass} min-h-[80px] resize-y`}
                  rows={3}
                  value={stakes}
                  onChange={(e) => setStakes(e.target.value)}
                  placeholder="Winter refugees will overwhelm the shrine if the walls are unfinished…"
                />
              </label>
            </section>

            <section className={sectionClass}>
              <h3 className="text-sm font-medium text-foreground">What stands in the way?</h3>
              <p className="text-xs text-muted-foreground">
                Requirements and obstacles — fiction-first, not a dependency spreadsheet.
              </p>

              {constraints.length > 0 ? (
                <ul className="flex flex-col gap-2">
                  {constraints.map((entry) => (
                    <li
                      key={entry.id}
                      className="flex items-center gap-2 rounded-md border border-border/70 bg-muted/20 px-2 py-1.5"
                    >
                      <button
                        type="button"
                        onClick={() => toggleConstraintKind(entry.id)}
                        className={`shrink-0 rounded px-2 py-0.5 text-xs font-medium ${
                          entry.kind === 'requirement'
                            ? 'bg-primary/15 text-primary'
                            : 'bg-amber-950/40 text-amber-200'
                        }`}
                      >
                        {entry.kind === 'requirement' ? 'Requirement' : 'Obstacle'}
                      </button>
                      <span className="min-w-0 flex-1 text-sm text-foreground">{entry.label}</span>
                      <button
                        type="button"
                        onClick={() => removeConstraint(entry.id)}
                        className="shrink-0 text-muted-foreground hover:text-foreground"
                        aria-label={`Remove ${entry.label}`}
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </li>
                  ))}
                </ul>
              ) : null}

              <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
                <label className="block flex-1 text-sm text-muted-foreground">
                  Add entry
                  <input
                    className={fieldClass}
                    value={constraintDraft}
                    onChange={(e) => setConstraintDraft(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        addConstraint();
                      }
                    }}
                    placeholder="800 stone blocks, winter storms…"
                  />
                </label>
                <select
                  className={`${fieldClass} sm:w-36`}
                  value={constraintKind}
                  onChange={(e) =>
                    setConstraintKind(e.target.value as ProjectCreateConstraintKind)
                  }
                >
                  <option value="requirement">Requirement</option>
                  <option value="obstacle">Obstacle</option>
                </select>
                <button
                  type="button"
                  onClick={addConstraint}
                  disabled={!constraintDraft.trim()}
                  className="inline-flex shrink-0 items-center justify-center gap-1 rounded border border-border px-3 py-1.5 text-sm text-foreground hover:bg-muted disabled:opacity-50"
                >
                  <Plus className="h-4 w-4" />
                  Add
                </button>
              </div>
            </section>

            <details className={sectionClass}>
              <summary className="cursor-pointer text-sm font-medium text-foreground">
                Treasury impact (optional)
              </summary>
              <p className="mt-2 text-xs text-muted-foreground">
                On completion, the ledger may suggest line items for GM approval — never silent
                balance changes.
              </p>
              <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
                <label className="block text-sm text-muted-foreground">
                  Project cost (debit)
                  <input
                    className={fieldClass}
                    inputMode="numeric"
                    value={treasuryProjectCost}
                    onChange={(event) =>
                      setTreasuryProjectCost(event.target.value.replace(/[^\d]/g, ''))
                    }
                    placeholder="450"
                  />
                </label>
                <label className="block text-sm text-muted-foreground">
                  Completion payout amount
                  <input
                    className={fieldClass}
                    inputMode="numeric"
                    value={treasuryCompletionAmount}
                    onChange={(event) =>
                      setTreasuryCompletionAmount(event.target.value.replace(/[^\d]/g, ''))
                    }
                    placeholder="700"
                  />
                </label>
                <label className="block text-sm text-muted-foreground">
                  Payout direction
                  <select
                    className={fieldClass}
                    value={treasuryCompletionKind}
                    onChange={(event) =>
                      setTreasuryCompletionKind(event.target.value as 'credit' | 'debit')
                    }
                  >
                    <option value="credit">Credit (income / reward)</option>
                    <option value="debit">Debit (expense)</option>
                  </select>
                </label>
                <label className="block text-sm text-muted-foreground">
                  Payout label
                  <input
                    className={fieldClass}
                    value={treasuryCompletionTitle}
                    onChange={(event) => setTreasuryCompletionTitle(event.target.value)}
                    placeholder="Smuggling payout"
                  />
                </label>
              </div>
            </details>

            {error ? <p className="text-sm text-destructive">{error}</p> : null}
          </div>

          <div className="flex shrink-0 justify-end gap-2 border-t border-border px-4 py-3">
            <button
              type="button"
              onClick={onClose}
              className="rounded px-3 py-2 text-sm text-muted-foreground hover:bg-muted hover:text-foreground"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting || !title.trim()}
              className="inline-flex items-center justify-center gap-2 rounded bg-primary px-4 py-2 text-sm text-primary-foreground disabled:opacity-50"
            >
              <Plus className="h-4 w-4" />
              {submitting ? 'Beginning…' : 'Begin operation'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
