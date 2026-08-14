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
    onChange({ enabled: true, cadence: optionId as ScheduleCadence });
  }

  return (
    <section className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-foreground">When do you play?</h3>
        <p className="mt-1 text-sm text-muted">
          Optional table cadence for recruitment and scheduling settings. This does not create
          calendar events.
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
    </section>
  );
}
