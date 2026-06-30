import type { CSSProperties, ReactNode } from 'react';
import { WikiWorkspaceShell } from '@/components/layout/WikiWorkspaceShell';
import { WorkspaceHeader } from '@/components/layout/WorkspaceHeader';
import type { WorkspaceCompositionId } from '@/lib/workspaceComposition';
import type { WikiBreadcrumb } from '@/lib/wikiHierarchy';
import { shouldShowHubBreadcrumbs } from '@/lib/workspaceHeaderPolicy';

export type HubHeaderDensity = 'default' | 'compact';

interface CategoryHubShellProps {
  breadcrumbs?: ReactNode;
  /** Raw crumbs for automatic breadcrumb visibility policy */
  breadcrumbCrumbs?: WikiBreadcrumb[];
  showBreadcrumbs?: boolean;
  eyebrow?: string;
  title: ReactNode;
  subtitle?: string;
  /** @deprecated Use subtitle */
  description?: ReactNode;
  showDescription?: boolean;
  actions?: ReactNode;
  /** @deprecated Use actions */
  toolbar?: ReactNode;
  belowToolbar?: ReactNode;
  /** @deprecated Use belowToolbar */
  afterToolbar?: ReactNode;
  activeFilters?: ReactNode;
  children: ReactNode;
  contextual?: ReactNode;
  className?: string;
  catalogGridClass?: string;
  composition?: WorkspaceCompositionId;
  inlineContextual?: boolean;
  headerDensity?: HubHeaderDensity;
  narrativeLayoutClassName?: string;
  narrativeLayoutStyle?: CSSProperties;
  beforeActions?: ReactNode;
  afterActions?: ReactNode;
}

export function CategoryHubShell({
  breadcrumbs,
  breadcrumbCrumbs,
  showBreadcrumbs,
  eyebrow,
  title,
  subtitle,
  description,
  showDescription = false,
  actions,
  toolbar,
  belowToolbar,
  afterToolbar,
  activeFilters,
  children,
  contextual,
  className = '',
  catalogGridClass = 'hub-stagger-grid',
  composition = 'hub',
  inlineContextual = false,
  narrativeLayoutClassName = '',
  narrativeLayoutStyle,
  beforeActions,
  afterActions,
}: CategoryHubShellProps) {
  const resolvedSubtitle =
    subtitle ??
    (showDescription && description != null && typeof description === 'string'
      ? description
      : undefined);

  const resolvedActions = actions ?? toolbar;
  const resolvedBelowToolbar = belowToolbar ?? afterToolbar;

  const showCrumbNav =
    breadcrumbs != null &&
    (showBreadcrumbs ??
      (breadcrumbCrumbs ? shouldShowHubBreadcrumbs(breadcrumbCrumbs) : true));

  return (
    <WikiWorkspaceShell
      composition={composition}
      inlineContextual={inlineContextual}
      contextual={contextual}
      className={[className, narrativeLayoutClassName].filter(Boolean).join(' ')}
      narrativeLayoutStyle={narrativeLayoutStyle}
      header={
        <WorkspaceHeader
          breadcrumbs={showCrumbNav ? breadcrumbs : undefined}
          eyebrow={eyebrow}
          title={title}
          subtitle={resolvedSubtitle}
          actions={resolvedActions}
          beforeActions={beforeActions}
          afterActions={afterActions}
          belowToolbar={resolvedBelowToolbar}
          activeFilters={activeFilters}
        />
      }
    >
      <div className={catalogGridClass}>{children}</div>
    </WikiWorkspaceShell>
  );
}
