import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ChevronDown, ChevronLeft, ChevronRight } from 'lucide-react';
import { ChronologyEventInlineDetail } from '@/components/chronology/ChronologyEventInlineDetail';
import { SURFACE_SILENT_CLASS } from '@/lib/surfaceLayout';
import {
  dateSortKey,
  findClosestEventIndex,
  formatMonthSeparatorWithName,
  isAfterNow,
  isBeforeNow,
  isCurrentMonth,
  nowFromCalendarState,
  sortOccurrencesByDate,
  type ChronologyDateParts,
} from '@/lib/chronologyDates';
import {
  getMonthsForYear,
  getYearMonthCount,
  parseLeapRules,
  parseMonths,
  resolveMonthName,
  type FantasyCalendarLike,
} from '@/lib/timeEngine';
import type {
  TimelineBaseEventRecord,
  TimelineCalendarRecord,
  TimelineCategoryRecord,
  TimelineEventRecord,
} from '@/lib/chronologyApi';
import type { TimeTrackingBundle } from '@/lib/timeTrackingApi';

interface EventsLedgerViewProps {
  campaignHandle: string;
  categories: TimelineCategoryRecord[];
  calendars: TimelineCalendarRecord[];
  events: TimelineEventRecord[];
  baseEvents: TimelineBaseEventRecord[];
  timeBundle: TimeTrackingBundle;
  canManage: boolean;
  selectedEventId: string | null;
  onSelectEvent: (event: TimelineEventRecord) => void;
  onBrowseAnchorChange?: (anchor: ChronologyDateParts) => void;
  onEventMutated?: () => void | Promise<void>;
  onEventDeleted?: () => void | Promise<void>;
}

interface LedgerCategory {
  id: string;
  name: string;
}

interface LedgerSection {
  key: string;
  label: string;
  isCurrentMonth: boolean;
  isSynthetic?: boolean;
  events: TimelineEventRecord[];
}

function partsFromSectionKey(key: string): ChronologyDateParts {
  const [yearRaw, monthRaw] = key.split('-');
  const year = yearRaw === 'u' ? null : Number(yearRaw);
  const month = monthRaw === 'u' ? null : Number(monthRaw);
  return {
    year: Number.isFinite(year) ? year : null,
    month: Number.isFinite(month) ? month : null,
    day: 1,
  };
}

function buildLedgerSections(
  events: TimelineEventRecord[],
  now: ChronologyDateParts,
  monthLabelFor: (parts: ChronologyDateParts) => string,
): LedgerSection[] {
  const sorted = sortOccurrencesByDate(events);
  const sections: LedgerSection[] = [];

  for (const event of sorted) {
    const key = `${event.start.year ?? 'u'}-${event.start.month ?? 'u'}`;
    const last = sections[sections.length - 1];
    if (last && last.key === key) {
      last.events.push(event);
      continue;
    }

    sections.push({
      key,
      label: formatMonthSeparatorWithName(event.start, monthLabelFor(event.start)),
      isCurrentMonth: isCurrentMonth(event.start, now),
      events: [event],
    });
  }

  return sections;
}

function ensureCurrentMonthSection(
  sections: LedgerSection[],
  now: ChronologyDateParts,
  monthLabelFor: (parts: ChronologyDateParts) => string,
): LedgerSection[] {
  if (now.year === null || now.month === null) {
    return sections;
  }

  const nowKey = `${now.year}-${now.month}`;
  if (sections.some((section) => section.key === nowKey)) {
    return sections;
  }

  const synthetic: LedgerSection = {
    key: nowKey,
    label: formatMonthSeparatorWithName(now, monthLabelFor(now)),
    isCurrentMonth: true,
    isSynthetic: true,
    events: [],
  };

  const nowSort = dateSortKey(now);
  const next = [...sections];
  let insertAt = next.length;
  for (let index = 0; index < next.length; index += 1) {
    if (dateSortKey(partsFromSectionKey(next[index]!.key)) > nowSort) {
      insertAt = index;
      break;
    }
  }
  next.splice(insertAt, 0, synthetic);
  return next;
}

function calendarRowToLike(row: {
  epochOffset: string;
  weekdays: unknown;
  months: unknown;
  seasons: unknown;
  moons: unknown;
  leapDays: unknown;
}): FantasyCalendarLike {
  return {
    epochOffset: BigInt(row.epochOffset),
    weekdays: row.weekdays,
    months: row.months,
    seasons: row.seasons,
    moons: row.moons,
    leapDays: row.leapDays,
  };
}

export function EventsLedgerView({
  campaignHandle,
  categories,
  calendars,
  events,
  baseEvents,
  timeBundle,
  selectedEventId,
  onSelectEvent,
  canManage,
  onBrowseAnchorChange,
  onEventMutated,
  onEventDeleted,
}: EventsLedgerViewProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const anchorRef = useRef<HTMLDivElement>(null);
  const [activeCategoryIndex, setActiveCategoryIndex] = useState(0);
  const [jumpYear, setJumpYear] = useState('');
  const [jumpMonthIndex, setJumpMonthIndex] = useState('0');
  const [expandedOccurrenceId, setExpandedOccurrenceId] = useState<string | null>(null);

  const ledgerCategories = useMemo<LedgerCategory[]>(
    () => [
      { id: 'uncategorized', name: 'Uncategorized' },
      ...categories.map((category) => ({ id: category.id, name: category.name })),
    ],
    [categories],
  );

  const masterCalendar = useMemo(
    () => timeBundle.calendars.find((calendar) => calendar.isMasterTime) ?? timeBundle.calendars[0],
    [timeBundle.calendars],
  );

  const now = useMemo(
    () => (masterCalendar ? nowFromCalendarState(masterCalendar.state) : { year: null, month: null, day: null }),
    [masterCalendar],
  );

  const masterCalendarLike = useMemo(
    () => (masterCalendar ? calendarRowToLike(masterCalendar) : null),
    [masterCalendar],
  );

  const calendarLikeById = useMemo(() => {
    const map = new Map<string, FantasyCalendarLike>();
    for (const calendar of timeBundle.calendars) {
      map.set(calendar.id, calendarRowToLike(calendar));
    }
    return map;
  }, [timeBundle.calendars]);

  const monthLabelFor = useCallback(
    (parts: ChronologyDateParts) => {
      if (!masterCalendarLike || parts.year === null || parts.month === null) {
        return '';
      }
      return resolveMonthName(masterCalendarLike, parts.year, parts.month);
    },
    [masterCalendarLike],
  );

  const activeCategory = ledgerCategories[activeCategoryIndex] ?? ledgerCategories[0];

  const categoryEvents = useMemo(() => {
    if (!activeCategory) return [];
    return events.filter((event) => {
      const categoryKey = event.categoryId ?? 'uncategorized';
      return categoryKey === activeCategory.id;
    });
  }, [events, activeCategory]);

  const sections = useMemo(() => {
    const built = buildLedgerSections(categoryEvents, now, monthLabelFor);
    return ensureCurrentMonthSection(built, now, monthLabelFor);
  }, [categoryEvents, now, monthLabelFor]);

  const jumpYearNumber = useMemo(() => {
    const parsed = Number(jumpYear);
    return Number.isFinite(parsed) && parsed >= 1 ? Math.floor(parsed) : now.year ?? 1;
  }, [jumpYear, now.year]);

  const jumpMonthNumber = useMemo(() => {
    const parsed = Number(jumpMonthIndex);
    return Number.isFinite(parsed) && parsed >= 0 ? Math.floor(parsed) : now.month ?? 0;
  }, [jumpMonthIndex, now.month]);

  useEffect(() => {
    if (!onBrowseAnchorChange) return;
    onBrowseAnchorChange({
      year: jumpYearNumber,
      month: jumpMonthNumber,
      day: 1,
    });
  }, [onBrowseAnchorChange, jumpYearNumber, jumpMonthNumber]);

  const jumpMonthOptions = useMemo(() => {
    if (!masterCalendarLike) return [];
    const baseMonths = parseMonths(masterCalendarLike.months);
    const leapRules = parseLeapRules(masterCalendarLike.leapDays);
    return getMonthsForYear(jumpYearNumber, baseMonths, leapRules).map((month, index) => ({
      index,
      name: month.name,
    }));
  }, [masterCalendarLike, jumpYearNumber]);

  const calendarNameById = useMemo(
    () => new Map(calendars.map((calendar) => [calendar.id, calendar.name])),
    [calendars],
  );

  const baseEventById = useMemo(
    () => new Map(baseEvents.map((event) => [event.id, event])),
    [baseEvents],
  );

  const scrollToAnchor = useCallback(() => {
    anchorRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, []);

  useEffect(() => {
    if (now.year !== null) {
      setJumpYear(String(now.year));
    }
    if (now.month !== null) {
      setJumpMonthIndex(String(now.month));
    }
  }, [activeCategoryIndex, now.year, now.month]);

  useEffect(() => {
    const timer = window.setTimeout(scrollToAnchor, 80);
    return () => window.clearTimeout(timer);
  }, [activeCategoryIndex, sections.length, scrollToAnchor]);

  const cycleCategory = (direction: -1 | 1) => {
    setExpandedOccurrenceId(null);
    setActiveCategoryIndex((index) => {
      const total = ledgerCategories.length;
      if (total === 0) return 0;
      return (index + direction + total) % total;
    });
  };

  const toggleRow = (event: TimelineEventRecord) => {
    setExpandedOccurrenceId((current) =>
      current === event.occurrenceId ? null : event.occurrenceId,
    );
    onSelectEvent(event);
  };

  const scrollToLedgerSection = useCallback((year: number, monthIndex: number) => {
    const container = scrollRef.current;
    if (!container) return;
    const targetKey = `${year}-${monthIndex}`;
    const sectionEl = container.querySelector(`[data-ledger-section="${targetKey}"]`);
    sectionEl?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, []);

  const handleGoToCurrentDate = () => {
    if (now.year === null || now.month === null) {
      scrollToAnchor();
      return;
    }
    scrollToLedgerSection(now.year, now.month);
  };

  const handleFantasyJump = () => {
    const monthIndex = Number(jumpMonthIndex);
    if (!Number.isFinite(monthIndex) || monthIndex < 0) return;
    const maxIndex = masterCalendarLike
      ? Math.max(0, getYearMonthCount(masterCalendarLike, jumpYearNumber) - 1)
      : 0;
    scrollToLedgerSection(jumpYearNumber, Math.min(monthIndex, maxIndex));
  };

  const closestEventId = useMemo(() => {
    const index = findClosestEventIndex(categoryEvents, now);
    return index >= 0 ? categoryEvents[index]?.occurrenceId ?? null : null;
  }, [categoryEvents, now]);

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden">
      <div className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-b border-border px-4 py-3">
        <div className="flex flex-1 items-center justify-center gap-2">
          <button
            type="button"
            onClick={() => cycleCategory(-1)}
            className="rounded-lg border border-border p-1.5 text-muted hover:bg-elevated hover:text-foreground"
            title="Previous category"
          >
            <ChevronLeft className="size-4" />
          </button>
          <p className="min-w-[12rem] text-center text-sm font-semibold text-foreground">
            Category: {activeCategory?.name ?? '—'}
          </p>
          <button
            type="button"
            onClick={() => cycleCategory(1)}
            className="rounded-lg border border-border p-1.5 text-muted hover:bg-elevated hover:text-foreground"
            title="Next category"
          >
            <ChevronRight className="size-4" />
          </button>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleGoToCurrentDate}
            className="rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-foreground hover:bg-elevated"
          >
            Go To Current Date
          </button>
          <input
            type="number"
            min={1}
            value={jumpYear}
            onChange={(event) => setJumpYear(event.target.value)}
            className="w-20 rounded-lg border border-border bg-background px-2 py-1.5 text-xs text-foreground"
            title="Jump year"
            aria-label="Jump year"
          />
          <select
            value={jumpMonthIndex}
            onChange={(event) => setJumpMonthIndex(event.target.value)}
            className="max-w-[10rem] rounded-lg border border-border bg-background px-2 py-1.5 text-xs text-foreground"
            title="Jump month"
            aria-label="Jump month"
          >
            {jumpMonthOptions.map((option) => (
              <option key={option.index} value={String(option.index)}>
                {option.name}
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={handleFantasyJump}
            className="rounded-lg border border-border px-2 py-1.5 text-xs font-medium text-foreground hover:bg-elevated"
          >
            Jump
          </button>
        </div>
      </div>

      <div ref={scrollRef} className={`${SURFACE_SILENT_CLASS} min-h-0 flex-1 overflow-y-auto px-4 py-4`}>
        {sections.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted">No events in this category.</p>
        ) : (
          <div className="space-y-6">
            {sections.map((section) => (
              <section
                key={section.isSynthetic ? 'synthetic-now' : section.key}
                data-ledger-section={section.key}
                ref={section.isCurrentMonth ? anchorRef : undefined}
              >
                <div
                  className={`sticky top-0 z-10 mb-3 border-b py-2 text-center text-xs font-semibold uppercase tracking-wide ${
                    section.isCurrentMonth
                      ? 'border-primary/50 bg-background/95 text-primary'
                      : 'border-border bg-background/90 text-muted'
                  }`}
                >
                  {section.isCurrentMonth ? `— Current · ${section.label} —` : `— ${section.label} —`}
                </div>
                {section.isSynthetic ? (
                  <p className="mb-3 text-center text-xs text-muted">
                    No events recorded this month yet.
                  </p>
                ) : null}
                <ul className="space-y-2">
                  {section.events.map((event) => {
                    const faded = isBeforeNow(event.start, now) || isAfterNow(event.start, now);
                    const isAnchorEvent = event.occurrenceId === closestEventId && section.isCurrentMonth;

                    const expanded = expandedOccurrenceId === event.occurrenceId;
                    const baseEvent = baseEventById.get(event.baseEventId) ?? null;

                    return (
                      <li
                        key={event.occurrenceId}
                        className={`overflow-hidden rounded-lg border transition ${
                          selectedEventId === event.occurrenceId || expanded
                            ? 'border-primary bg-primary/5'
                            : 'border-border bg-surface/40'
                        } ${faded ? 'text-muted-foreground/70' : 'text-foreground'} ${
                          isAnchorEvent ? 'ring-1 ring-primary/40' : ''
                        }`}
                      >
                        <button
                          type="button"
                          onClick={() => toggleRow(event)}
                          data-ledger-event={event.occurrenceId}
                          aria-expanded={expanded}
                          className="flex w-full items-start gap-2 px-4 py-3 text-left hover:bg-elevated/30"
                        >
                          {expanded ? (
                            <ChevronDown className="mt-0.5 size-4 shrink-0 text-muted" />
                          ) : (
                            <ChevronRight className="mt-0.5 size-4 shrink-0 text-muted" />
                          )}
                          <span className="min-w-0 flex-1">
                            <p className={`text-sm font-medium ${faded ? '' : 'text-foreground'}`}>
                              {event.title}
                            </p>
                            <p className="mt-1 text-[11px]">
                              {calendarNameById.get(event.calendarId) ?? 'Unknown calendar'}
                              {' · '}
                              Year {event.start.year ?? '—'}, Month{' '}
                              {event.start.month !== null ? event.start.month + 1 : '—'}, Day{' '}
                              {event.start.day ?? '—'}
                            </p>
                          </span>
                        </button>
                        <div
                          className={`grid transition-[grid-template-rows] duration-300 ease-out ${
                            expanded ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'
                          }`}
                        >
                          <div className="overflow-hidden">
                            <div className="border-t border-border px-4 pb-4">
                              {baseEvent ? (
                                <ChronologyEventInlineDetail
                                  campaignHandle={campaignHandle}
                                  baseEvent={baseEvent}
                                  calendarName={
                                    calendarNameById.get(event.calendarId) ?? undefined
                                  }
                                  showConditions
                                  canManage={canManage}
                                  categories={categories}
                                  editableEvents={baseEvents}
                                  calendarLike={
                                    calendarLikeById.get(event.calendarId) ?? masterCalendarLike
                                  }
                                  dateSeed={{
                                    year: event.start.year,
                                    month: event.start.month,
                                    day: event.start.day,
                                  }}
                                  onMutated={onEventMutated}
                                  onDeleted={() => {
                                    setExpandedOccurrenceId(null);
                                    onEventDeleted?.();
                                  }}
                                />
                              ) : (
                                <p className="pt-3 text-xs text-muted">Event details unavailable.</p>
                              )}
                            </div>
                          </div>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </section>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
