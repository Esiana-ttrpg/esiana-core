import { Plus } from 'lucide-react';
import type { DowntimeHavenSituationCard } from '@shared/downtimeHub';
import type { DowntimePlaceholderFraming } from '@shared/downtimeHub';
import { DowntimeHavenCard } from '@/components/downtime/DowntimeHavenCard';

interface DowntimeHavensSectionProps {
  cards: DowntimeHavenSituationCard[];
  framing: DowntimePlaceholderFraming;
  canManage?: boolean;
  onCreateClick?: () => void;
}

function HavensHeader({
  canManage,
  onCreateClick,
}: {
  canManage?: boolean;
  onCreateClick?: () => void;
}) {
  return (
    <header className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
      <div>
        <h2 className="text-base font-semibold text-foreground">Havens</h2>
        <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
          Persistent operational anchors — ships, sanctuaries, strongholds, and crew quarters
          that accumulate history between sessions.
        </p>
      </div>
      {canManage && onCreateClick ? (
        <button
          type="button"
          onClick={onCreateClick}
          className="inline-flex shrink-0 items-center justify-center gap-1.5 rounded bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
        >
          <Plus className="h-4 w-4" />
          New haven
        </button>
      ) : null}
    </header>
  );
}

export function DowntimeHavensSection({
  cards,
  framing,
  canManage = false,
  onCreateClick,
}: DowntimeHavensSectionProps) {
  if (cards.length === 0) {
    return (
      <div className="flex flex-col gap-6">
        <HavensHeader canManage={canManage} onCreateClick={onCreateClick} />
        <div className="flex flex-col items-center gap-4 rounded-lg border border-dashed border-border/80 px-6 py-12 text-center">
          <p className="text-sm font-medium text-foreground">{framing.headline}</p>
          {framing.body.map((line) => (
            <p key={line} className="max-w-md text-sm text-muted-foreground">
              {line}
            </p>
          ))}
          {canManage && onCreateClick ? (
            <button
              type="button"
              onClick={onCreateClick}
              className="inline-flex items-center justify-center gap-1.5 rounded bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
            >
              <Plus className="h-4 w-4" />
              New haven
            </button>
          ) : null}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <HavensHeader canManage={canManage} onCreateClick={onCreateClick} />
      <div className="flex flex-col gap-4">
        {cards.map((card) => (
          <DowntimeHavenCard key={card.id} card={card} />
        ))}
      </div>
    </div>
  );
}
