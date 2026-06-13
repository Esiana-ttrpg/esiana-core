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
  mystery: 'border-slate-500/40 text-slate-200 bg-slate-500/10',
  promise: 'border-indigo-500/40 text-indigo-200 bg-indigo-500/10',
  foreshadowing: 'border-violet-500/40 text-violet-200 bg-violet-500/10',
  clue: 'border-amber-500/40 text-amber-200 bg-amber-500/10',
  theory: 'border-cyan-500/40 text-cyan-200 bg-cyan-500/10',
};

export const THREAD_STATUS_CLASS: Record<ThreadStatus, string> = {
  OPEN: 'border-amber-500/40 text-amber-200 bg-amber-500/10',
  DORMANT: 'border-slate-500/40 text-slate-300 bg-slate-500/10',
  RESOLVED: 'border-emerald-500/40 text-emerald-200 bg-emerald-500/10',
  ABANDONED: 'border-rose-500/40 text-rose-300/80 bg-rose-500/5 line-through',
};

export const THREAD_HUB_ZONE_CLASS = {
  authored: 'rounded-xl border border-border/80 bg-card/40 p-4',
  theories:
    'rounded-xl border border-dashed border-cyan-500/30 bg-cyan-950/10 p-4',
} as const;

export const THREAD_SIGNAL_CHIP_CLASS =
  'rounded border border-amber-500/30 bg-amber-500/10 px-1.5 py-0.5 text-[9px] font-medium uppercase tracking-wide text-amber-200/90';

export function threadSignalLabel(signal: ThreadSignalId): string {
  const labels: Record<ThreadSignalId, string> = {
    stale: 'Stale',
    dangling_foreshadowing: 'No payoff',
    unresolved_promise: 'Long promise',
    theory_contradiction: 'Resolved theory',
  };
  return labels[signal] ?? signal;
}
