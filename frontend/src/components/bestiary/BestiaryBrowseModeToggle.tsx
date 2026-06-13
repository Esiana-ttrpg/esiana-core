import { LayoutGrid, List } from 'lucide-react';
import type { CategoryIndexViewMode } from '@/lib/categoryIndexBrowseStorage';

interface BestiaryBrowseModeToggleProps {
  viewMode: CategoryIndexViewMode;
  onViewModeChange: (mode: CategoryIndexViewMode) => void;
}

export function BestiaryBrowseModeToggle({
  viewMode,
  onViewModeChange,
}: BestiaryBrowseModeToggleProps) {
  return (
    <div className="flex items-center gap-1 rounded-lg border border-border bg-elevated/50 p-1">
      <button
        type="button"
        onClick={() => onViewModeChange('card')}
        className={`inline-flex items-center gap-1.5 rounded px-2.5 py-1.5 text-sm transition-colors ${
          viewMode === 'card'
            ? 'bg-primary/20 text-primary'
            : 'text-muted hover:text-foreground'
        }`}
        aria-pressed={viewMode === 'card'}
        aria-label="Grid view"
      >
        <LayoutGrid className="size-4" />
        <span className="hidden sm:inline">Grid</span>
      </button>
      <button
        type="button"
        onClick={() => onViewModeChange('table')}
        className={`inline-flex items-center gap-1.5 rounded px-2.5 py-1.5 text-sm transition-colors ${
          viewMode === 'table'
            ? 'bg-primary/20 text-primary'
            : 'text-muted hover:text-foreground'
        }`}
        aria-pressed={viewMode === 'table'}
        aria-label="Research view"
        title="Denser tactical layout for campaign prep"
      >
        <List className="size-4" />
        <span className="hidden sm:inline">Research</span>
      </button>
    </div>
  );
}
