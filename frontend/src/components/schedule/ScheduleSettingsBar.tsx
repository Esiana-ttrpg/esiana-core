import { HelpCircle } from 'lucide-react';
import type { UserSchedulePreferences } from '@/types/userSchedule';
import {
  AUTO_RSVP_DAY_OPTIONS,
  formatVacationRange,
} from '@/lib/userSchedule';
import { selectClasses } from '@/components/ui/formStyles';

export interface ScheduleSettingsBarProps {
  preferences: UserSchedulePreferences;
  onEditVacation: () => void;
  onAutoRsvpEnabledChange: (enabled: boolean) => void;
  onAutoRsvpDaysChange: (days: number) => void;
  saving?: boolean;
}

function HelpTip({ text }: { text: string }) {
  return (
    <span className="group relative inline-flex">
      <HelpCircle className="size-3.5 text-muted" aria-label={text} />
      <span
        role="tooltip"
        className="pointer-events-none absolute bottom-full left-1/2 z-20 mb-1 hidden w-52 -translate-x-1/2 rounded-md border border-border bg-elevated px-2 py-1.5 text-xs text-foreground shadow-lg group-hover:block group-focus-within:block"
      >
        {text}
      </span>
    </span>
  );
}

export function ScheduleSettingsBar({
  preferences,
  onEditVacation,
  onAutoRsvpEnabledChange,
  onAutoRsvpDaysChange,
  saving,
}: ScheduleSettingsBarProps) {
  const onVacation = Boolean(preferences.vacationStartDate && preferences.vacationEndDate);
  const days = preferences.autoRsvpDaysBefore ?? 7;

  return (
    <section className="space-y-2 rounded-xl border border-border bg-surface/60 px-4 py-3">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm">
        <div className="flex min-w-[12rem] flex-1 items-center gap-2">
          <span className="w-20 shrink-0 text-muted">Vacation</span>
          <span className="flex-1 text-foreground">
            {onVacation
              ? formatVacationRange(preferences.vacationStartDate!, preferences.vacationEndDate!)
              : 'Not away'}
          </span>
          <HelpTip text="Marks you Away on overlapping sessions. Does not change or cancel RSVPs." />
          <button
            type="button"
            onClick={onEditVacation}
            className="rounded-md border border-border px-2.5 py-1 text-xs font-medium text-foreground hover:bg-elevated"
          >
            {onVacation ? 'Edit' : 'Set dates'}
          </button>
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm">
        <div className="flex min-w-[12rem] flex-1 items-center gap-2">
          <span className="w-20 shrink-0 text-muted">Auto RSVP</span>
          <select
            className={`${selectClasses} w-auto min-w-[8rem] py-1 text-xs`}
            value={days}
            disabled={saving}
            onChange={(e) => onAutoRsvpDaysChange(Number.parseInt(e.target.value, 10))}
            aria-label="Auto RSVP threshold"
          >
            {AUTO_RSVP_DAY_OPTIONS.map((option) => (
              <option key={option} value={option}>
                {option} day{option === 1 ? '' : 's'} before
              </option>
            ))}
          </select>
          <HelpTip text="If you have not responded when a published session reaches this threshold, mark Attending. Manual RSVP always wins. Skips vacation overlaps." />
          <button
            type="button"
            role="switch"
            aria-checked={preferences.autoRsvpEnabled}
            disabled={saving}
            onClick={() => onAutoRsvpEnabledChange(!preferences.autoRsvpEnabled)}
            className={`rounded-md border px-2.5 py-1 text-xs font-semibold ${
              preferences.autoRsvpEnabled
                ? 'border-primary/40 bg-primary/15 text-primary'
                : 'border-border text-muted'
            }`}
          >
            {preferences.autoRsvpEnabled ? 'ON' : 'OFF'}
          </button>
        </div>
      </div>
    </section>
  );
}
