/**
 * Thread kind display order and labels for hub grouping (extensible without render rewrites).
 */
import { THREAD_KINDS, type ThreadKind } from './threadMetadata.js';

/** Authored kinds only — theories render in a separate hub zone. */
export const THREAD_KIND_DISPLAY_ORDER: readonly ThreadKind[] = [
  'mystery',
  'promise',
  'foreshadowing',
  'clue',
] as const;

export const THREAD_KIND_GROUP_LABELS: Record<ThreadKind, string> = {
  mystery: 'Mysteries',
  promise: 'Promises',
  foreshadowing: 'Foreshadowing',
  clue: 'Clues',
  theory: 'Theories',
};

export function isAuthoredThreadKind(kind: ThreadKind): boolean {
  return kind !== 'theory';
}

export function isPlayerTheoryThread(
  kind: ThreadKind,
  playerSubmitted: boolean,
): boolean {
  return kind === 'theory' || playerSubmitted;
}

export function allThreadKinds(): readonly ThreadKind[] {
  return THREAD_KINDS;
}
