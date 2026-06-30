import { META_SECTION_LABEL_CLASS } from '@/lib/surfaceLayout';
import { Link } from 'react-router-dom';
import { CalendarClock } from 'lucide-react';
import type { HubContinueCandidate } from '@/types/hub';
import { formatRelativeUpdated } from '@/utils/formatDate';

interface HubUpcomingSessionsProps {
  sessions: Array<{
    campaignName: string;
    campaignHandle: string;
    title: string;
    plannedStartAt: string;
    href: string;
  }>;
}

function formatSessionWhen(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return 'Soon';
  const diffDays = Math.ceil((date.getTime() - Date.now()) / 86_400_000);
  if (diffDays <= 0) return 'Today';
  if (diffDays === 1) return 'Tomorrow';
  if (diffDays < 7) {
    return date.toLocaleDateString(undefined, { weekday: 'short', hour: 'numeric', minute: '2-digit' });
  }
  return formatRelativeUpdated(iso);
}

export function HubUpcomingSessions({ sessions }: HubUpcomingSessionsProps) {
  if (sessions.length === 0) return null;

  return (
    <section className="space-y-3">
      <h2 className="flex items-center gap-2 text-lg font-semibold text-foreground">
        <CalendarClock className="size-5 text-primary" strokeWidth={1.5} />
        Upcoming Sessions
      </h2>
      <div className="flex gap-3 overflow-x-auto pb-1 snap-x snap-mandatory lg:grid lg:grid-cols-3 lg:gap-4 lg:overflow-visible lg:snap-none xl:grid-cols-4">
        {sessions.map((session) => (
          <Link
            key={`${session.campaignHandle}-${session.plannedStartAt}`}
            to={session.href}
            className="min-w-[220px] snap-start rounded-xl border border-border bg-surface/80 px-4 py-3 transition-colors hover:border-primary/40 hover:bg-elevated lg:min-w-0"
          >
            <p className={META_SECTION_LABEL_CLASS}>
              {session.campaignName}
            </p>
            <p className="mt-1 text-sm font-medium text-foreground">{session.title}</p>
            <p className="mt-1 text-xs text-primary">{formatSessionWhen(session.plannedStartAt)}</p>
          </Link>
        ))}
      </div>
    </section>
  );
}

export function extractUpcomingSessionsFromContinue(
  items: HubContinueCandidate[],
): HubUpcomingSessionsProps['sessions'] {
  return items
    .map((item) => {
      const next = item.campaign.hubSignals?.nextSession;
      if (!next?.plannedStartAt) return null;
      const start = new Date(next.plannedStartAt);
      const days = (start.getTime() - Date.now()) / 86_400_000;
      if (days < 0 || days > 7) return null;
      return {
        campaignName: item.campaign.name,
        campaignHandle: item.campaign.handle,
        title: next.title,
        plannedStartAt: next.plannedStartAt,
        href: item.ctaHref,
      };
    })
    .filter((row): row is NonNullable<typeof row> => row != null)
    .sort(
      (a, b) =>
        new Date(a.plannedStartAt).getTime() - new Date(b.plannedStartAt).getTime(),
    );
}
