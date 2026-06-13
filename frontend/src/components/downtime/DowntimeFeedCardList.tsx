import { Link } from 'react-router-dom';
import type { DowntimeFeedCard } from '@/lib/downtime';

function toneClass(tone: DowntimeFeedCard['tone']): string {
  switch (tone) {
    case 'escalation':
      return 'border-amber-500/30 bg-amber-950/20';
    case 'warning':
      return 'border-orange-500/20 bg-orange-950/10';
    default:
      return 'border-border bg-elevated/30';
  }
}

interface DowntimeFeedCardListProps {
  cards: DowntimeFeedCard[];
  emptyMessage?: string;
}

export function DowntimeFeedCardList({ cards, emptyMessage }: DowntimeFeedCardListProps) {
  if (cards.length === 0) {
    return emptyMessage ? (
      <p className="text-sm leading-relaxed text-muted-foreground">{emptyMessage}</p>
    ) : null;
  }

  return (
    <ul className="space-y-3">
      {cards.map((card) => (
        <li
          key={card.id}
          className={`rounded-lg border p-4 ${toneClass(card.tone)}`}
        >
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div className="min-w-0 flex-1">
              {card.href ? (
                <Link
                  to={card.href}
                  className="font-medium text-foreground hover:text-primary hover:underline"
                >
                  {card.title}
                </Link>
              ) : (
                <p className="font-medium text-foreground">{card.title}</p>
              )}
              <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{card.summary}</p>
            </div>
            <span className="shrink-0 text-xs text-muted-foreground">{card.dateLabel}</span>
          </div>
        </li>
      ))}
    </ul>
  );
}
