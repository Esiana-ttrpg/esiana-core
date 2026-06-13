import { Search } from 'lucide-react';
import type { StoryFilterState } from '@/lib/workspacePersistence';

interface StoryNarrativeToolbarProps {
  filters: StoryFilterState;
  onFiltersChange: (patch: Partial<StoryFilterState>) => void;
  resultLabel?: string | null;
}

export function StoryNarrativeToolbar({
  filters,
  onFiltersChange,
  resultLabel,
}: StoryNarrativeToolbarProps) {
  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
      <div className="relative min-w-0 flex-1">
        <Search
          className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted"
          aria-hidden
        />
        <input
          type="search"
          value={filters.search ?? ''}
          onChange={(event) => onFiltersChange({ search: event.target.value })}
          placeholder="Search narrative state…"
          className="w-full rounded-lg border border-border bg-surface py-2 pl-9 pr-3 text-sm text-foreground placeholder:text-muted focus:border-primary/50 focus:outline-none"
          aria-label="Search narrative state"
        />
      </div>
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
    </div>
  );
}

export function matchesStoryVisibilityFilter(
  chipKind: string | null,
  filter: import('@/lib/workspacePersistence').StoryVisibilityFilter,
): boolean {
  if (filter === 'all') return true;
  if (!chipKind) return true;
  return chipKind === filter;
}

export function matchesStoryRecentFilter(
  updatedAt: string | undefined,
  recent: boolean | undefined,
): boolean {
  if (!recent) return true;
  if (!updatedAt) return false;
  const days = (Date.now() - new Date(updatedAt).getTime()) / (1000 * 60 * 60 * 24);
  return days <= 14;
}

export function matchesStorySearchQuery(
  query: string | undefined,
  ...fields: Array<string | null | undefined>
): boolean {
  const q = (query ?? '').trim().toLowerCase();
  if (!q) return true;
  return fields.some((field) => (field ?? '').toLowerCase().includes(q));
}
