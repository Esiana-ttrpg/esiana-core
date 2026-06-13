import type { CSSProperties, ReactNode } from 'react';
import { WikiWorkspaceShell } from '@/components/layout/WikiWorkspaceShell';
import {
  TYPE_DISPLAY_CLASS,
  TYPE_PROSE_CLASS,
  WORKSPACE_HEADER_COMPACT_CLASS,
  WORKSPACE_TITLE_COMPACT_CLASS,
} from '@/lib/surfaceLayout';
import type { WorkspaceCompositionId } from '@/lib/workspaceComposition';

export type HubHeaderDensity = 'default' | 'compact';

interface CategoryHubShellProps {
  breadcrumbs: ReactNode;
  title: ReactNode;
  description?: ReactNode;
  /** When true, description renders below title (compact mode hides by default) */
  showDescription?: boolean;
  toolbar?: ReactNode;
  afterToolbar?: ReactNode;
  children: ReactNode;
  contextual?: ReactNode;
  className?: string;
  catalogGridClass?: string;
  composition?: WorkspaceCompositionId;
  inlineContextual?: boolean;
  headerDensity?: HubHeaderDensity;
  narrativeLayoutClassName?: string;
  narrativeLayoutStyle?: CSSProperties;
}

function resolveHeaderDensity(
  composition: WorkspaceCompositionId,
  headerDensity?: HubHeaderDensity,
): HubHeaderDensity {
  if (headerDensity) return headerDensity;
  if (composition === 'document' || composition === 'reference') return 'default';
  return 'compact';
}

export function CategoryHubShell({
  breadcrumbs,
  title,
  description,
  showDescription = false,
  toolbar,
  afterToolbar,
  children,
  contextual,
  className = '',
  catalogGridClass = 'hub-stagger-grid',
  composition = 'hub',
  inlineContextual = false,
  headerDensity,
  narrativeLayoutClassName = '',
  narrativeLayoutStyle,
}: CategoryHubShellProps) {
  const density = resolveHeaderDensity(composition, headerDensity);
  const isCompact = density === 'compact';
  const headerWrapperClass = isCompact ? WORKSPACE_HEADER_COMPACT_CLASS : 'mb-4 pb-2';
  const titleClass = isCompact
    ? `${TYPE_DISPLAY_CLASS} flex items-center gap-2 ${WORKSPACE_TITLE_COMPACT_CLASS}`
    : `${TYPE_DISPLAY_CLASS} flex items-center gap-2 text-2xl text-focal-foreground sm:text-3xl`;
  const showDesc = Boolean(showDescription && description);
  const inlineToolbarInHeader = isCompact && Boolean(toolbar || afterToolbar);

  const titleBlock = (
    <>
      <h1 className={titleClass}>{title}</h1>
      {showDesc ? (
        <p
          className={`${TYPE_PROSE_CLASS} ${isCompact ? 'mt-1' : 'mt-2'} text-sm text-focal-muted`}
        >
          {description}
        </p>
      ) : null}
    </>
  );

  const toolbarBlock =
    toolbar || afterToolbar ? (
      <div className="flex shrink-0 flex-wrap items-center gap-2">
        {toolbar}
        {afterToolbar}
      </div>
    ) : null;

  return (
    <WikiWorkspaceShell
      composition={composition}
      inlineContextual={inlineContextual}
      contextual={contextual}
      className={[className, narrativeLayoutClassName].filter(Boolean).join(' ')}
      narrativeLayoutStyle={narrativeLayoutStyle}
      header={
        <div className={headerWrapperClass}>
          {breadcrumbs}
          {inlineToolbarInHeader ? (
            <div className="mt-1 flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0 flex-1">{titleBlock}</div>
              {toolbarBlock}
            </div>
          ) : (
            <>
              {!isCompact && toolbar ? <div className="mt-3">{toolbar}</div> : null}
              {!isCompact ? afterToolbar : null}
              {isCompact && !inlineToolbarInHeader && toolbar ? (
                <div className="mt-1">{toolbar}</div>
              ) : null}
              {isCompact && !inlineToolbarInHeader ? afterToolbar : null}
            </>
          )}
        </div>
      }
    >
      {!inlineToolbarInHeader ? <div>{titleBlock}</div> : null}
      <div className={catalogGridClass}>{children}</div>
    </WikiWorkspaceShell>
  );
}
