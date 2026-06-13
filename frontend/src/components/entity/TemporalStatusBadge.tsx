import { Calendar, Skull, Baby } from 'lucide-react';
import type { ChronologyDateParts } from '@/lib/entityRelationTypes';
import { formatChronologyDateLabel } from '@/components/entity/ChronologyDateFields';

export type TemporalBadgeVariant = 'active-range' | 'died' | 'born';

function formatYearShort(parts: ChronologyDateParts | null): string {
  if (!parts || parts.year === null) return '—';
  return `Y${parts.year}`;
}

export function formatActiveRangeLabel(
  start: ChronologyDateParts | null,
  end: ChronologyDateParts | null,
): string {
  const startLabel = formatYearShort(start);
  const endLabel = end ? formatYearShort(end) : 'present';
  return `Active: ${startLabel}–${endLabel}`;
}

export function formatDiedLabel(deathDate: ChronologyDateParts | null): string {
  return `Died: ${formatYearShort(deathDate)}`;
}

export function formatBornLabel(birthDate: ChronologyDateParts | null): string {
  return `Born: ${formatYearShort(birthDate)}`;
}

interface TemporalStatusBadgeProps {
  variant: TemporalBadgeVariant;
  startDate?: ChronologyDateParts | null;
  endDate?: ChronologyDateParts | null;
  date?: ChronologyDateParts | null;
  className?: string;
}

export function TemporalStatusBadge({
  variant,
  startDate = null,
  endDate = null,
  date = null,
  className = '',
}: TemporalStatusBadgeProps) {
  let label: string;
  let Icon = Calendar;

  switch (variant) {
    case 'active-range':
      label = formatActiveRangeLabel(startDate, endDate);
      Icon = Calendar;
      break;
    case 'died':
      label = formatDiedLabel(date ?? endDate);
      Icon = Skull;
      break;
    case 'born':
      label = formatBornLabel(date ?? startDate);
      Icon = Baby;
      break;
    default:
      label = '—';
  }

  const fullDate =
    variant === 'born'
      ? formatChronologyDateLabel(date ?? startDate)
      : variant === 'died'
        ? formatChronologyDateLabel(date ?? endDate)
        : undefined;

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border border-border bg-surface/60 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-muted ${className}`}
      title={fullDate !== '—' ? fullDate : undefined}
    >
      <Icon className="size-3 shrink-0" aria-hidden />
      <span>{label}</span>
    </span>
  );
}
