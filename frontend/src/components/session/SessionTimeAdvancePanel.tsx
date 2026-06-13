import { useEffect, useMemo, useState } from 'react';
import { Loader2 } from 'lucide-react';
import {
  SESSION_TIME_ADVANCE_PRESETS,
  TIME_ADVANCE_UNIT_LABELS,
  TIME_ADVANCE_UNITS,
  type TimeAdvanceUnit,
} from '@shared/timeAdvanceUnits';
import {
  advanceCampaignTime,
  fetchTimeTracking,
  formatCampaignDateLabel,
  masterCalendarFromBundle,
  type AdvanceTimeResponse,
} from '@/lib/timeTrackingApi';
import { parseSessionDurationToMinutes } from '@/lib/parseSessionDuration';

export interface SessionTimeAdvancePanelProps {
  campaignHandle: string;
  sessionDuration?: string | null;
  /** immediate: preset clicks advance right away (End session modal). confirm: pick then Save. */
  variant?: 'immediate' | 'confirm';
  showCurrentDate?: boolean;
  showSkip?: boolean;
  onSkip?: () => void;
  onAdvanced: (response?: AdvanceTimeResponse) => void;
  onCancel?: () => void;
}

export function SessionTimeAdvancePanel({
  campaignHandle,
  sessionDuration,
  variant = 'immediate',
  showCurrentDate = true,
  showSkip = false,
  onSkip,
  onAdvanced,
  onCancel,
}: SessionTimeAdvancePanelProps) {
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentDateLabel, setCurrentDateLabel] = useState<string | null>(null);
  const [hasMasterCalendar, setHasMasterCalendar] = useState(false);
  const [customAmount, setCustomAmount] = useState(1);
  const [customUnit, setCustomUnit] = useState<TimeAdvanceUnit>('days');
  const [clampNote, setClampNote] = useState<string | null>(null);
  const [pendingAmount, setPendingAmount] = useState(1);
  const [pendingUnit, setPendingUnit] = useState<TimeAdvanceUnit>('days');

  const sessionBlockMinutes = useMemo(
    () => parseSessionDurationToMinutes(sessionDuration),
    [sessionDuration],
  );

  useEffect(() => {
    if (!campaignHandle) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    setClampNote(null);
    void fetchTimeTracking(campaignHandle)
      .then((bundle) => {
        if (cancelled) return;
        const master = masterCalendarFromBundle(bundle);
        setHasMasterCalendar(master != null);
        setCurrentDateLabel(formatCampaignDateLabel(master));
      })
      .catch((err) => {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : 'Failed to load campaign time');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [campaignHandle]);

  async function runAdvance(amount: number, unit: TimeAdvanceUnit) {
    setSubmitting(true);
    setError(null);
    setClampNote(null);
    try {
      const response = await advanceCampaignTime(campaignHandle, amount, unit);
      if (response.clampedDay) {
        setClampNote('The campaign date was adjusted to fit the shorter month.');
      }
      const master = masterCalendarFromBundle(response);
      setCurrentDateLabel(formatCampaignDateLabel(master));
      setHasMasterCalendar(master != null);
      onAdvanced(response);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to advance time');
    } finally {
      setSubmitting(false);
    }
  }

  function selectPending(amount: number, unit: TimeAdvanceUnit) {
    setPendingAmount(amount);
    setPendingUnit(unit);
    setCustomAmount(amount);
    setCustomUnit(unit);
  }

  function handlePresetClick(amount: number, unit: TimeAdvanceUnit) {
    if (variant === 'immediate') {
      void runAdvance(amount, unit);
      return;
    }
    selectPending(amount, unit);
  }

  if (loading) {
    return <p className="text-sm text-muted-foreground">Reading campaign chronology…</p>;
  }

  return (
    <div className="space-y-4">
      {showCurrentDate ? (
        currentDateLabel ? (
          <p className="rounded-md border border-border/60 bg-surface/40 px-3 py-2 text-sm text-foreground">
            <span className="text-muted-foreground">Current campaign date: </span>
            {currentDateLabel}
          </p>
        ) : (
          <p className="text-sm text-muted-foreground">
            No master calendar is configured yet. Duration-based advances still work; month
            advances need a master fantasy calendar.
          </p>
        )
      ) : null}

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          disabled={submitting}
          className={`rounded-md border px-2 py-1 text-xs hover:bg-muted/20 disabled:opacity-50 ${
            variant === 'confirm' &&
            pendingAmount === Math.max(1, Math.round(sessionBlockMinutes)) &&
            pendingUnit === 'minutes'
              ? 'border-primary bg-primary/10'
              : 'border-border'
          }`}
          onClick={() =>
            handlePresetClick(Math.max(1, Math.round(sessionBlockMinutes)), 'minutes')
          }
        >
          Session block (~{sessionBlockMinutes}m)
        </button>
        {SESSION_TIME_ADVANCE_PRESETS.map((preset) => {
          const monthDisabled = preset.unit === 'months' && !hasMasterCalendar;
          const isSelected =
            variant === 'confirm' &&
            pendingAmount === preset.amount &&
            pendingUnit === preset.unit;
          return (
            <button
              key={preset.id}
              type="button"
              disabled={submitting || monthDisabled}
              title={monthDisabled ? 'Requires a master fantasy calendar' : preset.label}
              className={`rounded-md border px-2 py-1 text-xs hover:bg-muted/20 disabled:opacity-50 ${
                isSelected ? 'border-primary bg-primary/10' : 'border-border'
              }`}
              onClick={() => handlePresetClick(preset.amount, preset.unit)}
            >
              {preset.label}
            </button>
          );
        })}
      </div>

      <div className="flex flex-wrap items-end gap-2">
        <label className="text-sm">
          Custom
          <input
            type="number"
            min={1}
            className="mt-1 block w-20 rounded-md border border-border bg-background px-2 py-1 text-sm"
            value={customAmount}
            onChange={(e) => {
              const amount = Math.max(1, Number(e.target.value) || 1);
              setCustomAmount(amount);
              if (variant === 'confirm') {
                setPendingAmount(amount);
                setPendingUnit(customUnit);
              }
            }}
          />
        </label>
        <label className="text-sm">
          Unit
          <select
            className="mt-1 block rounded-md border border-border bg-background px-2 py-1 text-sm"
            value={customUnit}
            onChange={(e) => {
              const unit = e.target.value as TimeAdvanceUnit;
              setCustomUnit(unit);
              if (variant === 'confirm') {
                setPendingAmount(customAmount);
                setPendingUnit(unit);
              }
            }}
          >
            {TIME_ADVANCE_UNITS.map((unit) => (
              <option key={unit} value={unit} disabled={unit === 'months' && !hasMasterCalendar}>
                {TIME_ADVANCE_UNIT_LABELS[unit]}
              </option>
            ))}
          </select>
        </label>
        {variant === 'immediate' ? (
          <button
            type="button"
            disabled={submitting || (customUnit === 'months' && !hasMasterCalendar)}
            className="rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground disabled:opacity-50"
            onClick={() => void runAdvance(customAmount, customUnit)}
          >
            {submitting ? (
              <span className="inline-flex items-center gap-1">
                <Loader2 className="size-3.5 animate-spin" />
                Advancing…
              </span>
            ) : (
              'Advance time'
            )}
          </button>
        ) : null}
      </div>

      {clampNote ? <p className="text-xs text-amber-300/90">{clampNote}</p> : null}
      {error ? <p className="text-sm text-destructive">{error}</p> : null}

      {variant === 'confirm' ? (
        <div className="flex flex-wrap items-center justify-end gap-2 border-t border-border/60 pt-4">
          {onCancel ? (
            <button
              type="button"
              disabled={submitting}
              className="rounded-lg border border-border px-3 py-2 text-sm text-foreground hover:bg-surface disabled:opacity-50"
              onClick={onCancel}
            >
              Cancel
            </button>
          ) : null}
          <button
            type="button"
            disabled={submitting || (pendingUnit === 'months' && !hasMasterCalendar)}
            className="rounded-lg bg-primary px-3 py-2 text-sm font-medium text-background hover:bg-primary/90 disabled:opacity-50"
            onClick={() => void runAdvance(pendingAmount, pendingUnit)}
          >
            {submitting ? (
              <span className="inline-flex items-center gap-1">
                <Loader2 className="size-3.5 animate-spin" />
                Saving…
              </span>
            ) : (
              'Save Time Advance'
            )}
          </button>
        </div>
      ) : null}

      {showSkip && onSkip ? (
        <button
          type="button"
          disabled={submitting}
          className="w-full rounded-md border border-border px-3 py-2 text-sm text-muted-foreground hover:bg-muted/20 disabled:opacity-50"
          onClick={onSkip}
        >
          No meaningful in-world time passed
        </button>
      ) : null}
    </div>
  );
}
