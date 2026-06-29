import type { ReactNode } from 'react';

interface WorkspaceModeToggleProps<T extends string> {
  options: readonly T[];
  value: T;
  onChange: (value: T) => void;
  formatLabel?: (value: T) => string;
}

function defaultFormatLabel(value: string): string {
  return value.replace(/-/g, ' ');
}

export function WorkspaceModeToggle<T extends string>({
  options,
  value,
  onChange,
  formatLabel = defaultFormatLabel,
}: WorkspaceModeToggleProps<T>) {
  return (
    <div className="flex flex-wrap gap-1 rounded-lg border border-border bg-elevated/50 p-1">
      {options.map((option) => (
        <button
          key={option}
          type="button"
          onClick={() => onChange(option)}
          className={`rounded px-2.5 py-1 text-xs capitalize transition-colors ${
            value === option
              ? 'bg-primary/20 text-primary'
              : 'text-muted hover:text-foreground'
          }`}
        >
          {formatLabel(option)}
        </button>
      ))}
    </div>
  );
}

export function workspaceModeToggleNode<T extends string>(
  props: WorkspaceModeToggleProps<T>,
): ReactNode {
  return <WorkspaceModeToggle {...props} />;
}
