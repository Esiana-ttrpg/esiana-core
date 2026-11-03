import type { ChangeEvent, FocusEvent } from 'react';
import type { ScheduleCadence, ScheduleDraft } from './types';

const SCHEDULE_OPTIONS: Array<{
  id: 'weekly' | 'biweekly' | 'monthly' | 'custom' | 'none';
  label: string;
  hint: string;
}> = [
  { id: 'weekly', label: 'Weekly', hint: 'Roughly once a week.' },
  { id: 'biweekly', label: 'Biweekly', hint: 'Every two weeks.' },
  { id: 'monthly', label: 'Monthly', hint: 'About once a month.' },
  { id: 'custom', label: 'Custom', hint: 'Set details later in campaign settings.' },
  { id: 'none', label: 'Not scheduled', hint: 'No table cadence for now.' },
];

/**
 * Native date/time controls inside the wizard dialog.
 * Mobile uses 16px text + 44px min height; laptop keeps standard form density.
 */
export const wizardTemporalInputClassName =
  'min-h-11 w-full min-w-0 rounded-lg border border-border bg-background px-3 text-base text-foreground outline-none transition-colors focus:border-accent focus:ring-2 focus:ring-accent/30 sm:min-h-10 sm:text-sm';

interface SchedulingStepProps {
  schedule: ScheduleDraft | null;
  onChange: (schedule: ScheduleDraft | null) => void;
}

function isOptionSelected(
  schedule: ScheduleDraft | null,
  optionId: (typeof SCHEDULE_OPTIONS)[number]['id'],
): boolean {
  if (!schedule) return false;
  if (optionId === 'none') return !schedule.enabled;
  return schedule.enabled && schedule.cadence === optionId;
}

function openNativePicker(input: HTMLInputElement) {
  const picker = (
    input as HTMLInputElement & { showPicker?: () => void }
  ).showPicker;
  if (typeof picker !== 'function') return;
  try {
    picker.call(input);
  } catch {
    /* Unsupported, already open, or blocked — native focus still works. */
  }
}

function WizardTemporalInput({
  id,
  type,
  value,
  onChange,
}: {
  id: string;
  type: 'date' | 'time';
  value: string;
  onChange: (value: string) => void;
}) {
  function handleFocus(event: FocusEvent<HTMLInputElement>) {
    event.currentTarget.scrollIntoView({ block: 'center', inline: 'nearest', behavior: 'smooth' });
  }

  function handleChange(event: ChangeEvent<HTMLInputElement>) {
    onChange(event.target.value);
  }

  return (
    <input
      id={id}
      type={type}
      value={value}
      onChange={handleChange}
      onFocus={handleFocus}
      onClick={(event) => openNativePicker(event.currentTarget)}
      className={wizardTemporalInputClassName}
    />
  );
}

export function SchedulingStep({ schedule, onChange }: SchedulingStepProps) {
  function selectOption(optionId: (typeof SCHEDULE_OPTIONS)[number]['id']) {
    if (optionId === 'none') {
      onChange({ enabled: false });
      return;
    }
    onChange({
      enabled: true,
      cadence: optionId as ScheduleCadence,
      firstSessionDate: schedule?.firstSessionDate ?? '',
      firstSessionTime: schedule?.firstSessionTime ?? '',
    });
  }

  function patch(partial: Partial<ScheduleDraft>) {
    if (!schedule?.enabled) return;
    onChange({ ...schedule, ...partial });
  }

  return (
    <section className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-foreground">When do you play?</h3>
        <p className="mt-1 text-sm text-muted">
          Optional table cadence for recruitment and scheduling. If you set a first session date,
          Esiana creates that upcoming session note automatically.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        {SCHEDULE_OPTIONS.map((option) => (
          <button
            key={option.id}
            type="button"
            onClick={() => selectOption(option.id)}
            className={`rounded-xl border p-4 text-left transition-colors ${
              isOptionSelected(schedule, option.id)
                ? 'border-primary/60 bg-primary/10'
                : 'border-border bg-background/50 hover:border-border'
            }`}
          >
            <p className="text-sm font-semibold text-foreground">{option.label}</p>
            <p className="mt-2 text-xs text-muted">{option.hint}</p>
          </button>
        ))}
      </div>

      {schedule?.enabled ? (
        <div className="grid min-w-0 gap-4 sm:grid-cols-2">
          <div className="min-w-0">
            <label className="mb-1 block text-xs text-muted" htmlFor="wizard-first-session-date">
              First session date <span className="text-muted/80">(optional)</span>
            </label>
            <WizardTemporalInput
              id="wizard-first-session-date"
              type="date"
              value={schedule.firstSessionDate ?? ''}
              onChange={(firstSessionDate) => patch({ firstSessionDate })}
            />
          </div>
          <div className="min-w-0">
            <label className="mb-1 block text-xs text-muted" htmlFor="wizard-first-session-time">
              Time <span className="text-muted/80">(optional)</span>
            </label>
            <WizardTemporalInput
              id="wizard-first-session-time"
              type="time"
              value={schedule.firstSessionTime ?? ''}
              onChange={(firstSessionTime) => patch({ firstSessionTime })}
            />
          </div>
        </div>
      ) : null}
    </section>
  );
}
