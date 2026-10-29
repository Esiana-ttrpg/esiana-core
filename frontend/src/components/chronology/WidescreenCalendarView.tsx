import { ChronologyInspector } from './ChronologyInspector';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ChevronDown, ChevronLeft, ChevronRight } from 'lucide-react';
import { CalendarMonthGrid } from '@/components/chronology/CalendarMonthGrid';
import {
  calendarMonthDays,
  compareCalendarEvents,
  eventDayState,
} from '@/lib/calendarPresentation';
import { CalendarClimateContext } from './CalendarClimateContext';
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
  onBrowseAnchorChange?: (
    anchor: ChronologyDateParts,
    calendarId?: string,
  ) => void;
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
  const [selectedCalendarId, setSelectedCalendarId] = useState<string | null>(
    null,
  );
  const [selectedDay, setSelectedDay] = useState<number | null>(null);
  const [expandedOccurrenceId, setExpandedOccurrenceId] = useState<
    string | null
  >(null);
  const [viewYear, setViewYear] = useState(1);
  const [viewMonthIndex, setViewMonthIndex] = useState(0);
  const [importanceFilter, setImportanceFilter] = useState<
    Record<'NOTICE' | 'MINOR' | 'MAJOR', boolean>
  >({ NOTICE: false, MINOR: true, MAJOR: true });
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
    () =>
      calendars.find((calendar) => calendar.id === selectedCalendarId) ??
      calendars[0] ??
      null,
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
  const monthContext = useMemo(
    () =>
      calendarLike
        ? calendarMonthDays(calendarLike, viewYear, viewMonthIndex)
        : null,
    [calendarLike, viewYear, viewMonthIndex],
  );
  const agendaRef = useRef<HTMLElement>(null);
  const lastDayButton = useRef<HTMLElement | null>(null);
  const closeAgenda = () => {
    setSelectedDay(null);
    setExpandedOccurrenceId(null);
    lastDayButton.current?.focus();
  };

  useEffect(() => {
    if (!onBrowseAnchorChange || !campaignToday) return;

    const viewingToday =
      viewYear === campaignToday.year &&
      viewMonthIndex === campaignToday.monthIndex;
    const day = selectedDay ?? (viewingToday ? campaignToday.day : 1);

    onBrowseAnchorChange(
      {
        year: viewYear,
        month: viewMonthIndex,
        day,
      },
      selectedCalendar?.id,
    );
  }, [
    onBrowseAnchorChange,
    campaignToday,
    viewYear,
    viewMonthIndex,
    selectedDay,
    selectedCalendar?.id,
  ]);

  const goToPreviousMonth = useCallback(() => {
    if (!calendarLike) return;
    if (viewMonthIndex > 0) {
      setViewMonthIndex(viewMonthIndex - 1);
    } else if (viewYear > 1) {
      const priorYear = viewYear - 1;
      setViewYear(priorYear);
      setViewMonthIndex(
        Math.max(0, getYearMonthCount(calendarLike, priorYear) - 1),
      );
    }
    setSelectedDay(null);
    setExpandedOccurrenceId(null);
  }, [calendarLike, viewMonthIndex, viewYear]);

  const goToNextMonth = useCallback(() => {
    if (!calendarLike) return;
    const lastIndex = Math.max(
      0,
      getYearMonthCount(calendarLike, viewYear) - 1,
    );
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
    () =>
      new Map(
        chronologyBundle.categories.map((category) => [
          category.id,
          category.name,
        ]),
      ),
    [chronologyBundle.categories],
  );

  const eventsByDay = useMemo(() => {
    const map = new Map<number, TimelineOccurrenceRecord[]>();
    if (!selectedCalendar) return map;

    for (const occurrence of chronologyBundle.occurrences) {
      if (occurrence.calendarId !== selectedCalendar.id) continue;
      if (!importanceFilter[occurrence.importance ?? 'MINOR']) continue;
      if (occurrence.start.year !== viewYear) continue;
      if (occurrence.start.month !== viewMonthIndex) continue;
      const day = occurrence.start.day;
      if (day === null) continue;

      const existing = map.get(day) ?? [];
      existing.push(occurrence);
      map.set(day, existing);
    }

    return map;
  }, [
    chronologyBundle.occurrences,
    selectedCalendar,
    viewYear,
    viewMonthIndex,
    importanceFilter,
  ]);

  const dayAgenda = useMemo(() => {
    if (selectedDay === null || !selectedCalendar) return [];
    return chronologyBundle.occurrences
      .filter(
        (occurrence) =>
          occurrence.calendarId === selectedCalendar.id &&
          importanceFilter[occurrence.importance ?? 'MINOR'] &&
          occurrence.start.year === viewYear &&
          occurrence.start.month === viewMonthIndex &&
          occurrence.start.day === selectedDay,
      )
      .sort(compareCalendarEvents);
  }, [
    chronologyBundle.occurrences,
    selectedCalendar,
    viewYear,
    viewMonthIndex,
    selectedDay,
    importanceFilter,
  ]);

  const handleDayClick = useCallback((day: number) => {
    lastDayButton.current = document.activeElement as HTMLElement;
    setSelectedDay(day);
    requestAnimationFrame(() => {
      agendaRef.current
        ?.querySelector('button')
        ?.focus({ preventScroll: true });
      if (window.matchMedia('(max-width: 767px)').matches)
        agendaRef.current?.scrollIntoView({
          block: 'nearest',
          behavior: 'smooth',
        });
    });
    setExpandedOccurrenceId(null);
  }, []);

  const toggleAgendaItem = useCallback((occurrenceId: string) => {
    setExpandedOccurrenceId((current) =>
      current === occurrenceId ? null : occurrenceId,
    );
  }, []);

  if (!selectedCalendar || !viewport || !campaignToday) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-muted">
        No fantasy calendars configured for this campaign.
      </div>
    );
  }

  return (
    <div className="relative flex h-full min-h-0 flex-col overflow-y-auto md:flex-row md:overflow-hidden">
      <div className="flex min-w-0 shrink-0 flex-col p-3 md:min-h-0 md:flex-1 md:overflow-hidden">
        <label className="mb-3 block w-full max-w-xs text-xs text-muted">
          Calendar track
          <select
            value={selectedCalendar.id}
            onChange={(event) => {
              setSelectedCalendarId(event.target.value);
              setSelectedDay(null);
              setExpandedOccurrenceId(null);
            }}
            className="mt-1 block w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground"
          >
            {calendars.map((calendar) => (
              <option key={calendar.id} value={calendar.id}>
                {calendar.name}
                {calendar.isMasterTime ? ' (master)' : ''}
              </option>
            ))}
          </select>
        </label>

        <div className="mb-2 flex flex-wrap items-center justify-center gap-2">
          {(['NOTICE', 'MINOR', 'MAJOR'] as const).map((importance) => (
            <button
              key={importance}
              type="button"
              aria-pressed={importanceFilter[importance]}
              onClick={() =>
                setImportanceFilter((current) => ({
                  ...current,
                  [importance]: !current[importance],
                }))
              }
              className={`rounded-full border px-2 py-1 text-[10px] ${importanceFilter[importance] ? 'border-primary bg-primary/10 text-primary' : 'border-border text-muted'}`}
            >
              {importance[0] + importance.slice(1).toLowerCase()}
            </button>
          ))}
          <button
            type="button"
            onClick={goToPreviousMonth}
            className="rounded-lg border border-border p-1.5 text-muted hover:bg-elevated hover:text-foreground"
            aria-label="Previous month"
            disabled={viewYear === 1 && viewMonthIndex === 0}
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
            aria-label="Next month"
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

        {chronologyBundle.expansionMetadata.generated.truncated && (
          <p role="status" className="mb-2 text-xs text-muted">
            Some event occurrences are omitted because expansion limits were
            reached.
          </p>
        )}
        <CalendarClimateContext
          climateAspect={monthContext?.climateAspect}
          days={monthContext?.days}
        />
        <div className="min-h-0 md:flex-1 md:overflow-auto">
          <CalendarMonthGrid
            columnLabels={viewport.columnLabels}
            monthTitle={viewport.monthTitle}
            climateAspect={viewport.climateAspect}
            rows={viewport.rows}
            isIntercalaryMonth={viewport.isIntercalaryMonth}
            presentation="expanded"
            occurrencesByDay={eventsByDay}
            dayStates={monthContext?.days}
            todayDay={
              campaignToday.year === viewYear &&
              campaignToday.monthIndex === viewMonthIndex
                ? campaignToday.day
                : null
            }
            onEventClick={(event) => {
              handleDayClick(event.start.day!);
              setExpandedOccurrenceId(event.occurrenceId);
            }}
            selectedDay={selectedDay}
            onDayClick={handleDayClick}
          />
        </div>
      </div>

      {selectedDay !== null && <ChronologyInspector
        surfaceRef={agendaRef}
        label="Selected day details"
        closeLabel="Close agenda"
        title={`${viewMonthName} ${selectedDay}`}
        onClose={closeAgenda}
      >

          {selectedDay !== null &&
            monthContext?.days
              .get(selectedDay)
              ?.activeMoonPhases.map((moon, index) => (
                <p key={index} className="mb-1 text-xs text-muted">
                  {moon.name}: {moon.phase}
                </p>
              ))}
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
                      ? (categoryNameById.get(occurrence.categoryId) ??
                        'Unknown')
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
      </ChronologyInspector>}
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
          <p className="text-sm font-medium text-foreground">
            {occurrence.title}
          </p>
          {!!occurrence.eraNames?.length && (
            <p className="text-xs text-muted-foreground">
              {occurrence.eraNames.join(' · ')}
            </p>
          )}
          <p className="mt-1 text-[11px] text-muted">{categoryName}</p>
          <p className="mt-1 text-xs text-muted">
            {eventDayState(occurrence)}
            {occurrence.duration > 1 && (
              <>
                {' '}
                · Day {occurrence.dayOffset + 1} of {occurrence.duration}
              </>
            )}
          </p>
        </div>
      </button>
      <div
        inert={!expanded}
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
