import type { ReactNode } from 'react';
import { CategoryIndexViewToggle } from '@/components/wiki/indexBrowse/CategoryIndexViewToggle';
import {
  WorkspaceActionBar,
  type WorkspaceCreateAction,
  type WorkspaceCreateMenu,
} from '@/components/layout/WorkspaceActionBar';
import type { CategoryIndexViewMode } from '@/lib/categoryIndexBrowseStorage';

interface CategoryIndexToolbarProps {
  title?: ReactNode;
  audience?: ReactNode;
  createLabel: string;
  onCreate: () => void;
  createAction?: ReactNode | null;
  createMenu?: WorkspaceCreateMenu;
  resultCountLabel?: string | null;
  refineControl?: ReactNode;
  sortControl?: ReactNode;
  viewMode?: CategoryIndexViewMode;
  onViewModeChange?: (mode: CategoryIndexViewMode) => void;
  allowedViews?: CategoryIndexViewMode[];
  tableViewTitle?: string;
  hierarchyLabel?: string;
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
  title,
  audience,
  createLabel,
  onCreate,
  createAction,
  createMenu,
  refineControl,
  sortControl,
  viewMode,
  onViewModeChange,
  allowedViews,
  tableViewTitle,
  hierarchyLabel,
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
        allowedViews={allowedViews}
        tableViewTitle={tableViewTitle}
        hierarchyLabel={hierarchyLabel}
      />
    ) : null);

  const createSlot: WorkspaceCreateAction | WorkspaceCreateMenu | ReactNode | null =
    createMenu ?? (createAction === null
      ? null
      : createAction === undefined
        ? { label: createLabel, onClick: onCreate }
        : createAction);

  return (
    <WorkspaceActionBar
      title={title}
      audience={audience}
      refine={refineControl}
      sort={sortControl}
      view={viewSlot}
      mode={modeControl}
      trailing={trailing}
      create={createSlot}
    />
  );
}
