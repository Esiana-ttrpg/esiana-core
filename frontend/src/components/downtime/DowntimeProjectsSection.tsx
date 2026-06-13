import { Plus } from 'lucide-react';
import type { DowntimeProjectOperationCard } from '@shared/downtimeHub';
import { DowntimeOperationCard } from '@/components/downtime/DowntimeOperationCard';

interface DowntimeProjectsSectionProps {
  cards: DowntimeProjectOperationCard[];
  canManage?: boolean;
  onCreateClick?: () => void;
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

function OperationsHeader({
  canManage,
  onCreateClick,
}: {
  canManage?: boolean;
  onCreateClick?: () => void;
}) {
  return (
    <header className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
      <div>
        <h2 className="text-base font-semibold text-foreground">Operations</h2>
        <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
          Long-term works that shape havens, factions, and lands — they advance when campaign
          time passes, not when you check a task board.
        </p>
      </div>
      {canManage && onCreateClick ? (
        <button
          type="button"
          onClick={onCreateClick}
          className="inline-flex shrink-0 items-center justify-center gap-1.5 rounded bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
        >
          <Plus className="h-4 w-4" />
          New operation
        </button>
      ) : null}
    </header>
  );
}

export function DowntimeProjectsSection({
  cards,
  canManage = false,
  onCreateClick,
}: DowntimeProjectsSectionProps) {
  if (cards.length === 0) {
    return (
      <div className="flex flex-col gap-6">
        <OperationsHeader canManage={canManage} onCreateClick={onCreateClick} />
        <div className="flex flex-col items-center gap-4 rounded-lg border border-dashed border-border/80 px-6 py-12 text-center">
          <p className="text-sm font-medium text-foreground">No operations yet.</p>
          <p className="max-w-md text-sm text-muted-foreground">
            Declare an undertaking — construction, research, recovery, or faction initiative —
            and release it into campaign time.
          </p>
          {canManage && onCreateClick ? (
            <button
              type="button"
              onClick={onCreateClick}
              className="inline-flex items-center justify-center gap-1.5 rounded bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
            >
              <Plus className="h-4 w-4" />
              New operation
            </button>
          ) : null}
        </div>
      </div>
    );
  }

  const groups = groupCards(cards);

  return (
    <div className="flex flex-col gap-8">
      <OperationsHeader canManage={canManage} onCreateClick={onCreateClick} />

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
