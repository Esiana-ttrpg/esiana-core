import { useMemo } from 'react';
import { SURFACE_SILENT_CLASS, narrativeFocalClass } from '@/lib/surfaceLayout';
import { formatOccurrenceDateLabel } from '@/lib/chronologyDates';
import type {
  TimelineCalendarRecord,
  TimelineCategoryRecord,
  TimelineEventRecord,
} from '@/lib/chronologyApi';
import { ElevatedBrowseVisibilityChip } from '@/components/narrative/VisibilityTierChip';

interface TechTreeTimelineProps {
  categories: TimelineCategoryRecord[];
  calendars: TimelineCalendarRecord[];
  events: TimelineEventRecord[];
  selectedBaseEventId: string | null;
  onSelectEvent: (event: TimelineEventRecord) => void;
  showElevatedVisibility?: boolean;
}

function cellKey(categoryId: string, calendarId: string): string {
  return `${categoryId}::${calendarId}`;
}

export function TechTreeTimeline({
  categories,
  calendars,
  events,
  selectedBaseEventId,
  onSelectEvent,
  showElevatedVisibility = false,
}: TechTreeTimelineProps) {
  const columns = useMemo(
    () => [{ id: 'uncategorized', name: 'Uncategorized' }, ...categories.map((c) => ({ id: c.id, name: c.name }))],
    [categories],
  );
  const eventsByCell = useMemo(() => {
    const map = new Map<string, TimelineEventRecord[]>();
    for (const event of events) {
      const categoryKey = event.categoryId ?? 'uncategorized';
      const key = cellKey(categoryKey, event.calendarId);
      const rows = map.get(key) ?? [];
      rows.push(event);
      map.set(key, rows);
    }
    for (const rows of map.values()) {
      rows.sort((a, b) => {
        if (a.start.epochMinute && b.start.epochMinute) {
          const aEpoch = BigInt(a.start.epochMinute);
          const bEpoch = BigInt(b.start.epochMinute);
          if (aEpoch !== bEpoch) return aEpoch < bEpoch ? -1 : 1;
        }
        const aSort = `${a.start.year ?? 0}-${a.start.month ?? 0}-${a.start.day ?? 0}`;
        const bSort = `${b.start.year ?? 0}-${b.start.month ?? 0}-${b.start.day ?? 0}`;
        return aSort.localeCompare(bSort);
      });
    }
    return map;
  }, [events]);

  return (
    <div className={`${SURFACE_SILENT_CLASS} h-full overflow-auto`}>
      <div
        className="grid min-w-max"
        style={{ gridTemplateColumns: `220px repeat(${Math.max(columns.length, 1)}, minmax(300px, 1fr))` }}
      >
        <div className="sticky left-0 top-0 z-30 border-b border-r border-border bg-surface px-4 py-3 text-xs font-semibold uppercase tracking-wide text-muted">
          Calendar Track
        </div>
        {columns.map((category) => (
          <div
            key={category.id}
            className="sticky top-0 z-20 border-b border-r border-border bg-surface px-4 py-3"
          >
            <p className="text-sm font-semibold text-foreground">{category.name}</p>
          </div>
        ))}

        {calendars.map((calendar) => (
          <FragmentRow
            key={calendar.id}
            calendar={calendar}
            categories={columns}
            eventsByCell={eventsByCell}
            selectedBaseEventId={selectedBaseEventId}
            onSelectEvent={onSelectEvent}
            showElevatedVisibility={showElevatedVisibility}
          />
        ))}
      </div>
    </div>
  );
}

function FragmentRow({
  calendar,
  categories,
  eventsByCell,
  selectedBaseEventId,
  onSelectEvent,
  showElevatedVisibility,
}: {
  calendar: TimelineCalendarRecord;
  categories: Array<{ id: string; name: string }>;
  eventsByCell: Map<string, TimelineEventRecord[]>;
  selectedBaseEventId: string | null;
  onSelectEvent: (event: TimelineEventRecord) => void;
  showElevatedVisibility: boolean;
}) {
  return (
    <>
      <div className="sticky left-0 z-10 border-b border-r border-border bg-background/95 px-4 py-3">
        <p className="text-sm font-medium text-foreground">{calendar.name}</p>
        {calendar.isMasterTime && (
          <p className="text-[10px] uppercase tracking-wide text-primary">Master Clock</p>
        )}
      </div>
      {categories.map((category) => {
        const rows = eventsByCell.get(cellKey(category.id, calendar.id)) ?? [];
        return (
          <div key={`${calendar.id}-${category.id}`} className="border-b border-r border-border p-3">
            <div className="min-h-24 space-y-2">
              {rows.length === 0 ? (
                <div className="rounded border border-dashed border-border px-2 py-1 text-[11px] text-muted">
                  No nodes
                </div>
              ) : (
                rows.map((event) => {
                  const selected = selectedBaseEventId === event.baseEventId;
                  return (
                    <button
                      key={event.occurrenceId}
                      type="button"
                      onClick={() => onSelectEvent(event)}
                      className={`w-full rounded-md border px-2 py-2 text-left transition ${
                        selected
                          ? `border-primary bg-primary/10 ${narrativeFocalClass(true)}`
                          : 'border-border bg-surface/70 hover:border-primary/40'
                      }`}
                    >
                      <span className="text-[11px] font-medium tracking-wide text-sky-400/80">
                        📅 {formatOccurrenceDateLabel(event.start, event.start.monthName)}
                      </span>
                      <div className="mt-1 flex flex-wrap items-center gap-1.5">
                        <p className="text-sm font-medium text-foreground">{event.title}</p>
                        <ElevatedBrowseVisibilityChip
                          pageVisibility={event.visibility}
                          showWhenElevated={showElevatedVisibility}
                          compact
                        />
                      </div>
                      <div className="mt-1 flex flex-wrap gap-2 text-[11px] text-muted">
                        {event.prerequisiteBaseEventId && <span>Prereq link</span>}
                        {event.duration > 1 && <span>Day {event.dayOffset + 1} of {event.duration}</span>}
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </div>
        );
      })}
    </>
  );
}
