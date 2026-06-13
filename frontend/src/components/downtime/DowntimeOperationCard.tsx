import { Link } from 'react-router-dom';
import type { DowntimeProjectOperationCard } from '@shared/downtimeHub';

interface DowntimeOperationCardProps {
  card: DowntimeProjectOperationCard;
  compact?: boolean;
}

function formatProjectType(type: string): string {
  return type.charAt(0).toUpperCase() + type.slice(1);
}

function formatStatus(status: string): string {
  return status.charAt(0) + status.slice(1).toLowerCase().replace(/_/g, ' ');
}

function statusBadgeClass(clockState: DowntimeProjectOperationCard['clockState']): string {
  switch (clockState) {
    case 'running':
      return 'border-primary/40 bg-primary/10 text-primary';
    case 'waiting':
      return 'border-amber-500/40 bg-amber-950/30 text-amber-100';
    case 'paused':
      return 'border-border bg-muted/30 text-muted-foreground';
    case 'complete':
      return 'border-primary/30 bg-primary/5 text-primary';
    case 'failed':
      return 'border-red-500/30 bg-red-950/20 text-red-200';
    default:
      return 'border-border bg-muted/20 text-muted-foreground';
  }
}

function statusBadgeLabel(card: DowntimeProjectOperationCard): string {
  if (card.clockState === 'waiting') return 'Waiting';
  if (card.clockState === 'paused') return 'Paused';
  if (card.status === 'PLANNED') return 'Planned';
  return formatStatus(card.status);
}

export function DowntimeOperationCard({ card, compact = false }: DowntimeOperationCardProps) {
  const showProgressBar =
    card.clockState === 'running' &&
    BigInt(card.durationTotalMinutes) > 0n &&
    card.status !== 'PLANNED';

  const clockLine =
    card.stalledLabel ?? card.remainingLabel ?? null;

  const detailLine =
    card.stalledLabel == null
      ? (card.blockersSummary ?? card.requiresSummary ?? null)
      : (card.blockersSummary ?? card.requiresSummary ?? null);

  return (
    <article
      className={`region-depth-3 rounded-md ${compact ? 'p-3' : 'p-4'}`}
    >
      <div className="flex flex-col gap-2">
        <div className="flex flex-wrap items-start gap-2">
          <Link
            to={card.href}
            className={`min-w-0 flex-1 font-semibold text-foreground hover:text-primary ${
              compact ? 'text-sm leading-snug' : 'text-base'
            }`}
          >
            {card.title}
          </Link>
          <span
            className={`shrink-0 rounded-full border px-2 py-0.5 text-xs font-medium ${statusBadgeClass(card.clockState)}`}
          >
            {statusBadgeLabel(card)}
          </span>
        </div>

        {clockLine ? (
          <p className={`leading-relaxed text-muted-foreground ${compact ? 'text-xs' : 'text-sm'}`}>
            {clockLine}
          </p>
        ) : null}

        {detailLine ? (
          <p className={`text-muted-foreground ${compact ? 'text-xs' : 'text-sm'}`}>
            {detailLine}
          </p>
        ) : null}

        <p className={`text-muted-foreground/80 ${compact ? 'text-xs' : 'text-sm'}`}>
          {formatProjectType(card.projectType)}
          {card.operationPostureLabel ? ` · ${card.operationPostureLabel}` : ''}
        </p>

        {showProgressBar ? (
          <div
            className="mt-1 h-1 w-full overflow-hidden rounded-full bg-muted/40"
            aria-hidden
          >
            <div
              className="h-full rounded-full bg-primary/35 transition-all"
              style={{ width: `${Math.min(100, Math.max(0, card.progressPercent))}%` }}
            />
          </div>
        ) : card.remainingLabel && !clockLine ? (
          <p className={`text-muted-foreground/80 ${compact ? 'text-xs' : 'text-sm'}`}>
            {card.remainingLabel}
          </p>
        ) : null}
      </div>
    </article>
  );
}
