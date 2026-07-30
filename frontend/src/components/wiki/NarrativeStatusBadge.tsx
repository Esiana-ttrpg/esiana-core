import type { PageNarrativeStatusProjection } from '@shared/pageNarrativeStatus';
import { shouldShowPageNarrativeStatusBadge } from '@shared/pageNarrativeStatus';

interface NarrativeStatusBadgeProps {
  narrativeStatus?: PageNarrativeStatusProjection | null;
  compact?: boolean;
  /** When true, prefix label with "Canon:" to distinguish from discovery rumor chip */
  showCanonPrefix?: boolean;
}

const TONE_CLASS: Record<PageNarrativeStatusProjection['tone'], string> = {
  neutral:
    'border-[color:var(--color-status-neutral-border)] bg-[color:var(--color-status-neutral-bg)] text-[color:var(--color-status-neutral-fg)]',
  muted:
    'border-[color:var(--color-status-muted-border)] bg-[color:var(--color-status-muted-bg)] text-[color:var(--color-status-muted-fg)]',
  warning:
    'border-[color:var(--color-status-warning-border)] bg-[color:var(--color-status-warning-bg)] text-[color:var(--color-status-warning-fg)]',
  legend:
    'border-[color:var(--color-status-legend-border)] bg-[color:var(--color-status-legend-bg)] text-[color:var(--color-status-legend-fg)]',
  secret:
    'border-[color:var(--color-status-secret-border)] bg-[color:var(--color-status-secret-bg)] text-[color:var(--color-status-secret-fg)]',
};

export function narrativeStatusLinkClassName(
  narrativeStatus?: PageNarrativeStatusProjection | null,
): string {
  if (!narrativeStatus?.visibleToParty) return '';
  switch (narrativeStatus.cssModifier) {
    case 'strikethrough':
      return 'wiki-link--narrative-muted wiki-link--narrative-strike';
    case 'muted':
      return 'wiki-link--narrative-muted';
    case 'legend':
      return 'wiki-link--narrative-legend';
    default:
      return '';
  }
}

export function NarrativeStatusBadge({
  narrativeStatus,
  compact = false,
  showCanonPrefix = false,
}: NarrativeStatusBadgeProps) {
  if (!narrativeStatus) return null;
  if (!shouldShowPageNarrativeStatusBadge(narrativeStatus.status)) return null;
  if (!narrativeStatus.visibleToParty) return null;

  const label = showCanonPrefix
    ? `Canon: ${narrativeStatus.label}`
    : narrativeStatus.label;

  return (
    <span
      className={`inline-flex shrink-0 items-center rounded border font-medium ${TONE_CLASS[narrativeStatus.tone]} ${
        compact ? 'px-1.5 py-0 text-[10px]' : 'px-2 py-0.5 text-xs'
      }`}
      title={narrativeStatus.reason ?? undefined}
    >
      {label}
    </span>
  );
}

export function NarrativeStatusGmBadge({
  narrativeStatus,
  compact = false,
}: NarrativeStatusBadgeProps) {
  if (!narrativeStatus) return null;
  if (!shouldShowPageNarrativeStatusBadge(narrativeStatus.status)) return null;

  return (
    <span
      className={`inline-flex shrink-0 items-center rounded border font-medium ${TONE_CLASS[narrativeStatus.tone]} ${
        compact ? 'px-1.5 py-0 text-[10px]' : 'px-2 py-0.5 text-xs'
      }`}
      title={narrativeStatus.reason ?? `Canon narrative status: ${narrativeStatus.label}`}
    >
      Canon: {narrativeStatus.label}
    </span>
  );
}
