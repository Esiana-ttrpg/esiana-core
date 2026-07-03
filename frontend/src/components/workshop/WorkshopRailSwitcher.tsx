import type { WorkshopRailMode } from '@/lib/workspacePersistence';

interface WorkshopRailSwitcherProps {
  mode: WorkshopRailMode;
  fieldsDisabled?: boolean;
  onChange: (mode: WorkshopRailMode) => void;
}

export function WorkshopRailSwitcher({
  mode,
  fieldsDisabled = false,
  onChange,
}: WorkshopRailSwitcherProps) {
  const btn = (id: WorkshopRailMode, label: string, disabled?: boolean) => {
    const active = mode === id;
    return (
      <button
        type="button"
        disabled={disabled}
        onClick={() => onChange(id)}
        className={`flex-1 px-2 py-1 text-xs font-medium transition-colors ${
          active
            ? 'border-primary/50 bg-primary/10 text-primary'
            : 'text-muted-foreground hover:text-foreground'
        } disabled:cursor-not-allowed disabled:opacity-40`}
      >
        {label}
      </button>
    );
  };

  return (
    <div className="flex overflow-hidden rounded-md border border-border/60">
      {btn('guide', 'Guide')}
      {btn('fields', 'Fields', fieldsDisabled)}
    </div>
  );
}
