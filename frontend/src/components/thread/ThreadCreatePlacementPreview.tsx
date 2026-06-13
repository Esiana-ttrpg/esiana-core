import {
  isPlayerTheoryThread,
  THREAD_KIND_GROUP_LABELS,
} from '@/lib/threadMetadata';
import type { ThreadKind } from '@/lib/threadMetadata';

interface ThreadCreatePlacementPreviewProps {
  threadKind: ThreadKind;
  playerSubmitted: boolean;
}

export function threadCreatePlacementLabel(
  threadKind: ThreadKind,
  playerSubmitted: boolean,
): string {
  if (isPlayerTheoryThread(threadKind, playerSubmitted)) {
    return 'Player Theories (Threads Hub)';
  }
  const group = THREAD_KIND_GROUP_LABELS[threadKind];
  return `Narrative Threads → ${group}`;
}

export function ThreadCreatePlacementPreview({
  threadKind,
  playerSubmitted,
}: ThreadCreatePlacementPreviewProps) {
  const label = threadCreatePlacementLabel(threadKind, playerSubmitted);
  return (
    <div className="rounded-lg border border-border/80 bg-surface/40 px-3 py-2 text-sm">
      <p className="text-[10px] font-medium uppercase tracking-wide text-muted">
        Appears in
      </p>
      <p className="mt-1 text-foreground">{label}</p>
      <p className="mt-1 text-[11px] text-muted">
        Living Threads dashboard rail when lifecycle and status match active
        visibility rules.
      </p>
    </div>
  );
}
