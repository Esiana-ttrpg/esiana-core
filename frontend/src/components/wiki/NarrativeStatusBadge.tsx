import type { PageNarrativeStatusProjection } from '@shared/pageNarrativeStatus';
import { shouldShowPageNarrativeStatusBadge } from '@shared/pageNarrativeStatus';

interface NarrativeStatusBadgeProps {
  narrativeStatus?: PageNarrativeStatusProjection | null;
  compact?: boolean;
  /** When true, prefix label with "Canon:" to distinguish from discovery rumor chip */
  showCanonPrefix?: boolean;
}

const TONE_CLASS: Record<PageNarrativeStatusProjection['tone'], string> = {
  neutral: 'border-border bg-muted/30 text-muted',
  muted: 'border-zinc-500/40 bg-zinc-500/10 text-zinc-700 dark:text-zinc-300',
  warning: 'border-amber-500/40 bg-amber-500/10 text-amber-800 dark:text-amber-200',
  legend: 'border-violet-500/40 bg-violet-500/10 text-violet-800 dark:text-violet-200',
  secret: 'border-rose-500/40 bg-rose-500/10 text-rose-800 dark:text-rose-200',
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
