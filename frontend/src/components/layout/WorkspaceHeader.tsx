import type { ReactNode } from 'react';
import {
  TYPE_DISPLAY_CLASS,
  TYPE_META_CLASS,
  WORKSPACE_HEADER_BELOW_TOOLBAR_CLASS,
  WORKSPACE_HEADER_CHIPS_CLASS,
  WORKSPACE_HEADER_ROOT_CLASS,
  WORKSPACE_HEADER_TITLE_ACTIONS_CLASS,
  WORKSPACE_TITLE_COMPACT_CLASS,
} from '@/lib/surfaceLayout';

export interface WorkspaceHeaderProps {
  breadcrumbs?: ReactNode;
  eyebrow?: string;
  title: ReactNode;
  subtitle?: string;
  actions?: ReactNode;
  beforeActions?: ReactNode;
  afterActions?: ReactNode;
  belowToolbar?: ReactNode;
  activeFilters?: ReactNode;
}

export function WorkspaceHeader({
  breadcrumbs,
  eyebrow,
  title,
  subtitle,
  actions,
  beforeActions,
  afterActions,
  belowToolbar,
  activeFilters,
}: WorkspaceHeaderProps) {
  const titleClass = `${TYPE_DISPLAY_CLASS} flex items-center gap-2 ${WORKSPACE_TITLE_COMPACT_CLASS}`;

  return (
    <header className={WORKSPACE_HEADER_ROOT_CLASS}>
      {breadcrumbs ? <div className="min-w-0">{breadcrumbs}</div> : null}

      <div className={WORKSPACE_HEADER_TITLE_ACTIONS_CLASS}>
        <div className="min-w-0 flex-1">
          {eyebrow ? (
            <p className={`${TYPE_META_CLASS} mb-0.5 text-xs text-muted`}>{eyebrow}</p>
          ) : null}
          <h1 className={titleClass}>{title}</h1>
          {subtitle ? (
            <p className={`${TYPE_META_CLASS} mt-0.5 text-sm text-focal-muted`}>{subtitle}</p>
          ) : null}
        </div>

        <div className="flex shrink-0 flex-wrap items-center justify-end gap-2">
          {beforeActions}
          {actions}
          {afterActions}
        </div>
      </div>

      {belowToolbar ? (
        <div className={WORKSPACE_HEADER_BELOW_TOOLBAR_CLASS}>{belowToolbar}</div>
      ) : null}

      {activeFilters ? (
        <div className={WORKSPACE_HEADER_CHIPS_CLASS}>{activeFilters}</div>
      ) : null}
    </header>
  );
}
