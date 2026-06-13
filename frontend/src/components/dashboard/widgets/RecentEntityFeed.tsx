import { Link } from 'react-router-dom';
import type { RecentEntityFeedItem } from '@/lib/dashboardSummary';
import { TYPE_PROSE_CLASS } from '@/lib/surfaceLayout';

interface RecentEntityFeedProps {
  items: RecentEntityFeedItem[];
  emptyMessage?: string;
  showReason?: boolean;
  tone?: 'canvas' | 'focal';
}

export function RecentEntityFeed({
  items,
  emptyMessage = 'Nothing here yet.',
  showReason = false,
  tone = 'canvas',
}: RecentEntityFeedProps) {
  const isFocal = tone === 'focal';

  if (items.length === 0) {
    return (
      <p
        className={
          isFocal
            ? `${TYPE_PROSE_CLASS} text-sm text-focal-muted`
            : 'text-sm text-muted'
        }
      >
        {emptyMessage}
      </p>
    );
  }

  const itemClass = isFocal
    ? 'region-depth-3 flex items-start justify-between gap-3 rounded-md px-3 py-2 text-sm text-focal-foreground transition-colors hover:bg-focal-elevated'
    : 'flex items-start justify-between gap-3 rounded-lg border border-border bg-background/50 px-3 py-2 text-sm transition-colors hover:border-primary/40';

  const titleClass = isFocal
    ? 'truncate font-medium text-focal-foreground'
    : 'truncate font-medium text-foreground';

  const metaClass = isFocal
    ? 'text-xs text-focal-muted'
    : 'text-xs text-muted';

  const dateClass = isFocal
    ? 'shrink-0 text-[11px] text-focal-muted'
    : 'shrink-0 text-[11px] text-muted';

  return (
    <ul className="space-y-2">
      {items.map((item) => {
        const inner = (
          <span className="flex min-w-0 flex-1 flex-col gap-0.5">
            <span className="flex items-center gap-2">
              <span className={titleClass}>{item.title}</span>
              {item.freshnessLabel ? (
                <span className="shrink-0 rounded bg-primary/10 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-primary">
                  {item.freshnessLabel === 'Updated recently' ? 'Recent' : item.freshnessLabel}
                </span>
              ) : null}
            </span>
            {showReason && item.reason ? (
              <span className={metaClass}>{item.reason}</span>
            ) : null}
          </span>
        );

        return (
          <li key={`${item.entityType}-${item.entityId}`}>
            {item.href ? (
              <Link to={item.href} className={itemClass}>
                {inner}
                <span className={dateClass}>
                  {new Intl.DateTimeFormat(undefined, { dateStyle: 'short' }).format(
                    new Date(item.updatedAt),
                  )}
                </span>
              </Link>
            ) : (
              <div className={itemClass}>
                {inner}
                <span className={metaClass}>
                  {new Intl.DateTimeFormat(undefined, { dateStyle: 'short' }).format(
                    new Date(item.updatedAt),
                  )}
                </span>
              </div>
            )}
          </li>
        );
      })}
    </ul>
  );
}
