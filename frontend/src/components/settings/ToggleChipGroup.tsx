export interface ToggleChipGroupProps {
  options: Array<{ key: string; label: string }>;
  values: Record<string, boolean | undefined>;
  onChange: (key: string, enabled: boolean) => void;
  idPrefix: string;
}

export function ToggleChipGroup({
  options,
  values,
  onChange,
  idPrefix,
}: ToggleChipGroupProps) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((option) => {
        const selected = Boolean(values[option.key]);
        return (
          <button
            key={option.key}
            type="button"
            id={`${idPrefix}-${option.key}`}
            aria-pressed={selected}
            onClick={() => onChange(option.key, !selected)}
            className={`rounded-full border px-3 py-1.5 text-sm transition-colors ${
              selected
                ? 'border-primary/60 bg-primary/20 text-primary'
                : 'border-border bg-surface text-foreground hover:border-border'
            }`}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
