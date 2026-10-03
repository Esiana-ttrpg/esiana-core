import { useEffect, useState } from 'react';
import {
  advanceCampaignTime,
  fetchTimeTracking,
  formatCampaignDateLabel,
  masterCalendarFromBundle,
} from '@/lib/timeTrackingApi';
import { convertEpochToCalendarState } from '@/lib/timeEngine';
import { resolveMasterCalendarLike } from '@/lib/chronologyCalendar';

interface PlannedWorldTimePromptProps {
  campaignHandle: string;
  timelinePointId: string;
  plannedWorldEpochMinute: string;
}

/**
 * When a session has a planned world start that differs from the campaign clock,
 * prompt the DM to advance forward (never backward).
 */
export function PlannedWorldTimePrompt({
  campaignHandle,
  plannedWorldEpochMinute,
}: PlannedWorldTimePromptProps) {
  const [currentEpoch, setCurrentEpoch] = useState<bigint | null>(null);
  const [plannedLabel, setPlannedLabel] = useState<string | null>(null);
  const [currentLabel, setCurrentLabel] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const planned = (() => {
    try {
      return BigInt(plannedWorldEpochMinute);
    } catch {
      return null;
    }
  })();

  useEffect(() => {
    let cancelled = false;
    void fetchTimeTracking(campaignHandle)
      .then((bundle) => {
        if (cancelled) return;
        const current = BigInt(bundle.currentEpochMinute);
        setCurrentEpoch(current);
        const master = masterCalendarFromBundle(bundle);
        setCurrentLabel(formatCampaignDateLabel(master));
        const calendarLike = resolveMasterCalendarLike(bundle);
        if (calendarLike && planned != null) {
          const state = convertEpochToCalendarState(planned, calendarLike);
          setPlannedLabel(
            `Year ${state.year}, ${state.monthName} ${state.day}`,
          );
        }
      })
      .catch(() => {
        if (!cancelled) setCurrentEpoch(null);
      });
    return () => {
      cancelled = true;
    };
  }, [campaignHandle, planned]);

  if (dismissed || planned == null || currentEpoch == null) return null;
  if (planned === currentEpoch) return null;

  const isPast = planned < currentEpoch;
  const deltaMinutes = planned > currentEpoch ? planned - currentEpoch : 0n;

  async function handleApply() {
    if (isPast || deltaMinutes <= 0n) return;
    setBusy(true);
    setError(null);
    try {
      // Advance in day-sized chunks when possible for cleaner UX.
      const days = deltaMinutes / 1440n;
      const rem = deltaMinutes % 1440n;
      if (days > 0n) {
        await advanceCampaignTime(campaignHandle, Number(days), 'days');
      }
      if (rem > 0n) {
        await advanceCampaignTime(campaignHandle, Number(rem), 'minutes');
      }
      setMessage('Campaign time advanced to the planned world start.');
      setDismissed(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to advance time.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="rounded-lg border border-border bg-surface/60 p-4">
      <p className="text-sm font-semibold text-foreground">Planned world start</p>
      {isPast ? (
        <p className="mt-1 text-sm text-muted">
          The planned start ({plannedLabel ?? plannedWorldEpochMinute}) is already in the past
          relative to the campaign clock
          {currentLabel ? ` (${currentLabel})` : ''}. Time was not changed.
        </p>
      ) : (
        <p className="mt-1 text-sm text-muted">
          This session is planned to begin at {plannedLabel ?? plannedWorldEpochMinute}. Current
          campaign time is {currentLabel ?? 'unknown'}. Apply this start?
        </p>
      )}
      {error ? <p className="mt-2 text-sm text-danger">{error}</p> : null}
      {message ? <p className="mt-2 text-sm text-success">{message}</p> : null}
      <div className="mt-3 flex flex-wrap gap-2">
        {!isPast ? (
          <button
            type="button"
            disabled={busy}
            onClick={() => void handleApply()}
            className="rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground disabled:opacity-60"
          >
            {busy ? 'Applying…' : 'Apply planned start'}
          </button>
        ) : null}
        <button
          type="button"
          onClick={() => setDismissed(true)}
          className="rounded-md border border-border px-3 py-1.5 text-sm hover:bg-background"
        >
          Dismiss
        </button>
      </div>
    </div>
  );
}
