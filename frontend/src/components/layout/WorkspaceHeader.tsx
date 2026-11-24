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
  /** When set, renders in place of the visible title; `title` stays as an sr-only h1. */
  titleReplacement?: ReactNode;
  subtitle?: string;
  actions?: ReactNode;
  beforeActions?: ReactNode;
  afterActions?: ReactNode;
  belowToolbar?: ReactNode;
  activeFilters?: ReactNode;
  compact?: boolean;
}

export function WorkspaceHeader({
  breadcrumbs,
  eyebrow,
  title,
  titleReplacement,
  subtitle,
  actions,
  beforeActions,
  afterActions,
  belowToolbar,
  activeFilters,
  compact = false,
}: WorkspaceHeaderProps) {
  const titleClass = compact
    ? `${TYPE_META_CLASS} flex items-center gap-2 text-sm font-medium text-focal-foreground`
    : `${TYPE_DISPLAY_CLASS} flex items-center gap-2 ${WORKSPACE_TITLE_COMPACT_CLASS}`;

  return (
    <header className={`${WORKSPACE_HEADER_ROOT_CLASS}${compact ? ' workspace-header--compact' : ''}`}>
      {breadcrumbs ? <div className="min-w-0">{breadcrumbs}</div> : null}

      <div className={WORKSPACE_HEADER_TITLE_ACTIONS_CLASS}>
        <div className="min-w-0 flex-1">
          {eyebrow ? (
            <p className={`${TYPE_META_CLASS} mb-0.5 text-xs text-muted`}>{eyebrow}</p>
          ) : null}
          {titleReplacement ? (
            <>
              <h1 className="sr-only">{title}</h1>
              <div className="min-w-0">{titleReplacement}</div>
            </>
          ) : (
            <h1 className={titleClass}>{title}</h1>
          )}
          {subtitle ? (
            <p className={`${TYPE_META_CLASS} mt-0.5 text-sm text-focal-muted`}>{subtitle}</p>
          ) : null}
        </div>

        <div className={`flex flex-wrap items-center justify-end gap-2 ${compact ? 'min-w-0 max-w-full' : 'shrink-0'}`}>
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
