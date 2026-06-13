import { Link } from 'react-router-dom';
import { AlertTriangle } from 'lucide-react';
import type { DowntimeFeedCard } from '@/lib/downtime';

function toneIconClass(tone: DowntimeFeedCard['tone']): string {
  switch (tone) {
    case 'escalation':
      return 'text-amber-600/70 dark:text-amber-500/70';
    case 'warning':
      return 'text-muted-foreground/80';
    default:
      return '';
  }
}

function displayTimestamp(item: DowntimeFeedCard): string {
  return item.relativeDateLabel ?? item.calendarDateLabel ?? item.dateLabel;
}

function displayNarrative(item: DowntimeFeedCard): string {
  return item.narrative ?? item.summary;
}

interface WorldEventNarrativeFeedProps {
  items: DowntimeFeedCard[];
  emptyMessage?: string;
  variant?: 'full' | 'compact';
}

export function WorldEventNarrativeFeed({
  items,
  emptyMessage,
  variant = 'full',
}: WorldEventNarrativeFeedProps) {
  if (items.length === 0) {
    return emptyMessage ? (
      <p className="text-sm leading-relaxed text-muted-foreground">{emptyMessage}</p>
    ) : null;
  }

  const itemPadding = variant === 'compact' ? 'py-3' : 'py-4';
  const narrativeClamp = variant === 'compact' ? 'line-clamp-2' : '';

  return (
    <ul>
      {items.map((item, index) => {
        const narrative = displayNarrative(item);
        const showToneIcon = item.tone === 'escalation' || item.tone === 'warning';

        return (
          <li
            key={item.id}
            className={`${itemPadding} ${
              index < items.length - 1 ? 'border-b border-border/60' : ''
            }`}
          >
            <p
              className="text-xs text-muted-foreground"
              title={item.calendarDateLabel ?? undefined}
            >
              {displayTimestamp(item)}
            </p>
            <div className="mt-1 flex items-start gap-1.5">
              {showToneIcon ? (
                <AlertTriangle
                  className={`mt-0.5 size-3 shrink-0 ${toneIconClass(item.tone)}`}
                  aria-hidden
                />
              ) : null}
              <p className={`min-w-0 flex-1 text-sm leading-relaxed text-foreground ${narrativeClamp}`}>
                {item.href ? (
                  <Link to={item.href} className="hover:text-primary hover:underline">
                    {narrative}
                  </Link>
                ) : (
                  narrative
                )}
              </p>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
