import { EyeOff } from 'lucide-react';
import { QUEST_HIDDEN_LIFECYCLE_TOOLTIP } from '@/lib/questLifecycleDisplay';

interface QuestHiddenLifecycleChipProps {
  compact?: boolean;
}

const HIDDEN_TONE =
  'border-border/60 bg-surface/60 text-muted';

export function QuestHiddenLifecycleChip({ compact = false }: QuestHiddenLifecycleChipProps) {
  return (
    <span
      className={`inline-flex shrink-0 items-center gap-0.5 rounded-md border font-semibold uppercase tracking-wider ${HIDDEN_TONE} ${
        compact
          ? 'px-1 py-px text-[9px]'
          : 'px-1.5 py-0.5 text-[10px]'
      }`}
      title={QUEST_HIDDEN_LIFECYCLE_TOOLTIP}
    >
      <EyeOff className={compact ? 'size-2.5' : 'size-3'} aria-hidden />
      Hidden
    </span>
  );
}
