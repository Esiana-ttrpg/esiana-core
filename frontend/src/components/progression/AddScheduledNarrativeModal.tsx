import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { X } from 'lucide-react';
import type { NarrativeScheduledEffectKind } from '@shared/scheduledEffectMetadata';
import { SCHEDULED_EFFECT_KIND_LABELS } from '@shared/scheduledEffectMetadata';
import type { WikiTreeNode } from '@/types/wiki';
import { fetchDowntimeHavens, type DowntimeHavenDetail } from '@/lib/downtime';
import {
  createNarrativeScheduledEffect,
  type CreateNarrativeScheduledEffectInput,
  type RecurrencePreset,
} from '@/lib/downtimeScheduledEffects';

interface AddScheduledNarrativeModalProps {
  open: boolean;
  campaignHandle: string;
  organizationPages: WikiTreeNode[];
  onClose: () => void;
  onSaved: () => void | Promise<void>;
}

const fieldClass =
  'mt-1 w-full rounded border border-border bg-background px-2.5 py-1.5 text-sm text-foreground outline-none transition-colors focus:border-primary/60';

const RECURRENCE_OPTIONS: { value: RecurrencePreset; label: string }[] = [
  { value: 'monthly_calendar', label: 'Monthly (calendar day)' },
  { value: 'weekly', label: 'Every week' },
  { value: 'biweekly', label: 'Every 2 weeks' },
  { value: 'every_7_days', label: 'Every 7 days' },
  { value: 'every_14_days', label: 'Every 14 days' },
  { value: 'every_30_days', label: 'Every 30 days' },
];

export function AddScheduledNarrativeModal({
  open,
  campaignHandle,
  organizationPages,
  onClose,
  onSaved,
}: AddScheduledNarrativeModalProps) {
  const [effectKind, setEffectKind] = useState<NarrativeScheduledEffectKind>(
    'world_development_prompt',
  );
  const [title, setTitle] = useState('');
  const [narrative, setNarrative] = useState('');
  const [recurrencePreset, setRecurrencePreset] =
    useState<RecurrencePreset>('monthly_calendar');
  const [dayOfMonth, setDayOfMonth] = useState('1');
  const [primaryOrgPageId, setPrimaryOrgPageId] = useState('');
  const [havenWikiPageId, setHavenWikiPageId] = useState('');
  const [havens, setHavens] = useState<DowntimeHavenDetail[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const sortedOrgs = useMemo(
    () => [...organizationPages].sort((a, b) => a.title.localeCompare(b.title)),
    [organizationPages],
  );

  useEffect(() => {
    if (!open) return;
    setError(null);
    setEffectKind('world_development_prompt');
    setTitle('');
    setNarrative('');
    setRecurrencePreset('monthly_calendar');
    setDayOfMonth('1');
    setPrimaryOrgPageId('');
    setHavenWikiPageId('');
    void fetchDowntimeHavens(campaignHandle)
      .then(setHavens)
      .catch(() => setHavens([]));
  }, [open, campaignHandle]);

  if (!open) return null;

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);

    if (!title.trim()) {
      setError('Title is required.');
      return;
    }
    if (effectKind === 'haven_threat_prompt' && !havenWikiPageId) {
      setError('Select a haven for haven threat prompts.');
      return;
    }

    const input: CreateNarrativeScheduledEffectInput = {
      effectKind,
      title: title.trim(),
      narrative: narrative.trim() || null,
      recurrencePreset,
      dayOfMonth:
        recurrencePreset === 'monthly_calendar'
          ? Number.parseInt(dayOfMonth, 10) || 1
          : undefined,
    };

    if (effectKind === 'world_development_prompt' && primaryOrgPageId) {
      input.primaryOrgPageId = primaryOrgPageId;
    }
    if (effectKind === 'haven_threat_prompt') {
      input.havenWikiPageId = havenWikiPageId;
    }

    setSubmitting(true);
    try {
      await createNarrativeScheduledEffect(campaignHandle, input);
      await onSaved();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to create schedule.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="scheduled-narrative-title"
        className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-lg border border-border bg-elevated p-5 shadow-xl"
      >
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <h2 id="scheduled-narrative-title" className="text-lg font-semibold text-foreground">
              Add narrative schedule
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Fires world-development suggestions when campaign time advances.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded p-1 text-muted-foreground hover:text-foreground"
            aria-label="Close"
          >
            <X className="size-5" />
          </button>
        </div>

        <form onSubmit={(event) => void handleSubmit(event)} className="space-y-4">
          <label className="block text-sm text-muted-foreground">
            Type
            <select
              className={fieldClass}
              value={effectKind}
              onChange={(event) =>
                setEffectKind(event.target.value as NarrativeScheduledEffectKind)
              }
            >
              <option value="world_development_prompt">
                {SCHEDULED_EFFECT_KIND_LABELS.world_development_prompt}
              </option>
              <option value="haven_threat_prompt">
                {SCHEDULED_EFFECT_KIND_LABELS.haven_threat_prompt}
              </option>
            </select>
          </label>

          <label className="block text-sm text-muted-foreground">
            Title
            <input
              className={fieldClass}
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="Spring festival pressure"
              required
            />
          </label>

          {effectKind === 'world_development_prompt' ? (
            <label className="block text-sm text-muted-foreground">
              Faction / organization (optional)
              <select
                className={fieldClass}
                value={primaryOrgPageId}
                onChange={(event) => setPrimaryOrgPageId(event.target.value)}
              >
                <option value="">Campaign-wide</option>
                {sortedOrgs.map((page) => (
                  <option key={page.id} value={page.id}>
                    {page.title}
                  </option>
                ))}
              </select>
            </label>
          ) : (
            <label className="block text-sm text-muted-foreground">
              Haven
              <select
                className={fieldClass}
                value={havenWikiPageId}
                onChange={(event) => setHavenWikiPageId(event.target.value)}
                required
              >
                <option value="">Select a haven…</option>
                {havens.map((haven) => (
                  <option key={haven.id} value={haven.wikiPageId}>
                    {haven.title}
                  </option>
                ))}
              </select>
            </label>
          )}

          <label className="block text-sm text-muted-foreground">
            Recurrence
            <select
              className={fieldClass}
              value={recurrencePreset}
              onChange={(event) =>
                setRecurrencePreset(event.target.value as RecurrencePreset)
              }
            >
              {RECURRENCE_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>

          {recurrencePreset === 'monthly_calendar' ? (
            <label className="block text-sm text-muted-foreground">
              Day of month (1–28)
              <input
                className={fieldClass}
                inputMode="numeric"
                value={dayOfMonth}
                onChange={(event) =>
                  setDayOfMonth(event.target.value.replace(/[^\d]/g, '').slice(0, 2))
                }
              />
            </label>
          ) : null}

          <label className="block text-sm text-muted-foreground">
            Narrative context (optional)
            <textarea
              className={`${fieldClass} min-h-[4rem] resize-y`}
              value={narrative}
              onChange={(event) => setNarrative(event.target.value)}
              placeholder="Seasonal trade fair draws rival merchants…"
            />
          </label>

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
              {submitting ? 'Saving…' : 'Create schedule'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
