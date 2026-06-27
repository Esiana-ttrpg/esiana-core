import { META_SECTION_LABEL_CLASS } from '@/lib/surfaceLayout';
import { Link } from 'react-router-dom';
import type { DowntimeHavenSituationCard } from '@shared/downtimeHub';

interface DowntimeHavenCardProps {
  card: DowntimeHavenSituationCard;
}

export function DowntimeHavenCard({ card }: DowntimeHavenCardProps) {
  return (
    <Link
      to={card.href}
      className="block rounded-lg border border-border bg-elevated/20 p-4 transition-colors hover:border-primary/30 hover:bg-primary/5"
    >
      <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h3 className="font-semibold text-foreground">{card.title}</h3>
          <p className="text-sm text-muted-foreground">{card.subtitle}</p>
        </div>
        {card.lastActiveLabel ? (
          <p className="shrink-0 text-xs text-muted-foreground">
            Last active: {card.lastActiveLabel}
          </p>
        ) : null}
      </div>

      {card.pressureHeadline ? (
        <p className="mt-3 text-sm font-medium text-foreground/90">{card.pressureHeadline}</p>
      ) : null}

      {card.recentActivity.length > 0 ? (
        <div className="mt-4">
          <p className="META_SECTION_LABEL_CLASS-foreground">
            Recently
          </p>
          <ul className="mt-2 space-y-1 text-sm text-foreground/90">
            {card.recentActivity.map((line) => (
              <li key={line} className="flex gap-2">
                <span className="text-muted-foreground">•</span>
                <span>{line}</span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {card.escalatingThreats.length > 0 ? (
        <div className="mt-4">
          <p className="text-xs font-medium uppercase tracking-wide text-amber-400/90">
            Threats escalating
          </p>
          <ul className="mt-2 space-y-1 text-sm text-amber-100/90">
            {card.escalatingThreats.map((line) => (
              <li key={line} className="flex gap-2">
                <span>•</span>
                <span>{line}</span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <div className="mt-4 flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
        <span>
          Active operations:{' '}
          <span className="text-foreground">{card.activeProjectCount}</span>
        </span>
        {card.presentLabels.length > 0 ? (
          <span>
            Present:{' '}
            <span className="text-foreground">{card.presentLabels.join(', ')}</span>
          </span>
        ) : null}
      </div>
    </Link>
  );
}
