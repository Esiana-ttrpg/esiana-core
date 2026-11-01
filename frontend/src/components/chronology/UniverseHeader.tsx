import { Link, useSearchParams } from 'react-router-dom';
import { Plus, Settings } from 'lucide-react';
import { campaignChronologyPath } from '@/lib/campaignPaths';
import { chronologyViewParams } from '@/lib/chronologyNavigation';
import type { TimelineOccurrenceRecord } from '@/lib/chronologyApi';

export type ChronologyView = 'calendar' | 'timeline' | 'eras' | 'events' | 'feed';

export interface UniverseClockPill {
  id: string;
  label: string;
}

interface UniverseHeaderProps {
  campaignHandle: string;
  activeView: ChronologyView;
  clockPills: UniverseClockPill[];
  activeCalendarId?: string;
  contextLabel?: string;
  occurrence?: TimelineOccurrenceRecord | null;
  canCreateEvent?: boolean;
  onCreateEvent: () => void;
  settingsHref: string;
}

const VIEW_TABS: Array<{ id: ChronologyView; label: string }> = [
  { id: 'calendar', label: 'Calendar' },
  { id: 'timeline', label: 'Timeline' },
  { id: 'eras', label: 'Eras' },
  { id: 'events', label: 'Events' },
  { id: 'feed', label: 'Campaign feed' },
];

function buildViewHref(
  campaignHandle: string,
  view: ChronologyView,
  searchParams: URLSearchParams,
): string {
  const next = chronologyViewParams(searchParams, view);
  const query = next.toString();
  const base = campaignChronologyPath(campaignHandle);
  return query ? `${base}?${query}` : base;
}

export function UniverseHeader({
  campaignHandle,
  activeView,
  clockPills,
  activeCalendarId,
  contextLabel,
  occurrence,
  canCreateEvent = true,
  onCreateEvent,
  settingsHref,
}: UniverseHeaderProps) {
  const [searchParams] = useSearchParams();

  return (
    <header className="flex shrink-0 flex-wrap items-center justify-between gap-2 border-b border-border/40 pb-2">
      <div className="flex min-w-0 flex-wrap items-center gap-3">
        <h1 className="text-base font-semibold text-foreground">Chronology</h1>
        <nav aria-label="Chronology views" className="inline-flex flex-wrap rounded-md border border-border/40 bg-background/80 p-0.5 text-xs">
          {VIEW_TABS.map((tab) => (
            <Link
              key={tab.id}
              aria-current={activeView === tab.id ? 'page' : undefined}
              to={occurrence && tab.id !== 'eras' && tab.id !== activeView
                ? `${campaignChronologyPath(campaignHandle)}?${chronologyViewParams(searchParams, tab.id, { calendarId: occurrence.calendarId, occurrence })}`
                : buildViewHref(campaignHandle, tab.id, searchParams)}
              className={`inline-flex min-h-11 items-center rounded px-2.5 py-1 ${
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
            <span className="rounded-full border border-border/40 bg-background px-2 py-0.5 text-xs text-muted">
              No active calendars
            </span>
          ) : (
            (clockPills.filter(pill => pill.id === activeCalendarId).length ? clockPills.filter(pill => pill.id === activeCalendarId) : clockPills.slice(0, 1)).map((pill) => (
              <span
                key={pill.id}
                className="rounded-full border border-border bg-background px-2 py-1 text-[11px] text-muted whitespace-nowrap"
              >
                Campaign Today · {pill.label}
              </span>
            ))
          )}
        </div>
      </div>
      {contextLabel && <p className="text-xs text-muted">{contextLabel}</p>}

      <div className="flex items-center gap-2">
        {canCreateEvent && (
          <button
            type="button"
            onClick={onCreateEvent}
            title="Create Event"
            className="inline-flex items-center justify-center rounded-lg bg-primary p-2 text-background hover:bg-primary-hover"
          >
            <Plus className="size-4" />
            <span className="ml-1 text-xs">Create Event</span>
          </button>
        )}
        <Link
          to={settingsHref}
          title="Chronology Engine Settings"
          aria-label="Chronology Engine Settings"
          className="inline-flex items-center justify-center rounded-lg border border-border bg-background p-2 text-muted hover:text-foreground"
        >
          <Settings className="size-4" />
        </Link>
      </div>
    </header>
  );
}
