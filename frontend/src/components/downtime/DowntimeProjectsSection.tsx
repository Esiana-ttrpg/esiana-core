import type { DowntimeProjectOperationCard } from '@shared/downtimeHub';
import { DowntimeOperationCard } from '@/components/downtime/DowntimeOperationCard';

interface DowntimeProjectsSectionProps {
  cards: DowntimeProjectOperationCard[];
}

type SectionGroup = {
  id: string;
  title: string;
  description: string;
  cards: DowntimeProjectOperationCard[];
};

function groupCards(cards: DowntimeProjectOperationCard[]): SectionGroup[] {
  const active: DowntimeProjectOperationCard[] = [];
  const planned: DowntimeProjectOperationCard[] = [];
  const paused: DowntimeProjectOperationCard[] = [];
  const finished: DowntimeProjectOperationCard[] = [];

  for (const card of cards) {
    if (card.status === 'PLANNED') {
      planned.push(card);
    } else if (
      card.status === 'PAUSED' ||
      card.status === 'SUSPENDED' ||
      card.clockState === 'waiting'
    ) {
      paused.push(card);
    } else if (
      card.status === 'COMPLETED' ||
      card.status === 'FAILED' ||
      card.status === 'ABANDONED'
    ) {
      finished.push(card);
    } else {
      active.push(card);
    }
  }

  const groups: SectionGroup[] = [];
  if (active.length > 0) {
    groups.push({
      id: 'active',
      title: 'Active operations',
      description: 'Campaign clocks still ticking — time and prerequisites drive progress.',
      cards: active,
    });
  }
  if (planned.length > 0) {
    groups.push({
      id: 'planned',
      title: 'Planned',
      description: 'Authored operations not yet underway.',
      cards: planned,
    });
  }
  if (paused.length > 0) {
    groups.push({
      id: 'waiting',
      title: 'Paused & suspended',
      description: 'Operations held by blockers, missing resources, or party choice.',
      cards: paused,
    });
  }
  if (finished.length > 0) {
    groups.push({
      id: 'finished',
      title: 'Recently resolved',
      description: 'Completed, failed, or abandoned operations retained as world history.',
      cards: finished.slice(0, 8),
    });
  }
  return groups;
}

export function DowntimeProjectsSection({ cards }: DowntimeProjectsSectionProps) {
  if (cards.length === 0) {
    return (
      <div className="flex flex-col items-center gap-4 rounded-lg border border-dashed border-border/80 px-6 py-12 text-center">
        <p className="text-sm font-medium text-foreground">No operations yet.</p>
        <p className="max-w-md text-sm text-muted-foreground">
          Declare an undertaking — construction, research, recovery, or faction initiative —
          and release it into campaign time. Use{' '}
          <span className="font-medium text-foreground">New operation</span> in the header.
        </p>
      </div>
    );
  }

  const groups = groupCards(cards);

  return (
    <div className="flex flex-col gap-8">
      {groups.map((group) => (
        <section key={group.id}>
          <h3 className="text-sm font-medium text-foreground">{group.title}</h3>
          <p className="mt-1 text-sm text-muted-foreground">{group.description}</p>
          <div className="mt-4 flex flex-col gap-3">
            {group.cards.map((card) => (
              <DowntimeOperationCard key={card.id} card={card} />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
