import { Link } from 'react-router-dom';
import type { DowntimeHubReputationPayload } from '@shared/downtimeHub';
import { PendingReputationSuggestionsPanel } from '@/components/downtime/PendingReputationSuggestionsPanel';
import {
  acceptReputationSuggestion,
  dismissReputationSuggestion,
} from '@/lib/downtimeReputation';

interface DowntimeReputationSectionProps {
  data: DowntimeHubReputationPayload;
  campaignHandle: string;
  canManage: boolean;
  onChanged: () => void | Promise<void>;
}

function toneClass(tone: string | undefined): string {
  if (tone === 'escalation') return 'text-red-400';
  if (tone === 'warning') return 'text-amber-400';
  return 'text-foreground';
}

export function DowntimeReputationSection({
  data,
  campaignHandle,
  canManage,
  onChanged,
}: DowntimeReputationSectionProps) {
  const emptyMessage =
    data.feed.length === 0 && data.standings.length === 0
      ? `${data.framing.headline} ${data.framing.body[0] ?? ''}`
      : undefined;

  async function handleAccept(
    suggestion: (typeof data.pendingSuggestions)[number],
    narrative?: string | null,
  ) {
    await acceptReputationSuggestion(campaignHandle, suggestion.id, narrative);
    await onChanged();
  }

  async function handleDismiss(suggestion: (typeof data.pendingSuggestions)[number]) {
    await dismissReputationSuggestion(campaignHandle, suggestion.id);
    await onChanged();
  }

  return (
    <div className="flex min-h-[480px] w-full flex-col gap-4">
      <div>
        <h2 className="text-lg font-semibold">Reputation</h2>
        <p className="text-sm text-muted-foreground">
          Faction trust, notoriety, and rumor — narrative shifts with reasons, not scores.
        </p>
      </div>

      {canManage && data.pendingSuggestions.length > 0 ? (
        <PendingReputationSuggestionsPanel
          suggestions={data.pendingSuggestions}
          onAccept={(suggestion, narrative) => void handleAccept(suggestion, narrative)}
          onDismiss={(suggestion) => void handleDismiss(suggestion)}
        />
      ) : null}

      {data.standings.length > 0 ? (
        <div className="grid gap-2 sm:grid-cols-2">
          {data.standings.map((standing) => (
            <Link
              key={standing.factionPageId}
              to={standing.factionHref}
              className="rounded-lg border border-border bg-background/60 px-3 py-2 transition-colors hover:border-primary/40"
            >
              <p className="text-sm font-medium text-foreground">{standing.factionTitle}</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Trust:{' '}
                <span className={toneClass(standing.trustTone)}>{standing.trustBand}</span>
                {' · '}
                Notoriety:{' '}
                <span className={toneClass(standing.notorietyTone)}>
                  {standing.notorietyBand}
                </span>
              </p>
            </Link>
          ))}
        </div>
      ) : null}

      <div className="min-w-0 flex-1 rounded-lg border border-border bg-background p-4">
        {emptyMessage ? (
          <p className="text-sm text-muted-foreground">{emptyMessage}</p>
        ) : (
          <ul className="space-y-4">
            {data.feed.map((line) => (
              <li key={line.id} className="border-b border-border/60 pb-4 last:border-0 last:pb-0">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <p className="text-sm font-medium text-foreground">
                    <Link to={line.factionHref} className="hover:text-primary">
                      {line.factionTitle}
                    </Link>{' '}
                    <span className={toneClass(line.tone)}>
                      {line.directionArrow} {line.bandLabel}
                    </span>
                  </p>
                  <span className="text-xs text-muted-foreground">{line.dateLabel}</span>
                </div>
                {line.narrative ? (
                  <p className="mt-1 pl-3 text-sm text-muted-foreground">{line.narrative}</p>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
