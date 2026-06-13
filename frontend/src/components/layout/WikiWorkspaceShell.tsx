import type { CSSProperties, ReactNode } from 'react';
import { NarrativeLayout } from '@/components/layout/NarrativeLayout';
import type { WorkspaceCompositionId } from '@/lib/workspaceComposition';
import { WORKSPACE_FOCAL_COMPACT_CLASS } from '@/lib/surfaceLayout';

export type FocalDensity = 'default' | 'compact';

export function defaultFocalDensityForComposition(
  composition: WorkspaceCompositionId,
): FocalDensity {
  if (composition === 'document' || composition === 'reference') {
    return 'default';
  }
  return 'compact';
}

interface WikiWorkspaceShellProps {
  /** Route-driven composition preset */
  composition: WorkspaceCompositionId;
  /** Page chrome (breadcrumbs, toolbar) — shares focal padding envelope */
  header?: ReactNode;
  /** Primary page content */
  children: ReactNode;
  /** Optional contextual continuity rail */
  contextual?: ReactNode;
  /** When true, focal and contextual sit side-by-side on large screens */
  inlineContextual?: boolean;
  /** Focal column spacing — defaults from composition when omitted */
  focalDensity?: FocalDensity;
  className?: string;
  articleClassName?: string;
  style?: CSSProperties;
  /** Layout overrides on NarrativeLayout (grid columns, CSS vars) */
  narrativeLayoutStyle?: CSSProperties;
  /** Extra data attributes on the article root */
  articleProps?: Record<string, string | undefined>;
}

const FOCAL_ENVELOPE_BASE =
  'wiki-focal-region wiki-focal-region--canvas wiki-focal-region--page-envelope flex w-full min-w-0 flex-col';

export function WikiWorkspaceShell({
  composition,
  header,
  children,
  contextual,
  inlineContextual,
  focalDensity,
  className = '',
  articleClassName = '',
  style,
  narrativeLayoutStyle,
  articleProps,
}: WikiWorkspaceShellProps) {
  const density = focalDensity ?? defaultFocalDensityForComposition(composition);
  const isCompact = density === 'compact';

  const focalEnvelopeClass = [
    FOCAL_ENVELOPE_BASE,
    isCompact ? WORKSPACE_FOCAL_COMPACT_CLASS : '',
    isCompact ? 'gap-2' : 'gap-4',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <article
      className={[
        'relative flex w-full min-w-0 flex-col overflow-x-hidden',
        articleClassName,
      ]
        .filter(Boolean)
        .join(' ')}
      style={style}
      {...articleProps}
    >
      <NarrativeLayout
        composition={composition}
        inlineContextual={inlineContextual}
        className={className}
        style={narrativeLayoutStyle}
        focal={
          <div className={focalEnvelopeClass}>
            {header ? <header className="min-w-0">{header}</header> : null}
            {children}
          </div>
        }
        contextual={contextual}
      />
    </article>
  );
}
