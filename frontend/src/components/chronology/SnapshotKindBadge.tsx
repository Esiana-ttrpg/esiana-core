import { FileText, MapPin, Star } from 'lucide-react';
import type { NarrativeSnapshotKindLabel } from '@/types/visitSnapshots';

type SnapshotKindBadgeProps = {
  kindLabel: NarrativeSnapshotKindLabel;
  className?: string;
};

const KIND_META: Record<
  NarrativeSnapshotKindLabel,
  { label: string; Icon: typeof MapPin }
> = {
  visit: { label: 'Visit', Icon: MapPin },
  milestone: { label: 'Milestone', Icon: Star },
  manual: { label: 'Manual', Icon: FileText },
};

export function SnapshotKindBadge({ kindLabel, className = '' }: SnapshotKindBadgeProps) {
  const { label, Icon } = KIND_META[kindLabel];
  return (
    <span
      className={`inline-flex items-center gap-1 rounded bg-muted/60 px-1.5 py-0.5 text-[10px] font-medium text-muted ${className}`}
    >
      <Icon className="size-3 shrink-0" aria-hidden />
      {label}
    </span>
  );
}

export function formatMomentOptionLabel(input: {
  dateLabel: string;
  kindLabel: NarrativeSnapshotKindLabel;
  displayLabel: string;
}): string {
  const kindWord =
    input.kindLabel === 'visit'
      ? 'Visit'
      : input.kindLabel === 'milestone'
        ? 'Milestone'
        : 'Manual';
  return `${input.dateLabel} · ${kindWord} · ${input.displayLabel}`;
}
