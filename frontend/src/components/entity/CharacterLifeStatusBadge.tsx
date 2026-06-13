import { HelpCircle, MapPinOff, Skull } from 'lucide-react';
import type { CharacterLifeStatus } from '@/lib/characterMetadata';
import { formatCharacterStatusLabel } from '@/lib/characterMetadata';

interface CharacterLifeStatusBadgeProps {
  status: CharacterLifeStatus;
  className?: string;
  compact?: boolean;
}

const STATUS_STYLES: Record<
  CharacterLifeStatus,
  { className: string; Icon: typeof Skull | null }
> = {
  ALIVE: {
    className: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300',
    Icon: null,
  },
  DECEASED: {
    className: 'border-muted/50 bg-muted/20 text-muted line-through decoration-muted/60',
    Icon: Skull,
  },
  MISSING: {
    className: 'border-amber-500/40 bg-amber-500/10 text-amber-800 dark:text-amber-200 border-dashed',
    Icon: HelpCircle,
  },
  EXILED: {
    className: 'border-sky-500/40 bg-sky-500/10 text-sky-800 dark:text-sky-200',
    Icon: MapPinOff,
  },
  UNKNOWN: {
    className: 'border-border bg-surface/40 text-muted border-dashed',
    Icon: HelpCircle,
  },
};

export function getCharacterLifeStatusRowClass(status: CharacterLifeStatus): string {
  switch (status) {
    case 'DECEASED':
      return 'opacity-70 saturate-[0.65]';
    case 'MISSING':
      return 'opacity-90';
    case 'EXILED':
      return '';
    default:
      return '';
  }
}

export function getCharacterLifeStatusSurfaceClass(status: CharacterLifeStatus): string {
  switch (status) {
    case 'DECEASED':
      return 'opacity-80 saturate-[0.7]';
    case 'MISSING':
      return 'border-l-2 border-l-amber-500/50 pl-2';
    case 'EXILED':
      return 'border-l-2 border-l-sky-500/50 pl-2';
    default:
      return '';
  }
}

export function CharacterLifeStatusBadge({
  status,
  className = '',
  compact = false,
}: CharacterLifeStatusBadgeProps) {
  if (status === 'ALIVE') return null;

  const { className: statusClass, Icon } = STATUS_STYLES[status];
  const label = formatCharacterStatusLabel(status);

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 font-semibold uppercase tracking-wide text-muted ${statusClass} ${compact ? 'text-[9px]' : 'text-[10px]'} ${className}`}
    >
      {Icon ? <Icon className="size-3 shrink-0" aria-hidden /> : null}
      <span>{label}</span>
    </span>
  );
}
