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

interface SchedulingStepProps {
  schedule: ScheduleDraft | null;
  onChange: (schedule: ScheduleDraft | null) => void;
}

function isOptionSelected(schedule: ScheduleDraft | null, optionId: (typeof SCHEDULE_OPTIONS)[number]['id']): boolean {
  if (!schedule) return false;
  if (optionId === 'none') return !schedule.enabled;
  return schedule.enabled && schedule.cadence === optionId;
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
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-xs text-muted" htmlFor="wizard-first-session-date">
              First session date <span className="text-muted/80">(optional)</span>
            </label>
            <input
              id="wizard-first-session-date"
              type="date"
              value={schedule.firstSessionDate ?? ''}
              onChange={(e) => patch({ firstSessionDate: e.target.value })}
              className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs text-muted" htmlFor="wizard-first-session-time">
              Time <span className="text-muted/80">(optional)</span>
            </label>
            <input
              id="wizard-first-session-time"
              type="time"
              value={schedule.firstSessionTime ?? ''}
              onChange={(e) => patch({ firstSessionTime: e.target.value })}
              className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
            />
          </div>
        </div>
      ) : null}
    </section>
  );
}
