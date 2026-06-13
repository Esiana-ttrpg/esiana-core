import { Link, useSearchParams } from 'react-router-dom';
import { Plus, Settings } from 'lucide-react';
import { campaignChronologyPath } from '@/lib/campaignPaths';

export type ChronologyView = 'calendar' | 'timeline' | 'events' | 'feed';

export interface UniverseClockPill {
  id: string;
  label: string;
}

interface UniverseHeaderProps {
  campaignHandle: string;
  activeView: ChronologyView;
  clockPills: UniverseClockPill[];
  canCreateEvent?: boolean;
  onCreateEvent: () => void;
  settingsHref: string;
}

const VIEW_TABS: Array<{ id: ChronologyView; label: string }> = [
  { id: 'calendar', label: 'Calendar' },
  { id: 'timeline', label: 'Timeline' },
  { id: 'events', label: 'Events' },
  { id: 'feed', label: 'Campaign feed' },
];

function buildViewHref(
  campaignHandle: string,
  view: ChronologyView,
  searchParams: URLSearchParams,
): string {
  const next = new URLSearchParams(searchParams);
  next.set('view', view);
  const query = next.toString();
  const base = campaignChronologyPath(campaignHandle);
  return query ? `${base}?${query}` : base;
}

export function UniverseHeader({
  campaignHandle,
  activeView,
  clockPills,
  canCreateEvent = true,
  onCreateEvent,
  settingsHref,
}: UniverseHeaderProps) {
  const [searchParams] = useSearchParams();

  return (
    <header className="grid shrink-0 grid-cols-[auto_1fr_auto] items-center gap-3 rounded-xl border border-border bg-surface/40 px-3 py-2">
      <div className="flex items-center gap-3">
        <h1 className="text-base font-semibold text-foreground">Chronology Hub</h1>
        <nav className="inline-flex rounded-lg border border-border bg-background p-0.5 text-xs">
          {VIEW_TABS.map((tab) => (
            <Link
              key={tab.id}
              to={buildViewHref(campaignHandle, tab.id, searchParams)}
              className={`inline-flex items-center rounded px-2.5 py-1 ${
                activeView === tab.id
                  ? 'bg-primary text-background'
                  : 'text-foreground hover:bg-elevated'
              }`}
            >
              {tab.label}
            </Link>
          ))}
        </nav>
      </div>

      <div className="min-w-0 overflow-x-auto">
        <div className="flex w-max items-center gap-2">
          {clockPills.length === 0 ? (
            <span className="rounded-full border border-border bg-background px-2 py-1 text-[11px] text-muted">
              No active calendars
            </span>
          ) : (
            clockPills.map((pill) => (
              <span
                key={pill.id}
                className="rounded-full border border-border bg-background px-2 py-1 text-[11px] text-muted whitespace-nowrap"
              >
                {pill.label}
              </span>
            ))
          )}
        </div>
      </div>

      <div className="flex items-center gap-2">
        {canCreateEvent && (
          <button
            type="button"
            onClick={onCreateEvent}
            title="Create Event"
            className="inline-flex items-center justify-center rounded-lg bg-primary p-2 text-background hover:bg-primary-hover"
          >
            <Plus className="size-4" />
          </button>
        )}
        <Link
          to={settingsHref}
          title="Chronology Engine Settings"
          className="inline-flex items-center justify-center rounded-lg border border-border bg-background p-2 text-muted hover:text-foreground"
        >
          <Settings className="size-4" />
        </Link>
      </div>
    </header>
  );
}
