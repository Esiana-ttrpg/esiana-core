import { useEffect, useState, type FormEvent } from 'react';
import { X } from 'lucide-react';
import { controlClasses } from '@/components/ui/formStyles';
import { postSkipUpcomingSession } from '@/lib/campaignSchedule';
import type { UpcomingSessionSummary } from '@/types/notifications';

const REASON_MAX = 200;

export interface SkipSessionModalProps {
  open: boolean;
  campaignHandle: string;
  upcoming: UpcomingSessionSummary;
  autoScheduleDefault: boolean;
  isOneShot: boolean;
  onClose: () => void;
  onSkipped: () => void;
}

function formatSessionWhen(upcoming: UpcomingSessionSummary): string {
  if (!upcoming.plannedStartAt) return upcoming.sessionTitle;
  return new Intl.DateTimeFormat(undefined, {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
  }).format(new Date(upcoming.plannedStartAt));
}

export function SkipSessionModal({
  open,
  campaignHandle,
  upcoming,
  autoScheduleDefault,
  isOneShot,
  onClose,
  onSkipped,
}: SkipSessionModalProps) {
  const [reason, setReason] = useState('');
  const [scheduleNext, setScheduleNext] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setReason('');
    setScheduleNext(!isOneShot && autoScheduleDefault);
    setError(null);
  }, [open, autoScheduleDefault, isOneShot]);

  if (!open) return null;

  async function handleSkip(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError(null);
    try {
      await postSkipUpcomingSession(campaignHandle, {
        timelinePointId: upcoming.timelinePointId,
        reason: reason.trim() || null,
        scheduleNextAutomatically: isOneShot ? false : scheduleNext,
      });
      onSkipped();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to skip session.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="skip-session-title"
        className="relative w-full max-w-md rounded-xl border border-border bg-surface p-5 shadow-xl"
      >
        <button
          type="button"
          onClick={onClose}
          className="absolute right-3 top-3 rounded-md p-1 text-muted hover:bg-background hover:text-foreground"
          aria-label="Close"
        >
          <X className="size-4" />
        </button>

        <h2 id="skip-session-title" className="pr-8 text-lg font-semibold text-foreground">
          Skip session
        </h2>
        <p className="mt-1 text-sm text-muted">
          Skip {formatSessionWhen(upcoming)}?
        </p>

        <form onSubmit={handleSkip} className="mt-4 space-y-4">
          <div>
            <label className="mb-1 block text-xs text-muted" htmlFor="skip-reason">
              Reason <span className="text-muted/80">(optional)</span>
            </label>
            <input
              id="skip-reason"
              type="text"
              value={reason}
              maxLength={REASON_MAX}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Holiday weekend"
              className={controlClasses}
            />
            <p className="mt-1 text-xs text-muted">
              {reason.length}/{REASON_MAX}
            </p>
          </div>

          {!isOneShot ? (
            <label className="flex items-start gap-2 text-sm text-foreground">
              <input
                type="checkbox"
                checked={scheduleNext}
                onChange={(e) => setScheduleNext(e.target.checked)}
                className="mt-1"
              />
              <span>Schedule the next session automatically</span>
            </label>
          ) : null}

          {error ? <p className="text-sm text-danger">{error}</p> : null}

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-md border border-border px-3 py-1.5 text-sm hover:bg-background"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground disabled:opacity-60"
            >
              {saving ? 'Skipping…' : 'Skip session'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
