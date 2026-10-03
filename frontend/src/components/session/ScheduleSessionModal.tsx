import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { X } from 'lucide-react';
import { controlClasses } from '@/components/ui/formStyles';
import { TimezoneSelect } from '@/components/ui/TimezoneSelect';
import { CampaignChronologyDateField } from '@/components/entity/CampaignChronologyDateField';
import {
  fetchCampaignSchedule,
  postScheduleUpcoming,
} from '@/lib/campaignSchedule';
import { fetchTimeTracking } from '@/lib/timeTrackingApi';
import {
  calendarEpochMinuteForDate,
  convertEpochToCalendarState,
} from '@/lib/timeEngine';
import { resolveMasterCalendarLike } from '@/lib/chronologyCalendar';
import type { ChronologyDateParts } from '@/lib/entityRelationTypes';
import type { UpcomingSessionSummary } from '@/types/notifications';
import {
  datetimeLocalValueToIsoStrict,
  isoToDatetimeLocalValue,
  timeLabelFromDatetimeLocal,
  weekdayNameFromDatetimeLocal,
} from '@shared/campaignScheduleCadence';

const FREQUENCY_OPTIONS = [
  { id: 'Weekly', label: 'Weekly' },
  { id: 'Biweekly', label: 'Every 2 weeks' },
  { id: 'Monthly', label: 'Monthly' },
  { id: 'Custom', label: 'Custom' },
  { id: '', label: 'Off' },
] as const;

export interface ScheduleSessionModalProps {
  open: boolean;
  campaignHandle: string;
  /** When editing an existing upcoming session. */
  upcoming?: UpcomingSessionSummary | null;
  onClose: () => void;
  onSaved: () => void;
}

export function ScheduleSessionModal({
  open,
  campaignHandle,
  upcoming = null,
  onClose,
  onSaved,
}: ScheduleSessionModalProps) {
  const [dateTime, setDateTime] = useState('');
  const [timezone, setTimezone] = useState(
    () => Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC',
  );
  const [frequency, setFrequency] = useState('Weekly');
  const [applyRecurrenceChange, setApplyRecurrenceChange] = useState(false);
  const [worldTimeMode, setWorldTimeMode] = useState<'continue' | 'planned'>('continue');
  const [worldDate, setWorldDate] = useState<ChronologyDateParts | null>(null);
  const [currentEpochMinute, setCurrentEpochMinute] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const isEditing = Boolean(upcoming);
  const isManualUpcoming = upcoming?.origin === 'MANUAL';

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    setApplyRecurrenceChange(false);

    void (async () => {
      try {
        const [{ schedule, upcoming: canonical }, timeBundle] = await Promise.all([
          fetchCampaignSchedule(campaignHandle),
          fetchTimeTracking(campaignHandle).catch(() => null),
        ]);
        if (cancelled) return;

        const target = upcoming ?? canonical;
        const resolvedTz =
          target?.timezone ||
          schedule.timezone ||
          Intl.DateTimeFormat().resolvedOptions().timeZone ||
          'UTC';
        setTimezone(resolvedTz);
        setDateTime(isoToDatetimeLocalValue(target?.plannedStartAt ?? null, resolvedTz));
        setFrequency(schedule.frequency?.trim() || 'Weekly');
        setCurrentEpochMinute(timeBundle?.currentEpochMinute ?? null);

        if (target?.plannedWorldEpochMinute) {
          setWorldTimeMode('planned');
          const calendarLike = timeBundle ? resolveMasterCalendarLike(timeBundle) : null;
          if (calendarLike) {
            try {
              const state = convertEpochToCalendarState(
                BigInt(target.plannedWorldEpochMinute),
                calendarLike,
              );
              setWorldDate({
                year: state.year,
                month: state.monthIndex,
                day: state.day,
              });
            } catch {
              setWorldDate(null);
            }
          } else {
            setWorldDate(null);
          }
        } else {
          setWorldTimeMode('continue');
          setWorldDate(null);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to load schedule.');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [open, campaignHandle, upcoming]);

  const scopeHint = useMemo(() => {
    if (!isEditing) return null;
    if (isManualUpcoming) {
      return 'This updates the existing manually scheduled session.';
    }
    return null;
  }, [isEditing, isManualUpcoming]);

  if (!open) return null;

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!dateTime) {
      setError('Date and time are required.');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      let plannedWorldEpochMinute: string | null | undefined;
      if (worldTimeMode === 'continue') {
        plannedWorldEpochMinute = null;
      } else {
        if (worldDate?.year == null || worldDate.month == null || worldDate.day == null) {
          setError('Choose a world start date, or continue from current campaign time.');
          setSaving(false);
          return;
        }
        const bundle = await fetchTimeTracking(campaignHandle);
        const calendarLike = resolveMasterCalendarLike(bundle);
        if (!calendarLike) {
          setError('No master campaign calendar is available to set a world start date.');
          setSaving(false);
          return;
        }
        plannedWorldEpochMinute = calendarEpochMinuteForDate(
          calendarLike,
          worldDate.year,
          worldDate.month,
          worldDate.day,
        ).toString();
      }

      const plannedStartAt = datetimeLocalValueToIsoStrict(dateTime, timezone);
      if (!plannedStartAt) {
        setError(
          'That date and time does not exist in the selected timezone (for example, during a daylight-saving transition). Pick another time.',
        );
        setSaving(false);
        return;
      }

      const day = weekdayNameFromDatetimeLocal(dateTime, timezone);
      const time = timeLabelFromDatetimeLocal(dateTime, timezone);
      const applyRecurrence =
        applyRecurrenceChange || (!isEditing && Boolean(frequency));

      await postScheduleUpcoming(campaignHandle, {
        plannedStartAt,
        timezone,
        applyRecurrenceChange: applyRecurrence,
        scheduleFrequency: frequency || null,
        scheduleDay: day || null,
        scheduleTime: time || null,
        scheduleTimezone: timezone,
        rescheduleExisting: isManualUpcoming,
        timelinePointId: upcoming?.timelinePointId,
        plannedWorldEpochMinute,
      });
      onSaved();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to schedule session.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="schedule-session-title"
        className="relative max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-xl border border-border bg-surface p-5 shadow-xl"
      >
        <button
          type="button"
          onClick={onClose}
          className="absolute right-3 top-3 rounded-md p-1 text-muted hover:bg-background hover:text-foreground"
          aria-label="Close"
        >
          <X className="size-4" />
        </button>

        <h2 id="schedule-session-title" className="pr-8 text-lg font-semibold text-foreground">
          {isEditing ? 'Edit schedule' : 'Schedule next session'}
        </h2>
        {scopeHint ? <p className="mt-1 text-xs text-muted">{scopeHint}</p> : null}

        {loading ? (
          <p className="mt-4 text-sm text-muted">Loading…</p>
        ) : (
          <form onSubmit={handleSubmit} className="mt-4 space-y-4">
            <div>
              <label className="mb-1 block text-xs text-muted" htmlFor="schedule-datetime">
                Date
              </label>
              <input
                id="schedule-datetime"
                type="datetime-local"
                value={dateTime}
                onChange={(e) => setDateTime(e.target.value)}
                className={controlClasses}
                required
              />
            </div>

            <div>
              <label className="mb-1 block text-xs text-muted" htmlFor="schedule-timezone">
                Timezone
              </label>
              <TimezoneSelect
                id="schedule-timezone"
                value={timezone}
                onChange={setTimezone}
              />
            </div>

            <fieldset>
              <legend className="mb-2 text-xs font-medium text-muted">Repeats</legend>
              <div className="grid gap-2 sm:grid-cols-2">
                {FREQUENCY_OPTIONS.map((option) => (
                  <label
                    key={option.id || 'off'}
                    className={`flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2 text-sm ${
                      frequency === option.id
                        ? 'border-primary/60 bg-primary/10'
                        : 'border-border bg-background/50'
                    }`}
                  >
                    <input
                      type="radio"
                      name="schedule-frequency"
                      checked={frequency === option.id}
                      onChange={() => setFrequency(option.id)}
                      className="sr-only"
                    />
                    {option.label}
                  </label>
                ))}
              </div>
            </fieldset>

            {isEditing && !isManualUpcoming ? (
              <label className="flex items-start gap-2 text-sm text-foreground">
                <input
                  type="checkbox"
                  checked={applyRecurrenceChange}
                  onChange={(e) => setApplyRecurrenceChange(e.target.checked)}
                  className="mt-1"
                />
                <span>
                  <span className="font-medium">Update campaign schedule</span>
                  <span className="block text-xs text-muted">
                    Unchecked = change only this upcoming session (exception). Checked = also
                    update the recurring cadence.
                  </span>
                </span>
              </label>
            ) : null}

            <fieldset className="space-y-2">
              <legend className="mb-1 text-xs font-medium text-muted">Campaign time</legend>
              <label className="flex items-start gap-2 text-sm">
                <input
                  type="radio"
                  name="world-time-mode"
                  checked={worldTimeMode === 'continue'}
                  onChange={() => setWorldTimeMode('continue')}
                  className="mt-1"
                />
                <span>Continue from current campaign time</span>
              </label>
              <label className="flex items-start gap-2 text-sm">
                <input
                  type="radio"
                  name="world-time-mode"
                  checked={worldTimeMode === 'planned'}
                  onChange={() => setWorldTimeMode('planned')}
                  className="mt-1"
                />
                <span>Start this session at a world date</span>
              </label>
              {worldTimeMode === 'planned' ? (
                <div className="pl-6">
                  <CampaignChronologyDateField
                    campaignHandle={campaignHandle}
                    label="World start date"
                    value={worldDate}
                    onChange={setWorldDate}
                  />
                  {currentEpochMinute ? (
                    <p className="mt-1 text-xs text-muted">
                      Current clock epoch: {currentEpochMinute}
                    </p>
                  ) : null}
                </div>
              ) : null}
            </fieldset>

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
                {saving ? 'Saving…' : 'Schedule'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
