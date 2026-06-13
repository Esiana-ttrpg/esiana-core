import type { QuestTimePressureBadge } from '@shared/questTimeSimulation';

const BADGE_LABELS: Record<QuestTimePressureBadge, string> = {
  expiring: 'Expiring',
  offscreen: 'Offscreen',
  escalating: 'Escalating',
  paused: 'Paused',
};

const BADGE_CLASS: Record<QuestTimePressureBadge, string> = {
  expiring: 'border-amber-500/40 bg-amber-950/30 text-amber-200',
  offscreen: 'border-sky-500/40 bg-sky-950/30 text-sky-200',
  escalating: 'border-red-500/40 bg-red-950/30 text-red-200',
  paused: 'border-border bg-elevated/40 text-muted-foreground',
};

interface QuestTimePressureBadgesProps {
  badges: QuestTimePressureBadge[];
  compact?: boolean;
}

export function QuestTimePressureBadges({
  badges,
  compact = false,
}: QuestTimePressureBadgesProps) {
  if (!badges.length) return null;
  return (
    <div className={`flex flex-wrap gap-1 ${compact ? '' : 'mt-1.5'}`}>
      {badges.map((badge) => (
        <span
          key={badge}
          className={`rounded-full border px-2 py-0.5 font-medium uppercase tracking-wide ${
            compact ? 'text-[9px]' : 'text-[10px]'
          } ${BADGE_CLASS[badge]}`}
        >
          {BADGE_LABELS[badge]}
        </span>
      ))}
    </div>
  );
}
