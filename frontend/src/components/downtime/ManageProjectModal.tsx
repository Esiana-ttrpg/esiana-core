import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { X } from 'lucide-react';
import {
  DEFAULT_PROJECT_TYPE,
  OPERATION_POSTURES,
  PROJECT_PRIORITIES,
  PROJECT_STATUSES,
  PROJECT_TYPES,
  formatOperationPostureLabel,
  isTerminalProjectStatus,
  isValidProjectStatusTransition,
  type OperationPosture,
  type ProjectBlockerEntry,
  type ProjectOutcomeEntry,
  type ProjectPriority,
  type ProjectResourceEntry,
  type ProjectStatus,
  type ProjectType,
} from '@shared/projectMetadata';
import { IdentityPagePicker } from '@/components/campaign/IdentityPagePicker';
import {
  deleteDowntimeProject,
  durationInputToMinutes,
  fetchDowntimeProject,
  updateDowntimeProject,
} from '@/lib/downtime';
import { campaignWikiPath } from '@/lib/campaignPaths';
import type { WikiTreeNode } from '@/types/wiki';

interface ManageProjectModalProps {
  open: boolean;
  campaignHandle: string;
  projectId: string;
  flatPages: WikiTreeNode[];
  onClose: () => void;
  onUpdated?: () => void;
}

const fieldClass =
  'mt-1 w-full rounded border border-border bg-background px-2.5 py-1.5 text-sm text-foreground outline-none transition-colors focus:border-primary/60';
const sectionClass = 'space-y-3 border-t border-border/60 pt-4 first:border-t-0 first:pt-0';

const MINUTES_PER_DAY = 1440;

function nextDraftId(): string {
  return `draft-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function minutesToDurationFields(minutes: string): { amount: string; unit: 'days' | 'weeks' } {
  const total = Number(minutes);
  if (!Number.isFinite(total) || total <= 0) {
    return { amount: '', unit: 'weeks' };
  }
  const days = total / MINUTES_PER_DAY;
  if (days >= 7 && Math.abs(days / 7 - Math.round(days / 7)) < 0.01) {
    return { amount: String(Math.round(days / 7)), unit: 'weeks' };
  }
  return { amount: String(Math.round(days)), unit: 'days' };
}

function formatProjectTypeLabel(type: ProjectType): string {
  return type.charAt(0).toUpperCase() + type.slice(1);
}

function formatStatusOption(status: ProjectStatus): string {
  return status.charAt(0) + status.slice(1).toLowerCase().replace(/_/g, ' ');
}

export function ManageProjectModal({
  open,
  campaignHandle,
  projectId,
  flatPages,
  onClose,
  onUpdated,
}: ManageProjectModalProps) {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [title, setTitle] = useState('');
  const [projectType, setProjectType] = useState<ProjectType>(DEFAULT_PROJECT_TYPE);
  const [status, setStatus] = useState<ProjectStatus>('PLANNED');
  const [priority, setPriority] = useState<ProjectPriority | ''>('normal');
  const [operationPosture, setOperationPosture] = useState<OperationPosture | ''>('');
  const [durationAmount, setDurationAmount] = useState('');
  const [durationUnit, setDurationUnit] = useState<'days' | 'weeks'>('weeks');
  const [ownerPageId, setOwnerPageId] = useState<string | null>(null);
  const [havenPageId, setHavenPageId] = useState<string | null>(null);
  const [resources, setResources] = useState<ProjectResourceEntry[]>([]);
  const [blockers, setBlockers] = useState<ProjectBlockerEntry[]>([]);
  const [outcomes, setOutcomes] = useState<ProjectOutcomeEntry[]>([]);
  const [resourceDraft, setResourceDraft] = useState('');
  const [blockerDraft, setBlockerDraft] = useState('');
  const [treasuryOutcomeAmount, setTreasuryOutcomeAmount] = useState('');
  const [treasuryOutcomeKind, setTreasuryOutcomeKind] = useState<'credit' | 'debit'>('credit');
  const [treasuryOutcomeTitle, setTreasuryOutcomeTitle] = useState('');

  const isTerminal = isTerminalProjectStatus(status);

  const allowedStatuses = useMemo(
    () =>
      PROJECT_STATUSES.filter(
        (candidate) => candidate === status || isValidProjectStatusTransition(status, candidate),
      ),
    [status],
  );

  useEffect(() => {
    if (!open) return;

    let cancelled = false;
    setLoading(true);
    setError(null);

    void fetchDowntimeProject(campaignHandle, projectId)
      .then((project) => {
        if (cancelled) return;
        setTitle(project.title);
        setProjectType(project.projectType);
        setStatus(project.status);
        setPriority(project.priority ?? 'normal');
        setOperationPosture(project.operationPosture ?? '');
        setOwnerPageId(project.ownerPageId);
        setHavenPageId(project.havenPageId);
        setResources(project.resources);
        setBlockers(project.blockers);
        setOutcomes(project.outcomes);

        const duration = minutesToDurationFields(project.durationTotalMinutes);
        setDurationAmount(duration.amount);
        setDurationUnit(duration.unit);

        const treasuryOutcome = project.outcomes.find(
          (o) => o.outcomeKind === 'treasury_effect' && o.treasuryEffect,
        );
        if (treasuryOutcome?.treasuryEffect) {
          setTreasuryOutcomeAmount(String(treasuryOutcome.treasuryEffect.amount));
          setTreasuryOutcomeKind(treasuryOutcome.treasuryEffect.kind);
          setTreasuryOutcomeTitle(treasuryOutcome.treasuryEffect.title ?? '');
        } else {
          setTreasuryOutcomeAmount('');
          setTreasuryOutcomeKind('credit');
          setTreasuryOutcomeTitle('');
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to load project.');
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [open, campaignHandle, projectId]);

  if (!open) return null;

  function addResource() {
    const label = resourceDraft.trim();
    if (!label) return;
    setResources((prev) => [
      ...prev,
      {
        id: nextDraftId(),
        label,
        quantity: null,
        unit: null,
        satisfied: false,
        linkedPageId: null,
        sourceKind: 'manual',
      },
    ]);
    setResourceDraft('');
  }

  function addBlocker() {
    const label = blockerDraft.trim();
    if (!label) return;
    setBlockers((prev) => [
      ...prev,
      {
        id: nextDraftId(),
        label,
        description: null,
        resolved: false,
        linkedPageId: null,
      },
    ]);
    setBlockerDraft('');
  }

  function buildOutcomesPayload(): ProjectOutcomeEntry[] {
    const withoutTreasury = outcomes.filter((o) => o.outcomeKind !== 'treasury_effect');
    const parsedAmount = Number(treasuryOutcomeAmount.replace(/[^\d]/g, ''));
    if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
      return withoutTreasury;
    }

    const existing = outcomes.find((o) => o.outcomeKind === 'treasury_effect');
    const treasuryOutcome: ProjectOutcomeEntry = {
      id: existing?.id ?? nextDraftId(),
      outcomeKind: 'treasury_effect',
      description: existing?.description ?? null,
      linkedPageIds: existing?.linkedPageIds ?? [],
      status: existing?.status ?? 'pending',
      treasuryEffect: {
        amount: Math.floor(parsedAmount),
        kind: treasuryOutcomeKind,
        category: treasuryOutcomeKind === 'credit' ? 'income' : 'project',
        title: treasuryOutcomeTitle.trim() || null,
      },
    };
    return [...withoutTreasury, treasuryOutcome];
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;

    setSubmitting(true);
    setError(null);

    try {
      const amount = Number(durationAmount);
      const durationTotalMinutes = durationInputToMinutes(amount, durationUnit);

      await updateDowntimeProject(campaignHandle, projectId, {
        title: title.trim(),
        projectType,
        status,
        priority: priority || null,
        operationPosture: operationPosture || null,
        durationTotalMinutes,
        ownerPageId,
        havenPageId,
        resources,
        blockers,
        outcomes: buildOutcomesPayload(),
      });

      onUpdated?.();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save operation.');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete() {
    if (!window.confirm('Delete this planned operation? This cannot be undone.')) return;
    setSubmitting(true);
    setError(null);
    try {
      await deleteDowntimeProject(campaignHandle, projectId);
      onClose();
      if (havenPageId) {
        navigate(campaignWikiPath(campaignHandle, havenPageId, flatPages));
      } else {
        navigate(-1);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete operation.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="flex max-h-[90vh] w-full max-w-lg flex-col rounded-lg border border-border bg-background shadow-lg">
        <div className="flex shrink-0 items-center justify-between border-b border-border px-4 py-3">
          <h2 className="text-lg font-semibold">Manage operation</h2>
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
            {loading ? (
              <p className="text-sm text-muted-foreground">Loading…</p>
            ) : (
              <>
                <section className={sectionClass}>
                  <label className="block text-sm text-muted-foreground">
                    Title
                    <input
                      className={fieldClass}
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      required
                      disabled={isTerminal}
                    />
                  </label>

                  <label className="block text-sm text-muted-foreground">
                    Operation type
                    <select
                      className={fieldClass}
                      value={projectType}
                      onChange={(e) => setProjectType(e.target.value as ProjectType)}
                      disabled={isTerminal}
                    >
                      {PROJECT_TYPES.map((type) => (
                        <option key={type} value={type}>
                          {formatProjectTypeLabel(type)}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label className="block text-sm text-muted-foreground">
                    Priority
                    <select
                      className={fieldClass}
                      value={priority}
                      onChange={(e) => setPriority(e.target.value as ProjectPriority | '')}
                      disabled={isTerminal}
                    >
                      {PROJECT_PRIORITIES.map((p) => (
                        <option key={p} value={p}>
                          {p.charAt(0).toUpperCase() + p.slice(1)}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label className="block text-sm text-muted-foreground">
                    Posture
                    <select
                      className={fieldClass}
                      value={operationPosture}
                      onChange={(e) =>
                        setOperationPosture((e.target.value as OperationPosture) || '')
                      }
                    >
                      <option value="">None</option>
                      {OPERATION_POSTURES.map((posture) => (
                        <option key={posture} value={posture}>
                          {formatOperationPostureLabel(posture)}
                        </option>
                      ))}
                    </select>
                  </label>
                </section>

                <section className={sectionClass}>
                  <label className="block text-sm text-muted-foreground">
                    Status
                    <select
                      className={fieldClass}
                      value={status}
                      onChange={(e) => setStatus(e.target.value as ProjectStatus)}
                      disabled={isTerminal}
                    >
                      {allowedStatuses.map((s) => (
                        <option key={s} value={s}>
                          {formatStatusOption(s)}
                        </option>
                      ))}
                    </select>
                  </label>

                  <div className="grid grid-cols-2 gap-3">
                    <label className="block text-sm text-muted-foreground">
                      Expected duration
                      <input
                        className={fieldClass}
                        inputMode="numeric"
                        value={durationAmount}
                        onChange={(e) =>
                          setDurationAmount(e.target.value.replace(/[^\d.]/g, ''))
                        }
                        disabled={isTerminal}
                      />
                    </label>
                    <label className="block text-sm text-muted-foreground">
                      Unit
                      <select
                        className={fieldClass}
                        value={durationUnit}
                        onChange={(e) =>
                          setDurationUnit(e.target.value as 'days' | 'weeks')
                        }
                        disabled={isTerminal}
                      >
                        <option value="days">Days</option>
                        <option value="weeks">Weeks</option>
                      </select>
                    </label>
                  </div>
                </section>

                <section className={sectionClass}>
                  <label className="block text-sm text-muted-foreground">
                    Led by
                    <IdentityPagePicker
                      flatPages={flatPages}
                      value={ownerPageId}
                      onChange={setOwnerPageId}
                      placeholder="Character or faction page"
                    />
                  </label>
                  <label className="block text-sm text-muted-foreground">
                    Linked haven
                    <IdentityPagePicker
                      flatPages={flatPages}
                      value={havenPageId}
                      onChange={setHavenPageId}
                      placeholder="Haven wiki page"
                    />
                  </label>
                </section>

                {!isTerminal ? (
                  <>
                    <section className={sectionClass}>
                      <p className="text-sm font-medium text-foreground">Requirements</p>
                      {resources.map((resource) => (
                        <div
                          key={resource.id}
                          className="flex items-center gap-2 rounded border border-border px-2 py-1.5"
                        >
                          <input
                            type="checkbox"
                            checked={resource.satisfied}
                            onChange={(e) =>
                              setResources((prev) =>
                                prev.map((r) =>
                                  r.id === resource.id
                                    ? { ...r, satisfied: e.target.checked }
                                    : r,
                                ),
                              )
                            }
                          />
                          <span className="min-w-0 flex-1 text-sm">{resource.label}</span>
                          <button
                            type="button"
                            className="text-xs text-muted-foreground hover:text-red-400"
                            onClick={() =>
                              setResources((prev) =>
                                prev.filter((r) => r.id !== resource.id),
                              )
                            }
                          >
                            Remove
                          </button>
                        </div>
                      ))}
                      <div className="flex gap-2">
                        <input
                          className={fieldClass}
                          value={resourceDraft}
                          onChange={(e) => setResourceDraft(e.target.value)}
                          placeholder="Add requirement"
                        />
                        <button
                          type="button"
                          onClick={addResource}
                          className="shrink-0 rounded border border-border px-3 py-1.5 text-sm"
                        >
                          Add
                        </button>
                      </div>
                    </section>

                    <section className={sectionClass}>
                      <p className="text-sm font-medium text-foreground">Obstacles</p>
                      {blockers.map((blocker) => (
                        <div
                          key={blocker.id}
                          className="flex items-center gap-2 rounded border border-border px-2 py-1.5"
                        >
                          <input
                            type="checkbox"
                            checked={blocker.resolved}
                            onChange={(e) =>
                              setBlockers((prev) =>
                                prev.map((b) =>
                                  b.id === blocker.id
                                    ? { ...b, resolved: e.target.checked }
                                    : b,
                                ),
                              )
                            }
                          />
                          <span className="min-w-0 flex-1 text-sm">{blocker.label}</span>
                          <button
                            type="button"
                            className="text-xs text-muted-foreground hover:text-red-400"
                            onClick={() =>
                              setBlockers((prev) => prev.filter((b) => b.id !== blocker.id))
                            }
                          >
                            Remove
                          </button>
                        </div>
                      ))}
                      <div className="flex gap-2">
                        <input
                          className={fieldClass}
                          value={blockerDraft}
                          onChange={(e) => setBlockerDraft(e.target.value)}
                          placeholder="Add obstacle"
                        />
                        <button
                          type="button"
                          onClick={addBlocker}
                          className="shrink-0 rounded border border-border px-3 py-1.5 text-sm"
                        >
                          Add
                        </button>
                      </div>
                    </section>

                    <details className={sectionClass}>
                      <summary className="cursor-pointer text-sm font-medium text-foreground">
                        Treasury impact (optional)
                      </summary>
                      <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
                        <label className="block text-sm text-muted-foreground">
                          Completion payout
                          <input
                            className={fieldClass}
                            inputMode="numeric"
                            value={treasuryOutcomeAmount}
                            onChange={(e) =>
                              setTreasuryOutcomeAmount(e.target.value.replace(/[^\d]/g, ''))
                            }
                          />
                        </label>
                        <label className="block text-sm text-muted-foreground">
                          Direction
                          <select
                            className={fieldClass}
                            value={treasuryOutcomeKind}
                            onChange={(e) =>
                              setTreasuryOutcomeKind(e.target.value as 'credit' | 'debit')
                            }
                          >
                            <option value="credit">Credit</option>
                            <option value="debit">Debit</option>
                          </select>
                        </label>
                        <label className="col-span-full block text-sm text-muted-foreground">
                          Label
                          <input
                            className={fieldClass}
                            value={treasuryOutcomeTitle}
                            onChange={(e) => setTreasuryOutcomeTitle(e.target.value)}
                          />
                        </label>
                      </div>
                    </details>
                  </>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    Terminal operations retain world history — edit lore for narrative notes.
                  </p>
                )}

                {status === 'PLANNED' ? (
                  <section className={sectionClass}>
                    <button
                      type="button"
                      onClick={() => void handleDelete()}
                      disabled={submitting}
                      className="text-sm text-red-400 hover:text-red-300"
                    >
                      Delete planned operation
                    </button>
                  </section>
                ) : null}
              </>
            )}

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
              disabled={submitting || loading || !title.trim() || isTerminal}
              className="rounded bg-primary px-4 py-2 text-sm text-primary-foreground disabled:opacity-50"
            >
              {submitting ? 'Saving…' : 'Save changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
