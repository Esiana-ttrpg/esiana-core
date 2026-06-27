import { TYPE_DISPLAY_CLASS } from '@/lib/surfaceLayout';
import { useEffect, useState, type FormEvent } from 'react';
import { X } from 'lucide-react';
import {
  createScheduledEffect,
  type CreateScheduledEffectInput,
  type RecurrencePreset,
  type ScheduledTreasuryPrefill,
} from '@/lib/downtimeScheduledEffects';

interface AddScheduledTreasuryModalProps {
  open: boolean;
  campaignHandle: string;
  initialPrefill?: ScheduledTreasuryPrefill | null;
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

export function AddScheduledTreasuryModal({
  open,
  campaignHandle,
  initialPrefill,
  onClose,
  onSaved,
}: AddScheduledTreasuryModalProps) {
  const [effectKind, setEffectKind] = useState<CreateScheduledEffectInput['effectKind']>(
    'ledger_upkeep',
  );
  const [title, setTitle] = useState('');
  const [amount, setAmount] = useState('');
  const [narrative, setNarrative] = useState('');
  const [recurrencePreset, setRecurrencePreset] =
    useState<RecurrencePreset>('monthly_calendar');
  const [dayOfMonth, setDayOfMonth] = useState('1');
  const [havenWikiPageId, setHavenWikiPageId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setError(null);
    if (initialPrefill) {
      setEffectKind(initialPrefill.effectKind);
      setTitle(initialPrefill.title);
      setAmount(String(initialPrefill.amount));
      setHavenWikiPageId(initialPrefill.havenWikiPageId ?? null);
      setRecurrencePreset(initialPrefill.recurrencePreset ?? 'monthly_calendar');
    } else {
      setEffectKind('ledger_income');
      setTitle('');
      setAmount('');
      setNarrative('');
      setRecurrencePreset('monthly_calendar');
      setDayOfMonth('1');
      setHavenWikiPageId(null);
    }
  }, [open, initialPrefill]);

  if (!open) return null;

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);

    const parsedAmount = Number.parseInt(amount.trim(), 10);
    if (!Number.isFinite(parsedAmount) || parsedAmount < 0) {
      setError('Enter a valid amount.');
      return;
    }
    if (!title.trim()) {
      setError('Title is required.');
      return;
    }

    setSubmitting(true);
    try {
      await createScheduledEffect(campaignHandle, {
        effectKind,
        title: title.trim(),
        narrative: narrative.trim() || null,
        amount: parsedAmount,
        recurrencePreset,
        dayOfMonth:
          recurrencePreset === 'monthly_calendar'
            ? Number.parseInt(dayOfMonth, 10) || 1
            : undefined,
        havenWikiPageId,
      });
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
        aria-labelledby="scheduled-treasury-title"
        className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-lg border border-border bg-elevated p-5 shadow-xl"
      >
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <h2 id="scheduled-treasury-title" className={TYPE_DISPLAY_CLASS}>
              Add recurring treasury schedule
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Fires treasury suggestions when time advances — you still approve each entry.
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
                setEffectKind(event.target.value as CreateScheduledEffectInput['effectKind'])
              }
            >
              <option value="ledger_upkeep">Recurring upkeep (debit)</option>
              <option value="ledger_income">Periodic income (credit)</option>
            </select>
          </label>

          <label className="block text-sm text-muted-foreground">
            Title
            <input
              className={fieldClass}
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="Guild dues"
              required
            />
          </label>

          <label className="block text-sm text-muted-foreground">
            Amount
            <input
              className={fieldClass}
              inputMode="numeric"
              value={amount}
              onChange={(event) => setAmount(event.target.value.replace(/[^\d]/g, ''))}
              placeholder="120"
              required
            />
          </label>

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
            Context (optional)
            <input
              className={fieldClass}
              value={narrative}
              onChange={(event) => setNarrative(event.target.value)}
              placeholder="Paid to the harbor master"
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
