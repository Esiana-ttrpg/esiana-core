import type { StoryFilterState } from '@/lib/workspacePersistence';

interface StoryNarrativeFilterPanelProps {
  filters: StoryFilterState;
  onFiltersChange: (patch: Partial<StoryFilterState>) => void;
  resultLabel?: string | null;
}

/** In-refine body for adventure story narrative filters (search lives in Refine popover). */
export function StoryNarrativeFilterPanel({
  filters,
  onFiltersChange,
  resultLabel,
}: StoryNarrativeFilterPanelProps) {
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <button
        type="button"
        onClick={() => onFiltersChange({ recent: !filters.recent })}
        className={`rounded-md border px-2 py-1 text-xs font-medium transition-colors ${
          filters.recent
            ? 'border-primary/50 bg-primary/10 text-primary'
            : 'border-border text-muted hover:border-primary/30 hover:text-foreground'
        }`}
      >
        Recent
      </button>
      {resultLabel ? (
        <span className="ml-1 text-xs text-muted">{resultLabel}</span>
      ) : null}
    </div>
  );
}
