import { LayoutGrid, List, ListTree } from 'lucide-react';
import type { CategoryIndexViewMode } from '@/lib/categoryIndexBrowseStorage';

interface CategoryIndexViewToggleProps {
  viewMode: CategoryIndexViewMode;
  onViewModeChange: (mode: CategoryIndexViewMode) => void;
  /** Hide hierarchy for surfaces that don't support it (e.g. quest hub). */
  showHierarchy?: boolean;
  tableViewTitle?: string;
}

export function CategoryIndexViewToggle({
  viewMode,
  onViewModeChange,
  showHierarchy = true,
  tableViewTitle,
}: CategoryIndexViewToggleProps) {
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
        aria-label="Cards view"
      >
        <LayoutGrid className="size-4" />
        <span className="hidden sm:inline">Cards</span>
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
        aria-label="Table view"
        title={tableViewTitle}
      >
        <List className="size-4" />
        <span className="hidden sm:inline">Table</span>
      </button>
      {showHierarchy && (
        <button
          type="button"
          onClick={() => onViewModeChange('hierarchy')}
          className={`inline-flex items-center gap-1.5 rounded px-2.5 py-1.5 text-sm transition-colors ${
            viewMode === 'hierarchy'
              ? 'bg-primary/20 text-primary'
              : 'text-muted hover:text-foreground'
          }`}
          aria-pressed={viewMode === 'hierarchy'}
          aria-label="Nested view"
        >
          <ListTree className="size-4" />
          <span className="hidden sm:inline">Nested</span>
        </button>
      )}
    </div>
  );
}
