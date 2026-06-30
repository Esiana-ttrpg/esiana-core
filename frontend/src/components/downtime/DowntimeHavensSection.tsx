import type { DowntimeHavenSituationCard } from '@shared/downtimeHub';
import type { DowntimePlaceholderFraming } from '@shared/downtimeHub';
import { DowntimeHavenCard } from '@/components/downtime/DowntimeHavenCard';

interface DowntimeHavensSectionProps {
  cards: DowntimeHavenSituationCard[];
  framing: DowntimePlaceholderFraming;
}

export function DowntimeHavensSection({
  cards,
  framing,
}: DowntimeHavensSectionProps) {
  if (cards.length === 0) {
    return (
      <div className="flex flex-col items-center gap-4 rounded-lg border border-dashed border-border/80 px-6 py-12 text-center">
        <p className="text-sm font-medium text-foreground">{framing.headline}</p>
        <p className="max-w-md text-sm text-muted-foreground">
          {framing.body[0]}{' '}
          Use <span className="font-medium text-foreground">New haven</span> in the header.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {cards.map((card) => (
        <DowntimeHavenCard key={card.id} card={card} />
      ))}
    </div>
  );
}
