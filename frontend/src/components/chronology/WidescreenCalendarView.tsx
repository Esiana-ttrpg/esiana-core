import { ChronologyCoverageNotice } from './ChronologyCoverageNotice';
import { ChronologyImportance } from './ChronologyImportance';
import { ChronologyInspector } from './ChronologyInspector';
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { chronologyTargetSignature, chronologyViewParams, intervalOccurrence, linkedInterval, linkedNativeDate } from '@/lib/chronologyNavigation';
import { historicalClock, sharedHistoricalIntervals } from '@/lib/historicalTimeline';
import { campaignChronologyPath } from '@/lib/campaignPaths';
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

export interface CalendarSession {
  signature?: string;
  snapshot?: { calendarId: string | null; year: number; month: number; day: number | null;
    occurrenceId: string | null; importance: Record<'NOTICE' | 'MINOR' | 'MAJOR', boolean> };
}
interface WidescreenCalendarViewProps {
  onInspectionChange?: (occurrence: TimelineOccurrenceRecord | null) => void;
  session?: CalendarSession;
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

export function WidescreenCalendarView({
  campaignHandle,
  timeBundle,
  chronologyBundle,
  baseEvents,
  categories,
  canManage,
  onBrowseAnchorChange,
  onEventMutated,
  session,
  onInspectionChange,
}: WidescreenCalendarViewProps) {
  const [params] = useSearchParams();
  const [selectedCalendarId, setSelectedCalendarId] = useState<string | null>(
    session?.snapshot?.calendarId ?? null,
  );
  const [selectedDay, setSelectedDay] = useState<number | null>(session?.snapshot?.day ?? null);
  const [expandedOccurrenceId, setExpandedOccurrenceId] = useState<
    string | null
  >(session?.snapshot?.occurrenceId ?? null);
  const [viewYear, setViewYear] = useState(session?.snapshot?.year ?? 1);
  const [viewMonthIndex, setViewMonthIndex] = useState(session?.snapshot?.month ?? 0);
  const [importanceFilter, setImportanceFilter] = useState<
    Record<'NOTICE' | 'MINOR' | 'MAJOR', boolean>
  >(session?.snapshot?.importance ?? { NOTICE: false, MINOR: true, MAJOR: true });
  const viewCalendarIdRef = useRef<string | null>(session?.snapshot?.calendarId ?? null);
  useLayoutEffect(() => {
    if (session) session.snapshot = { calendarId: selectedCalendarId, year: viewYear, month: viewMonthIndex,
      day: selectedDay, occurrenceId: expandedOccurrenceId, importance: importanceFilter };
  }, [session, selectedCalendarId, viewYear, viewMonthIndex, selectedDay, expandedOccurrenceId, importanceFilter]);
  const signature = chronologyTargetSignature(params);
  const appliedLink = useRef(params.get('focus') === 'calendar' ? undefined : session?.snapshot ? signature : undefined);
  const [revealedTarget, setRevealedTarget] = useState<string | null>(null);
  const targetClock = timeBundle.calendars.find(row => row.id === params.get('track') && chronologyBundle.calendars.some(track => track.id === row.id));
  const targetAxis = useMemo(() => targetClock ? historicalClock(targetClock).axis : null, [targetClock]);
  const targetIntervals = useMemo(() => targetAxis ? sharedHistoricalIntervals(chronologyBundle.occurrences.filter(row =>
    row.calendarId === targetClock?.id && baseEvents.some(base => base.id === row.baseEventId && base.calendarId === row.calendarId)), targetAxis) : [],
  [targetAxis, targetClock, chronologyBundle.occurrences, baseEvents]);
  const targetInterval = linkedInterval(params, targetIntervals);
  const target = targetInterval && targetAxis ? intervalOccurrence(targetInterval, targetAxis) : null;
  const linkedDate = target?.start ?? (targetAxis ? linkedNativeDate(params, targetAxis) : null) ??
    (!params.has('event') && !params.has('date') && targetClock ? { year: targetClock.state.year, month: targetClock.state.monthIndex, day: targetClock.state.day } : null);
  const hasTarget = params.has('event') || params.has('date') || params.has('track');
  const unavailable = hasTarget && (!targetClock || !linkedDate || (params.has('event') && !target));
  const filteredTarget = target && !importanceFilter[target.importance] && revealedTarget !== signature;
  const calendars = useMemo(() => timeBundle.calendars.filter(row => chronologyBundle.calendars.some(track => track.id === row.id)), [timeBundle.calendars, chronologyBundle.calendars]);

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
    () => (selectedCalendar ? historicalClock(selectedCalendar).axis?.calendar ?? null : null),
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

  useEffect(() => {
    if (appliedLink.current === signature) return;
    appliedLink.current = signature;
    if (session) session.signature = signature;
    setRevealedTarget(null);
    if (!hasTarget) return;
    setExpandedOccurrenceId(null); setSelectedDay(null);
    if (unavailable || !targetClock || !linkedDate) return;
    viewCalendarIdRef.current = targetClock.id;
    setSelectedCalendarId(targetClock.id);
    setViewYear(linkedDate.year!); setViewMonthIndex(linkedDate.month!); setSelectedDay(linkedDate.day);
    if (target && !filteredTarget) setExpandedOccurrenceId(target.occurrenceId);
  }, [signature, session, hasTarget, unavailable, targetClock, linkedDate, target, filteredTarget]);

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

  // Bounded bundles may contain only continuation days; inspection still opens the actual start.
  const calendarOccurrences = useMemo(() => target && !chronologyBundle.occurrences.some(row =>
    row.baseEventId === target.baseEventId && row.occurrenceIndex === target.occurrenceIndex && row.calendarId === target.calendarId && row.dayOffset === 0)
    ? [...chronologyBundle.occurrences, target] : chronologyBundle.occurrences, [chronologyBundle.occurrences, target]);
  const eventsByDay = useMemo(() => {
    const map = new Map<number, TimelineOccurrenceRecord[]>();
    if (!selectedCalendar) return map;

    for (const occurrence of calendarOccurrences) {
      if (occurrence.calendarId !== selectedCalendar.id) continue;
      if (!importanceFilter[occurrence.importance ?? 'MINOR'] && !(revealedTarget === signature && occurrence.baseEventId === target?.baseEventId && occurrence.occurrenceIndex === target.occurrenceIndex)) continue;
      if (!baseEventById.has(occurrence.baseEventId)) continue;
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
    calendarOccurrences,
    selectedCalendar,
    viewYear,
    viewMonthIndex,
    importanceFilter,
    revealedTarget, signature, target, baseEventById,
  ]);

  const dayAgenda = useMemo(() => {
    if (selectedDay === null || !selectedCalendar) return [];
    return calendarOccurrences
      .filter(
        (occurrence) =>
          occurrence.calendarId === selectedCalendar.id &&
          baseEventById.has(occurrence.baseEventId) &&
          (importanceFilter[occurrence.importance ?? 'MINOR'] || (revealedTarget === signature && occurrence.baseEventId === target?.baseEventId && occurrence.occurrenceIndex === target.occurrenceIndex)) &&
          occurrence.start.year === viewYear &&
          occurrence.start.month === viewMonthIndex &&
          occurrence.start.day === selectedDay,
      )
      .sort(compareCalendarEvents);
  }, [
    calendarOccurrences,
    selectedCalendar,
    viewYear,
    viewMonthIndex,
    selectedDay,
    importanceFilter,
    revealedTarget, signature, target, baseEventById,
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
          behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth',
        });
    });
    setExpandedOccurrenceId(null);
  }, []);

  const inspected = dayAgenda.find(row => row.occurrenceId === expandedOccurrenceId);
  const inspectionAxis = useMemo(() => selectedCalendar ? historicalClock(selectedCalendar).axis : null, [selectedCalendar]);
  useEffect(() => {
    const row = inspected && inspectionAxis ? sharedHistoricalIntervals([inspected], inspectionAxis)[0] : null;
    onInspectionChange?.(row && inspectionAxis ? intervalOccurrence(row, inspectionAxis) : null);
  }, [inspected, inspectionAxis, onInspectionChange]);

  const toggleAgendaItem = useCallback((occurrenceId: string) => {
    setExpandedOccurrenceId((current) =>
      current === occurrenceId ? null : occurrenceId,
    );
  }, []);

  if (!selectedCalendar || !viewport || !campaignToday) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-muted">
        {calendars.length ? 'Calendar definition unavailable or invalid.' : 'No fantasy calendars configured for this campaign.'}
      </div>
    );
  }

  return (
    <div className="relative flex h-full min-h-0 flex-col overflow-y-auto md:flex-row md:overflow-hidden">
      <div className="flex min-w-0 shrink-0 flex-col p-3 md:min-h-0 md:flex-1 md:overflow-hidden">
        {unavailable && <p role="status" className="text-sm text-muted">This historical target is unavailable in the loaded authorized history.</p>}
        {filteredTarget && <p role="status" className="text-sm text-muted">This event is hidden by Calendar filters. <button className="min-h-11 underline" onClick={() => { setRevealedTarget(signature); setExpandedOccurrenceId(target.occurrenceId); }}>Show this event</button></p>}
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
            Campaign Today
          </button>
        </div>

        <ChronologyCoverageNotice metadata={chronologyBundle.expansionMetadata} className="mb-2" />
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
          <Link className="inline-flex min-h-11 items-center text-sm underline" to={`${campaignChronologyPath(campaignHandle)}?${chronologyViewParams(params, 'timeline', { calendarId: selectedCalendar.id, date: { year: viewYear, month: viewMonthIndex, day: selectedDay } })}`}>View date on Timeline</Link>
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
            <p className="text-xs text-muted">No loaded occurrences match this day and its filters.</p>
          ) : (
            <ul className="space-y-2">
              {dayAgenda.map((occurrence) => (
                <AgendaItem
                  key={occurrence.occurrenceId}
                  campaignHandle={campaignHandle}
                  occurrence={occurrence}
                  timeBundle={timeBundle}
                  fullOccurrence={(() => {
                    const clock = historicalClock(selectedCalendar);
                    if (!clock.axis) return null;
                    const row = sharedHistoricalIntervals([occurrence], clock.axis)[0];
                    return row ? intervalOccurrence(row, clock.axis) : null;
                  })()}
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
  fullOccurrence,
  timeBundle,
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
  fullOccurrence: TimelineOccurrenceRecord | null;
  timeBundle: TimeTrackingBundle;
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
          <p className="mt-1 text-[11px] text-muted">{categoryName} · <ChronologyImportance value={occurrence.importance} /></p>
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
        className={`grid transition-[grid-template-rows] duration-300 ease-out motion-reduce:transition-none ${
          expanded ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'
        }`}
      >
        <div className="overflow-hidden">
          <div className="px-3 pb-3">
            {baseEvent && expanded ? (
              <ChronologyEventInlineDetail
                campaignHandle={campaignHandle}
                baseEvent={baseEvent}
                occurrence={fullOccurrence}
                timeBundle={timeBundle}
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
