import type { ReactNode } from 'react';
import { CategoryIndexViewToggle } from '@/components/wiki/indexBrowse/CategoryIndexViewToggle';
import {
  WorkspaceActionBar,
  type WorkspaceCreateAction,
} from '@/components/layout/WorkspaceActionBar';
import type { CategoryIndexViewMode } from '@/lib/categoryIndexBrowseStorage';

interface CategoryIndexToolbarProps {
  createLabel: string;
  onCreate: () => void;
  createAction?: ReactNode | null;
  resultCountLabel?: string | null;
  refineControl?: ReactNode;
  sortControl?: ReactNode;
  viewMode?: CategoryIndexViewMode;
  onViewModeChange?: (mode: CategoryIndexViewMode) => void;
  allowedViews?: CategoryIndexViewMode[];
  tableViewTitle?: string;
  viewControl?: ReactNode;
  modeControl?: ReactNode;
  trailing?: ReactNode;
  /** @deprecated Search removed — use Refine popover on hubs with meaningful refine */
  searchValue?: string;
  searchPlaceholder?: string;
  onSearchChange?: (value: string) => void;
  showSearch?: boolean;
  createPlacement?: 'start' | 'end';
}

export function CategoryIndexToolbar({
  createLabel,
  onCreate,
  createAction,
  resultCountLabel = null,
  refineControl,
  sortControl,
  viewMode,
  onViewModeChange,
  allowedViews,
  tableViewTitle,
  viewControl,
  modeControl,
  trailing,
}: CategoryIndexToolbarProps) {
  const viewSlot =
    viewControl ??
    (viewMode !== undefined && onViewModeChange ? (
      <CategoryIndexViewToggle
        viewMode={viewMode}
        onViewModeChange={onViewModeChange}
        showHierarchy={allowedViews?.includes('hierarchy') ?? true}
        tableViewTitle={tableViewTitle}
      />
    ) : null);

  const createSlot: WorkspaceCreateAction | ReactNode | null =
    createAction === null
      ? null
      : createAction === undefined
        ? { label: createLabel, onClick: onCreate }
        : createAction;

  return (
    <WorkspaceActionBar
      resultHint={resultCountLabel}
      refine={refineControl}
      sort={sortControl}
      view={viewSlot}
      mode={modeControl}
      trailing={trailing}
      create={createSlot}
    />
  );
}
