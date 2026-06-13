import { EyeOff } from 'lucide-react';

interface QuestDmPrivateChipProps {
  compact?: boolean;
}

const DM_ONLY_TONE =
  'border-red-500/30 bg-red-500/10 text-red-800 dark:text-red-200';

export function QuestDmPrivateChip({ compact = false }: QuestDmPrivateChipProps) {
  return (
    <span
      className={`inline-flex shrink-0 items-center gap-0.5 rounded-md border font-bold uppercase tracking-wider ${DM_ONLY_TONE} ${
        compact
          ? 'px-1 py-px text-[9px]'
          : 'px-1.5 py-0.5 text-[10px]'
      }`}
      title="Hidden from party — publish or advance lifecycle to reveal"
    >
      <EyeOff className={compact ? 'size-2.5' : 'size-3'} aria-hidden />
      DM
    </span>
  );
}
