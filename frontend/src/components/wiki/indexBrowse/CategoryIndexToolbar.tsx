import type { ReactNode } from 'react';
import { Plus } from 'lucide-react';
import { CategoryIndexSearchInput } from '@/components/wiki/indexBrowse/CategoryIndexSearchInput';
import { CategoryIndexViewToggle } from '@/components/wiki/indexBrowse/CategoryIndexViewToggle';
import type { CategoryIndexViewMode } from '@/lib/categoryIndexBrowseStorage';

interface CategoryIndexToolbarProps {
  createLabel: string;
  onCreate: () => void;
  /** Replaces default create button. Pass `null` to hide create/upload. */
  createAction?: ReactNode | null;
  /** Where the create button renders — default `end` (right cluster). */
  createPlacement?: 'start' | 'end';
  searchValue: string;
  searchPlaceholder: string;
  onSearchChange: (value: string) => void;
  resultCountLabel: string | null;
  refineControl: ReactNode;
  viewMode?: CategoryIndexViewMode;
  onViewModeChange?: (mode: CategoryIndexViewMode) => void;
  allowedViews?: CategoryIndexViewMode[];
  tableViewTitle?: string;
  trailing?: ReactNode;
  /** When false, search input is hidden (e.g. parent Story toolbar owns search). */
  showSearch?: boolean;
}

export function CategoryIndexToolbar({
  createLabel,
  onCreate,
  createAction,
  createPlacement = 'end',
  searchValue,
  searchPlaceholder,
  onSearchChange,
  resultCountLabel,
  refineControl,
  viewMode,
  onViewModeChange,
  allowedViews,
  tableViewTitle,
  trailing,
  showSearch = true,
}: CategoryIndexToolbarProps) {
  const createButton =
    createAction === undefined ? (
      <button
        type="button"
        onClick={onCreate}
        className="inline-flex shrink-0 items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-background hover:bg-primary-hover"
      >
        <Plus className="size-4" />
        {createLabel}
      </button>
    ) : (
      createAction
    );

  return (
    <div className="space-y-2">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex min-w-0 flex-1 flex-col gap-2 sm:flex-row sm:items-center">
          {createPlacement === 'start' ? createButton : null}
          {showSearch ? (
            <CategoryIndexSearchInput
              value={searchValue}
              placeholder={searchPlaceholder}
              onChange={onSearchChange}
            />
          ) : null}
        </div>

        <div className="flex flex-wrap items-center gap-2 sm:justify-end">
          {resultCountLabel && (
            <span className="text-xs text-muted">{resultCountLabel}</span>
          )}
          {refineControl}
          {viewMode !== undefined && onViewModeChange && (
            <CategoryIndexViewToggle
              viewMode={viewMode}
              onViewModeChange={onViewModeChange}
              showHierarchy={allowedViews?.includes('hierarchy') ?? true}
              tableViewTitle={tableViewTitle}
            />
          )}
          {trailing}
          {createPlacement === 'end' && createAction !== null ? createButton : null}
        </div>
      </div>
    </div>
  );
}
