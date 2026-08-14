import type {
  ThreadKind,
  ThreadNarrativeWeight,
  ThreadStatus,
} from '@/lib/threadMetadata';
import type { ThreadSignalId } from '@/lib/threadMetadata';

export const THREAD_NARRATIVE_WEIGHT_LABELS: Record<ThreadNarrativeWeight, string> = {
  minor: 'Minor',
  major: 'Major',
  critical: 'Critical',
};

export const THREAD_NARRATIVE_WEIGHT_HINTS: Record<ThreadNarrativeWeight, string> = {
  minor: 'Background texture; low campaign pressure',
  major: 'Standard plot pressure',
  critical: 'Campaign-defining; surfaces prominently later',
};

export const THREAD_KIND_LABELS: Record<ThreadKind, string> = {
  mystery: 'Mystery',
  promise: 'Promise',
  foreshadowing: 'Foreshadowing',
  clue: 'Clue',
  theory: 'Theory',
};

export const THREAD_KIND_ICONS: Record<ThreadKind, string> = {
  mystery: 'help-circle',
  promise: 'flag',
  foreshadowing: 'eye',
  clue: 'pin',
  theory: 'message-circle',
};

export const THREAD_KIND_TONE_CLASS: Record<ThreadKind, string> = {
  mystery:
    'border-[color:var(--color-status-neutral-border)] text-[color:var(--color-status-neutral-fg)] bg-[color:var(--color-status-neutral-bg)]',
  promise: 'border-primary/40 text-primary bg-primary/10',
  foreshadowing:
    'border-[color:var(--color-status-legend-border)] text-[color:var(--color-status-legend-fg)] bg-[color:var(--color-status-legend-bg)]',
  clue:
    'border-[color:var(--color-status-warning-border)] text-[color:var(--color-status-warning-fg)] bg-[color:var(--color-status-warning-bg)]',
  theory:
    'border-primary/40 text-primary bg-primary/10',
};

export const THREAD_STATUS_CLASS: Record<ThreadStatus, string> = {
  OPEN:
    'border-[color:var(--color-status-warning-border)] text-[color:var(--color-status-warning-fg)] bg-[color:var(--color-status-warning-bg)]',
  DORMANT:
    'border-[color:var(--color-status-muted-border)] text-[color:var(--color-status-muted-fg)] bg-[color:var(--color-status-muted-bg)]',
  RESOLVED:
    'border-[color:var(--color-status-neutral-border)] text-[color:var(--color-status-neutral-fg)] bg-[color:var(--color-status-neutral-bg)]',
  ABANDONED:
    'border-[color:var(--color-status-secret-border)] text-[color:var(--color-status-secret-fg)] bg-[color:var(--color-status-secret-bg)] line-through',
};

export const THREAD_HUB_ZONE_CLASS = {
  authored: 'rounded-xl border border-border/80 bg-card/40 p-4',
  theories: 'rounded-xl border border-dashed border-primary/30 bg-primary/5 p-4',
} as const;

export const THREAD_SIGNAL_CHIP_CLASS =
  'rounded border border-[color:var(--color-status-warning-border)] bg-[color:var(--color-status-warning-bg)] px-1.5 py-0.5 text-[9px] font-medium uppercase tracking-wide text-[color:var(--color-status-warning-fg)]';

export function threadSignalLabel(signal: ThreadSignalId): string {
  const labels: Record<ThreadSignalId, string> = {
    stale: 'Stale',
    dangling_foreshadowing: 'No payoff',
    unresolved_promise: 'Long promise',
    theory_contradiction: 'Resolved theory',
  };
  return labels[signal] ?? signal;
}
