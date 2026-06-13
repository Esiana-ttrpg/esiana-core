import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ChevronDown, ChevronLeft, ChevronRight, X } from 'lucide-react';
import {
  CalendarMonthGrid,
  type DayCellOverlay,
} from '@/components/chronology/CalendarMonthGrid';
import { ChronologyEventInlineDetail } from '@/components/chronology/ChronologyEventInlineDetail';
import type {
  ChronologyTimelineBundle,
  TimelineBaseEventRecord,
  TimelineCategoryRecord,
  TimelineOccurrenceRecord,
} from '@/lib/chronologyApi';
import type { ChronologyDateParts } from '@/lib/chronologyDates';
import type { TimeTrackingBundle } from '@/lib/timeTrackingApi';
import {
  buildCalendarMonthViewport,
  calendarEpochMinuteForDate,
  getYearMonthCount,
  resolveMonthName,
  type FantasyCalendarLike,
} from '@/lib/timeEngine';
import type { FantasyCalendarApiRow } from '@/lib/timeTrackingApi';

interface WidescreenCalendarViewProps {
  campaignHandle: string;
  timeBundle: TimeTrackingBundle;
  chronologyBundle: ChronologyTimelineBundle;
  baseEvents: TimelineBaseEventRecord[];
  categories: TimelineCategoryRecord[];
  canManage: boolean;
  onBrowseAnchorChange?: (anchor: ChronologyDateParts) => void;
  onEventMutated?: () => void | Promise<void>;
}

function calendarRowToLike(row: FantasyCalendarApiRow): FantasyCalendarLike {
  return {
    epochOffset: BigInt(row.epochOffset),
    weekdays: row.weekdays,
    months: row.months,
    seasons: row.seasons,
    moons: row.moons,
    leapDays: row.leapDays,
  };
}

export function WidescreenCalendarView({
  campaignHandle,
  timeBundle,
  chronologyBundle,
  baseEvents,
  categories,
  canManage,
  onBrowseAnchorChange,
  onEventMutated,
}: WidescreenCalendarViewProps) {
  const [selectedCalendarId, setSelectedCalendarId] = useState<string | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [selectedDay, setSelectedDay] = useState<number | null>(null);
  const [expandedOccurrenceId, setExpandedOccurrenceId] = useState<string | null>(null);
  const [viewYear, setViewYear] = useState(1);
  const [viewMonthIndex, setViewMonthIndex] = useState(0);
  const viewCalendarIdRef = useRef<string | null>(null);

  const calendars = timeBundle.calendars;

  useEffect(() => {
    setSelectedCalendarId((previous) => {
      if (previous && calendars.some((calendar) => calendar.id === previous)) {
        return previous;
      }
      return calendars[0]?.id ?? null;
    });
  }, [calendars]);

  const selectedCalendar = useMemo(
    () => calendars.find((calendar) => calendar.id === selectedCalendarId) ?? calendars[0] ?? null,
    [calendars, selectedCalendarId],
  );

  const calendarLike = useMemo(
    () => (selectedCalendar ? calendarRowToLike(selectedCalendar) : null),
    [selectedCalendar],
  );

  useEffect(() => {
    if (!selectedCalendar) return;
    if (viewCalendarIdRef.current === selectedCalendar.id) return;
    viewCalendarIdRef.current = selectedCalendar.id;
    setViewYear(selectedCalendar.state.year);
    setViewMonthIndex(selectedCalendar.state.monthIndex);
    setSelectedDay(null);
    setExpandedOccurrenceId(null);
  }, [selectedCalendar]);

  const viewMonthName = useMemo(() => {
    if (!calendarLike) return 'Month';
    return resolveMonthName(calendarLike, viewYear, viewMonthIndex);
  }, [calendarLike, viewYear, viewMonthIndex]);

  const viewport = useMemo(() => {
    if (!calendarLike) return null;
    const viewEpoch = calendarEpochMinuteForDate(
      calendarLike,
      viewYear,
      viewMonthIndex,
      1,
    );
    return buildCalendarMonthViewport(viewEpoch, calendarLike);
  }, [calendarLike, viewYear, viewMonthIndex]);

  const campaignToday = selectedCalendar?.state;

  useEffect(() => {
    if (!onBrowseAnchorChange || !campaignToday) return;

    const viewingToday =
      viewYear === campaignToday.year && viewMonthIndex === campaignToday.monthIndex;
    const day =
      selectedDay ?? (viewingToday ? campaignToday.day : 1);

    onBrowseAnchorChange({
      year: viewYear,
      month: viewMonthIndex,
      day,
    });
  }, [
    onBrowseAnchorChange,
    campaignToday,
    viewYear,
    viewMonthIndex,
    selectedDay,
  ]);

  const goToPreviousMonth = useCallback(() => {
    if (!calendarLike) return;
    if (viewMonthIndex > 0) {
      setViewMonthIndex(viewMonthIndex - 1);
    } else if (viewYear > 1) {
      const priorYear = viewYear - 1;
      setViewYear(priorYear);
      setViewMonthIndex(Math.max(0, getYearMonthCount(calendarLike, priorYear) - 1));
    }
    setSelectedDay(null);
    setExpandedOccurrenceId(null);
  }, [calendarLike, viewMonthIndex, viewYear]);

  const goToNextMonth = useCallback(() => {
    if (!calendarLike) return;
    const lastIndex = Math.max(0, getYearMonthCount(calendarLike, viewYear) - 1);
    if (viewMonthIndex < lastIndex) {
      setViewMonthIndex(viewMonthIndex + 1);
    } else {
      setViewYear(viewYear + 1);
      setViewMonthIndex(0);
    }
    setSelectedDay(null);
    setExpandedOccurrenceId(null);
  }, [calendarLike, viewMonthIndex, viewYear]);

  const goToToday = useCallback(() => {
    if (!selectedCalendar) return;
    setViewYear(selectedCalendar.state.year);
    setViewMonthIndex(selectedCalendar.state.monthIndex);
    setSelectedDay(selectedCalendar.state.day);
    setExpandedOccurrenceId(null);
  }, [selectedCalendar]);

  const baseEventById = useMemo(
    () => new Map(baseEvents.map((event) => [event.id, event])),
    [baseEvents],
  );

  const categoryNameById = useMemo(
    () => new Map(chronologyBundle.categories.map((category) => [category.id, category.name])),
    [chronologyBundle.categories],
  );

  const eventsByDay = useMemo(() => {
    const map = new Map<number, DayCellOverlay>();
    if (!selectedCalendar) return map;

    for (const occurrence of chronologyBundle.occurrences) {
      if (occurrence.calendarId !== selectedCalendar.id) continue;
      if (occurrence.start.year !== viewYear) continue;
      if (occurrence.start.month !== viewMonthIndex) continue;
      const day = occurrence.start.day;
      if (day === null) continue;

      const existing = map.get(day) ?? { count: 0, hasContinuation: false };
      existing.count += 1;
      if (occurrence.isContinuation) {
        existing.hasContinuation = true;
      }
      map.set(day, existing);
    }

    return map;
  }, [chronologyBundle.occurrences, selectedCalendar, viewYear, viewMonthIndex]);

  const dayAgenda = useMemo(() => {
    if (selectedDay === null || !selectedCalendar) return [];
    return chronologyBundle.occurrences
      .filter(
        (occurrence) =>
          occurrence.calendarId === selectedCalendar.id &&
          occurrence.start.year === viewYear &&
          occurrence.start.month === viewMonthIndex &&
          occurrence.start.day === selectedDay,
      )
      .sort((a, b) => a.title.localeCompare(b.title));
  }, [
    chronologyBundle.occurrences,
    selectedCalendar,
    viewYear,
    viewMonthIndex,
    selectedDay,
  ]);

  const handleDayClick = useCallback((day: number) => {
    setSelectedDay(day);
    setExpandedOccurrenceId(null);
  }, []);

  const toggleAgendaItem = useCallback((occurrenceId: string) => {
    setExpandedOccurrenceId((current) => (current === occurrenceId ? null : occurrenceId));
  }, []);

  if (!selectedCalendar || !viewport || !campaignToday) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-muted">
        No fantasy calendars configured for this campaign.
      </div>
    );
  }

  return (
    <div className="relative flex h-full min-h-0 overflow-hidden">
      <div className="flex min-w-0 flex-1 flex-col overflow-hidden p-3">
        <div className="relative mb-3 w-full max-w-xs">
          <button
            type="button"
            onClick={() => setMenuOpen((open) => !open)}
            className="flex w-full items-center justify-between gap-2 rounded-lg border border-border bg-background px-3 py-2 text-left text-sm text-foreground hover:border-primary/40"
          >
            <span className="truncate font-medium">{selectedCalendar.name}</span>
            <ChevronDown
              className={`size-4 shrink-0 text-muted transition-transform ${menuOpen ? 'rotate-180' : ''}`}
            />
          </button>
          {menuOpen && calendars.length > 0 && (
            <ul className="absolute left-0 right-0 top-full z-20 mt-1 max-h-48 overflow-auto rounded-lg border border-border bg-background py-1 shadow-xl">
              {calendars.map((calendar) => (
                <li key={calendar.id}>
                  <button
                    type="button"
                    className={`flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-elevated ${
                      calendar.id === selectedCalendar.id
                        ? 'bg-elevated/80 text-primary'
                        : 'text-foreground'
                    }`}
                    onClick={() => {
                      setSelectedCalendarId(calendar.id);
                      setMenuOpen(false);
                      setSelectedDay(null);
                      setExpandedOccurrenceId(null);
                    }}
                  >
                    {calendar.name}
                    {calendar.isMasterTime && (
                      <span className="ml-auto text-[10px] uppercase tracking-wide text-muted">
                        master
                      </span>
                    )}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="mb-2 flex flex-wrap items-center justify-center gap-2">
          <button
            type="button"
            onClick={goToPreviousMonth}
            className="rounded-lg border border-border p-1.5 text-muted hover:bg-elevated hover:text-foreground"
            title="Previous month"
          >
            <ChevronLeft className="size-4" />
          </button>
          <p className="min-w-[10rem] text-center text-sm font-semibold text-foreground">
            Year {viewYear} · {viewMonthName}
          </p>
          <button
            type="button"
            onClick={goToNextMonth}
            className="rounded-lg border border-border p-1.5 text-muted hover:bg-elevated hover:text-foreground"
            title="Next month"
          >
            <ChevronRight className="size-4" />
          </button>
          <button
            type="button"
            onClick={goToToday}
            className="rounded-lg border border-border px-2 py-1 text-[11px] font-medium text-foreground hover:bg-elevated"
          >
            Today
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-auto">
          <CalendarMonthGrid
            columnLabels={viewport.columnLabels}
            monthTitle={viewport.monthTitle}
            climateAspect={viewport.climateAspect}
            rows={viewport.rows}
            isIntercalaryMonth={viewport.isIntercalaryMonth}
            eventsByDay={eventsByDay}
            selectedDay={selectedDay}
            onDayClick={handleDayClick}
          />
        </div>
      </div>

      <aside
        className={`absolute right-0 top-0 z-30 flex h-full w-[min(360px,90vw)] flex-col border-l border-border bg-background shadow-xl transition-transform duration-300 ${
          selectedDay !== null ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <h2 className="text-sm font-semibold text-foreground">
            {viewMonthName} {selectedDay ?? ''}
          </h2>
          <button
            type="button"
            onClick={() => {
              setSelectedDay(null);
              setExpandedOccurrenceId(null);
            }}
            className="rounded p-1 text-muted hover:bg-elevated hover:text-foreground"
            title="Close agenda"
          >
            <X className="size-4" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-4">
          {selectedDay === null ? (
            <p className="text-xs text-muted">Select a day on the calendar.</p>
          ) : dayAgenda.length === 0 ? (
            <p className="text-xs text-muted">No events on this day.</p>
          ) : (
            <ul className="space-y-2">
              {dayAgenda.map((occurrence) => (
                <AgendaItem
                  key={occurrence.occurrenceId}
                  campaignHandle={campaignHandle}
                  occurrence={occurrence}
                  baseEvent={baseEventById.get(occurrence.baseEventId) ?? null}
                  calendarName={selectedCalendar.name}
                  calendarLike={calendarLike}
                  categories={categories}
                  editableEvents={baseEvents}
                  canManage={canManage}
                  categoryName={
                    occurrence.categoryId
                      ? categoryNameById.get(occurrence.categoryId) ?? 'Unknown'
                      : 'Uncategorized'
                  }
                  expanded={expandedOccurrenceId === occurrence.occurrenceId}
                  onToggle={() => toggleAgendaItem(occurrence.occurrenceId)}
                  onEventMutated={onEventMutated}
                  onEventDeleted={() => {
                    setExpandedOccurrenceId(null);
                  }}
                />
              ))}
            </ul>
          )}
        </div>
      </aside>
    </div>
  );
}

function AgendaItem({
  campaignHandle,
  occurrence,
  baseEvent,
  calendarName,
  calendarLike,
  categories,
  editableEvents,
  canManage,
  categoryName,
  expanded,
  onToggle,
  onEventMutated,
  onEventDeleted,
}: {
  campaignHandle: string;
  occurrence: TimelineOccurrenceRecord;
  baseEvent: TimelineBaseEventRecord | null;
  calendarName: string;
  calendarLike: FantasyCalendarLike | null;
  categories: TimelineCategoryRecord[];
  editableEvents: TimelineBaseEventRecord[];
  canManage: boolean;
  categoryName: string;
  expanded: boolean;
  onToggle: () => void;
  onEventMutated?: () => void | Promise<void>;
  onEventDeleted?: () => void | Promise<void>;
}) {
  return (
    <li className="rounded-lg border border-border bg-surface/50 overflow-hidden">
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={expanded}
        className="flex w-full items-start gap-2 p-3 text-left hover:bg-elevated/40"
      >
        {expanded ? (
          <ChevronDown className="mt-0.5 size-4 shrink-0 text-muted" />
        ) : (
          <ChevronRight className="mt-0.5 size-4 shrink-0 text-muted" />
        )}
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-foreground">{occurrence.title}</p>
          <p className="mt-1 text-[11px] text-muted">{categoryName}</p>
          {occurrence.duration > 1 && (
            <p className="mt-1 text-[10px] text-muted">
              Day {occurrence.dayOffset + 1} of {occurrence.duration}
            </p>
          )}
        </div>
      </button>
      <div
        className={`grid transition-[grid-template-rows] duration-300 ease-out ${
          expanded ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'
        }`}
      >
        <div className="overflow-hidden">
          <div className="px-3 pb-3">
            {baseEvent ? (
              <ChronologyEventInlineDetail
                campaignHandle={campaignHandle}
                baseEvent={baseEvent}
                calendarName={calendarName}
                showConditions={false}
                canManage={canManage}
                categories={categories}
                editableEvents={editableEvents}
                calendarLike={calendarLike}
                dateSeed={{
                  year: occurrence.start.year,
                  month: occurrence.start.month,
                  day: occurrence.start.day,
                }}
                onMutated={onEventMutated}
                onDeleted={onEventDeleted}
              />
            ) : (
              <p className="text-xs text-muted">Event details unavailable.</p>
            )}
          </div>
        </div>
      </div>
    </li>
  );
}
