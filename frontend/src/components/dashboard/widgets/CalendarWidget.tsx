import { META_SECTION_LABEL_CLASS, TYPE_DISPLAY_CLASS } from '@/lib/surfaceLayout';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  CalendarDays,
  ChevronDown,
  Clock,
  Loader2,
  Newspaper,
  Pencil,
  Plus,
  ScrollText,
  Trash2,
} from 'lucide-react';
import { DashboardWidgetShell } from '../DashboardWidgetShell';
import type { TimeAdvanceUnit } from '@shared/timeAdvanceUnits';
import {
  advanceCampaignTime,
  fetchTimeTracking,
  masterCalendarFromBundle,
  type FantasyCalendarApiRow,
  type TimeTrackingBundle,
} from '@/lib/timeTrackingApi';
import { dispatchPluginDomainEvent } from '@/lib/pluginDomainEvents';
import { parseSessionDurationToMinutes } from '@/lib/parseSessionDuration';
import {
  createCalendarEvent,
  deleteCalendarEvent,
  listCalendarEvents,
  updateCalendarEvent,
  type CalendarEventRecord,
} from '@/lib/calendarEventsApi';
import { CalendarMonthGrid } from '@/components/chronology/CalendarMonthGrid';
import {
  buildCalendarMonthViewport,
  type FantasyCalendarLike,
} from '@/lib/timeEngine';

interface CalendarWidgetProps {
  campaignHandle: string;
  canManageTime: boolean;
  sessionDuration: string | null | undefined;
  initialViewMode?: WidgetViewMode;
  customizeMode?: boolean;
  onHide?: () => void;
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

function pad2(n: number): string {
  return n < 10 ? `0${n}` : String(n);
}

type WidgetViewMode = 'grid' | 'chronicle';

export function CalendarWidget({
  campaignHandle,
  canManageTime,
  sessionDuration,
  initialViewMode = 'grid',
  customizeMode,
  onHide,
}: CalendarWidgetProps) {
  const [data, setData] = useState<TimeTrackingBundle | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [advancing, setAdvancing] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<WidgetViewMode>(initialViewMode);
  const [events, setEvents] = useState<CalendarEventRecord[]>([]);
  const [eventsLoading, setEventsLoading] = useState(false);
  const [agendaOpen, setAgendaOpen] = useState(true);
  const [quickTitle, setQuickTitle] = useState('');
  const [quickRecurring, setQuickRecurring] = useState(false);
  const [quickAdding, setQuickAdding] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setViewMode(initialViewMode);
  }, [initialViewMode]);

  const load = useCallback(async () => {
    if (!campaignHandle) return;
    setLoading(true);
    setError(null);
    try {
      const bundle = await fetchTimeTracking(campaignHandle);
      setData(bundle);
      setSelectedId((prev) => {
        if (prev && bundle.calendars.some((c) => c.id === prev)) return prev;
        return bundle.calendars[0]?.id ?? null;
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load chronology');
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [campaignHandle]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (!menuOpen) return;
    function handlePointerDown(event: MouseEvent) {
      const el = menuRef.current;
      if (el && !el.contains(event.target as Node)) {
        setMenuOpen(false);
      }
    }
    document.addEventListener('mousedown', handlePointerDown);
    return () => document.removeEventListener('mousedown', handlePointerDown);
  }, [menuOpen]);

  const selected = useMemo(
    () => data?.calendars.find((c) => c.id === selectedId) ?? data?.calendars[0] ?? null,
    [data, selectedId],
  );

  const epochMinute = useMemo(() => {
    if (!data?.currentEpochMinute) return 0n;
    try {
      return BigInt(data.currentEpochMinute);
    } catch {
      return 0n;
    }
  }, [data?.currentEpochMinute]);

  const viewport = useMemo(() => {
    if (!selected) return null;
    return buildCalendarMonthViewport(epochMinute, calendarRowToLike(selected));
  }, [selected, epochMinute]);

  const sessionBlockMinutes = useMemo(
    () => parseSessionDurationToMinutes(sessionDuration),
    [sessionDuration],
  );

  const loadEvents = useCallback(async () => {
    if (!campaignHandle || !selectedId) {
      setEvents([]);
      return;
    }
    setEventsLoading(true);
    try {
      const rows = await listCalendarEvents(campaignHandle, selectedId);
      setEvents(rows);
    } catch (err) {
      window.alert(err instanceof Error ? err.message : 'Failed to load calendar events');
      setEvents([]);
    } finally {
      setEventsLoading(false);
    }
  }, [campaignHandle, selectedId]);

  useEffect(() => {
    void loadEvents();
  }, [loadEvents]);

  const hasMasterCalendar = useMemo(
    () => masterCalendarFromBundle(data) != null,
    [data],
  );

  const handleAdvance = async (key: string, amount: number, unit: TimeAdvanceUnit) => {
    setAdvancing(key);
    try {
      const res = await advanceCampaignTime(campaignHandle, amount, unit);
      setData({
        currentEpochMinute: res.currentEpochMinute,
        calendars: res.calendars,
      });
      dispatchPluginDomainEvent({
        type: 'core:calendar:advanced',
        campaignHandle,
        payload: { amount, unit },
      });
      setSelectedId((prev) => {
        if (prev && res.calendars.some((c) => c.id === prev)) return prev;
        return res.calendars[0]?.id ?? null;
      });
    } catch (err) {
      window.alert(err instanceof Error ? err.message : 'Failed to advance time');
    } finally {
      setAdvancing(null);
    }
  };

  const state = selected?.state;
  const monthEvents = useMemo(() => {
    if (!state) return [];
    return events
      .filter((event) => event.targetMonth === state.monthIndex)
      .filter((event) => {
        if (event.isRecurring) return true;
        if (event.targetYear === null) return true;
        return event.targetYear === state.year;
      })
      .sort((a, b) => (a.targetDay ?? 0) - (b.targetDay ?? 0));
  }, [events, state]);

  const chronicleEvents = useMemo(() => {
    return [...events].sort((a, b) => {
      const aEpoch = a.targetEpochMinute ? BigInt(a.targetEpochMinute) : null;
      const bEpoch = b.targetEpochMinute ? BigInt(b.targetEpochMinute) : null;
      if (aEpoch !== null && bEpoch !== null && aEpoch !== bEpoch) {
        return aEpoch < bEpoch ? -1 : 1;
      }
      if (aEpoch !== null && bEpoch === null) return -1;
      if (aEpoch === null && bEpoch !== null) return 1;
      const aYear = a.targetYear ?? Number.MAX_SAFE_INTEGER;
      const bYear = b.targetYear ?? Number.MAX_SAFE_INTEGER;
      if (aYear !== bYear) return aYear - bYear;
      const aMonth = a.targetMonth ?? Number.MAX_SAFE_INTEGER;
      const bMonth = b.targetMonth ?? Number.MAX_SAFE_INTEGER;
      if (aMonth !== bMonth) return aMonth - bMonth;
      const aDay = a.targetDay ?? Number.MAX_SAFE_INTEGER;
      const bDay = b.targetDay ?? Number.MAX_SAFE_INTEGER;
      return aDay - bDay;
    });
  }, [events]);

  const chronicleByYear = useMemo(() => {
    const groups = new Map<string, CalendarEventRecord[]>();
    for (const event of chronicleEvents) {
      const label =
        event.targetYear !== null
          ? `Year ${event.targetYear}`
          : event.targetEpochMinute !== null
            ? `Epoch ${event.targetEpochMinute}`
            : 'Undated Chronicle';
      const existing = groups.get(label) ?? [];
      existing.push(event);
      groups.set(label, existing);
    }
    return Array.from(groups.entries());
  }, [chronicleEvents]);

  const recurrencePreviewRows = useMemo(() => {
    return chronicleEvents.flatMap((event) => projectRecurrencePlaceholders(event));
  }, [chronicleEvents]);

  const handleQuickAdd = async () => {
    if (!campaignHandle || !selectedId || !state || !quickTitle.trim()) return;
    setQuickAdding(true);
    try {
      const created = await createCalendarEvent(campaignHandle, selectedId, {
        title: quickTitle.trim(),
        isRecurring: quickRecurring,
        description: '',
        targetYear: quickRecurring ? null : state.year,
        targetMonth: state.monthIndex,
        targetDay: state.day,
        recurrenceRule: quickRecurring ? { type: 'annual' } : null,
      });
      setEvents((prev) => [...prev, created]);
      setQuickTitle('');
      setQuickRecurring(false);
      setAgendaOpen(true);
    } catch (err) {
      window.alert(err instanceof Error ? err.message : 'Failed to create event');
    } finally {
      setQuickAdding(false);
    }
  };

  const handleDeleteEvent = async (eventId: string) => {
    if (!campaignHandle || !selectedId) return;
    if (!window.confirm('Delete this event?')) return;
    try {
      await deleteCalendarEvent(campaignHandle, selectedId, eventId);
      setEvents((prev) => prev.filter((event) => event.id !== eventId));
    } catch (err) {
      window.alert(err instanceof Error ? err.message : 'Failed to delete event');
    }
  };

  const handleEditEvent = async (event: CalendarEventRecord) => {
    if (!campaignHandle || !selectedId) return;
    const nextTitle = window.prompt('Edit event title:', event.title);
    if (nextTitle === null) return;
    try {
      const updated = await updateCalendarEvent(campaignHandle, selectedId, event.id, {
        title: nextTitle.trim() || event.title,
      });
      setEvents((prev) => prev.map((row) => (row.id === event.id ? updated : row)));
    } catch (err) {
      window.alert(err instanceof Error ? err.message : 'Failed to update event');
    }
  };

  return (
    <DashboardWidgetShell
      title="Chronology"
      icon={<CalendarDays className="size-4 text-primary" />}
      customizeMode={customizeMode}
      onHide={onHide}
    >
      <div className="flex min-h-0 flex-1 flex-col gap-3">
        {loading && (
          <div className="flex flex-1 items-center justify-center gap-2 text-sm text-muted">
            <Loader2 className="size-4 animate-spin" />
            Loading calendars…
          </div>
        )}

        {!loading && error && (
          <p className="rounded-lg border border-red-900/50 bg-red-950/30 px-3 py-2 text-sm text-red-200">
            {error}
          </p>
        )}

        {!loading && !error && data && data.calendars.length === 0 && (
          <p className="text-sm text-muted">
            No fantasy calendars are configured for this campaign yet. Add calendars in the database
            to see multi-timeline chronology here.
          </p>
        )}

        {!loading && !error && data && selected && viewport && state && (
          <>
            <div className="relative" ref={menuRef}>
              <button
                type="button"
                id="chronology-calendar-trigger"
                aria-haspopup="listbox"
                aria-expanded={menuOpen}
                aria-controls="chronology-calendar-listbox"
                onClick={() => setMenuOpen((o) => !o)}
                className="flex w-full items-center justify-between gap-2 rounded-lg border border-border bg-background px-3 py-2 text-left text-sm text-foreground hover:border-border"
              >
                <span className="truncate font-medium">{selected.name}</span>
                <ChevronDown
                  className={`size-4 shrink-0 text-muted transition-transform ${menuOpen ? 'rotate-180' : ''}`}
                />
              </button>

              {menuOpen && data.calendars.length > 0 && (
                <ul
                  id="chronology-calendar-listbox"
                  role="listbox"
                  aria-labelledby="chronology-calendar-trigger"
                  className="absolute left-0 right-0 top-full z-20 mt-1 max-h-48 overflow-auto rounded-lg border border-border bg-background py-1 shadow-xl"
                >
                  {data.calendars.map((cal) => (
                    <li key={cal.id} role="presentation">
                      <button
                        type="button"
                        role="option"
                        aria-selected={cal.id === selected.id}
                        className={`flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-elevated ${
                          cal.id === selected.id ? 'bg-elevated/80 text-primary' : 'text-foreground'
                        }`}
                        onClick={() => {
                          setSelectedId(cal.id);
                          setMenuOpen(false);
                        }}
                      >
                        {cal.name}
                        {cal.isMasterTime && (
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

            <div className="inline-flex rounded-lg border border-border bg-background p-1 text-xs">
              <button
                type="button"
                onClick={() => setViewMode('grid')}
                className={`inline-flex items-center gap-1 rounded px-2 py-1 ${
                  viewMode === 'grid'
                    ? 'bg-primary text-background'
                    : 'text-foreground hover:bg-elevated'
                }`}
              >
                <CalendarDays className="size-3.5" /> Grid View
              </button>
              <button
                type="button"
                onClick={() => setViewMode('chronicle')}
                className={`inline-flex items-center gap-1 rounded px-2 py-1 ${
                  viewMode === 'chronicle'
                    ? 'bg-primary text-background'
                    : 'text-foreground hover:bg-elevated'
                }`}
              >
                <ScrollText className="size-3.5" /> Chronicle Timeline View
              </button>
            </div>

            <div className="rounded-lg border border-border bg-background/80 px-3 py-2 text-sm text-foreground">
              <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
                <span className={TYPE_DISPLAY_CLASS}>
                  Year {state.year}
                </span>
                <span className="text-muted">·</span>
                <span>
                  {state.monthName} {state.day}
                  {state.isIntercalary && (
                    <span className="ml-2 rounded bg-primary/15/40 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-primary">
                      festival
                    </span>
                  )}
                </span>
                <span className="text-muted">·</span>
                <span className="inline-flex items-center gap-1 text-foreground">
                  <Clock className="size-3.5 text-muted" />
                  {pad2(state.hour)}:{pad2(state.minute)}
                </span>
              </div>
              {state.weekdayName ? (
                <p className="mt-1 text-xs text-muted">Weekday: {state.weekdayName}</p>
              ) : state.isIntercalary ? (
                <p className="mt-1 text-xs text-muted">
                  Intercalary day — weekday cycle does not apply.
                </p>
              ) : null}
              {state.seasonName ? (
                <p className="mt-1 text-xs text-muted">Season: {state.seasonName}</p>
              ) : null}
              {state.activeMoonPhases.length > 0 && (
                <ul className="mt-2 space-y-0.5 border-t border-border pt-2 text-xs text-muted">
                  {state.activeMoonPhases.map((moon) => (
                    <li key={moon.name}>
                      <span className="text-foreground">{moon.name}</span>
                      {' — '}
                      <span className="capitalize text-muted">{moon.phase}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className="grid min-h-0 flex-1 gap-3 lg:grid-cols-[minmax(0,1fr)_260px]">
              <div className="min-h-0 overflow-auto">
                {viewMode === 'grid' ? (
                  <CalendarMonthGrid
                    columnLabels={viewport.columnLabels}
                    monthTitle={viewport.monthTitle}
                    climateAspect={viewport.climateAspect}
                    rows={viewport.rows}
                    isIntercalaryMonth={viewport.isIntercalaryMonth}
                  />
                ) : (
                  <div className="space-y-3">
                    {chronicleByYear.length === 0 ? (
                      <p className="text-sm text-muted">No chronicle events yet.</p>
                    ) : (
                      chronicleByYear.map(([yearLabel, items]) => (
                        <section key={yearLabel} className="rounded-lg border border-border bg-background/40 p-3">
                          <h4 className={META_SECTION_LABEL_CLASS}>
                            {yearLabel}
                          </h4>
                          <ul className="mt-2 space-y-2">
                            {items.map((event) => (
                              <li key={event.id} className="border-l-2 border-primary/50 pl-3">
                                <p className="text-sm font-medium text-foreground">{event.title}</p>
                                <p className="text-[11px] text-muted">
                                  {event.targetMonth !== null ? `Month ${event.targetMonth + 1}` : '—'}
                                  {event.targetDay !== null ? `, Day ${event.targetDay}` : ''}
                                  {event.isRecurring ? ' · recurring' : ''}
                                </p>
                                {event.description && (
                                  <p className="text-xs text-muted">{event.description}</p>
                                )}
                              </li>
                            ))}
                          </ul>
                        </section>
                      ))
                    )}
                    {recurrencePreviewRows.length > 0 && (
                      <section className="rounded-lg border border-dashed border-border bg-background/20 p-3">
                        <h4 className={META_SECTION_LABEL_CLASS}>
                          Projected Recurrence Preview
                        </h4>
                        <ul className="mt-2 space-y-2">
                          {recurrencePreviewRows.map((row) => (
                            <li key={row.key} className="italic text-xs text-muted">
                              {row.label}
                            </li>
                          ))}
                        </ul>
                      </section>
                    )}
                  </div>
                )}
              </div>

              <aside className="min-h-0 overflow-auto rounded-lg border border-border bg-background/40 p-3">
                <button
                  type="button"
                  onClick={() => setAgendaOpen((v) => !v)}
                  className="flex w-full items-center justify-between text-left"
                >
                  <span className="inline-flex items-center gap-1 META_SECTION_LABEL_CLASS">
                    <Newspaper className="size-3.5 text-primary" /> Agenda
                  </span>
                  <ChevronDown
                    className={`size-4 text-muted transition-transform ${agendaOpen ? 'rotate-180' : ''}`}
                  />
                </button>
                {agendaOpen && (
                  <div className="mt-3 space-y-3">
                    {eventsLoading ? (
                      <p className="text-xs text-muted">Loading events…</p>
                    ) : monthEvents.length === 0 ? (
                      <p className="text-xs text-muted">No events scheduled for this month.</p>
                    ) : (
                      <ul className="space-y-2">
                        {monthEvents.map((event) => (
                          <li key={event.id} className="rounded border border-border bg-surface/50 p-2">
                            <div className="flex items-start justify-between gap-2">
                              <p className="text-xs font-semibold text-foreground">{event.title}</p>
                              {canManageTime && (
                                <div className="inline-flex items-center gap-1">
                                  <button
                                    type="button"
                                    onClick={() => void handleEditEvent(event)}
                                    className="rounded p-1 text-muted hover:bg-elevated hover:text-primary"
                                    title="Edit event"
                                  >
                                    <Pencil className="size-3.5" />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => void handleDeleteEvent(event.id)}
                                    className="rounded p-1 text-muted hover:bg-elevated hover:text-red-300"
                                    title="Delete event"
                                  >
                                    <Trash2 className="size-3.5" />
                                  </button>
                                </div>
                              )}
                            </div>
                            <p className="text-[11px] text-muted">
                              Day {event.targetDay ?? '?'}
                              {event.isRecurring ? ' · annual recurring' : ''}
                            </p>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                )}
                {canManageTime && (
                  <div className="mt-3 border-t border-border pt-3">
                    <p className={`mb-2 ${META_SECTION_LABEL_CLASS}`}>
                      Quick-add event
                    </p>
                    <input
                      type="text"
                      value={quickTitle}
                      onChange={(e) => setQuickTitle(e.target.value)}
                      placeholder="Event title (birthday, treaty...)"
                      className="w-full rounded border border-border bg-surface px-2 py-1 text-xs text-foreground"
                    />
                    <label className="mt-2 flex items-center gap-2 text-xs text-muted">
                      <input
                        type="checkbox"
                        checked={quickRecurring}
                        onChange={(e) => setQuickRecurring(e.target.checked)}
                      />
                      Recurs annually
                    </label>
                    <button
                      type="button"
                      onClick={() => void handleQuickAdd()}
                      disabled={quickAdding || !quickTitle.trim()}
                      className="mt-2 inline-flex w-full items-center justify-center gap-1 rounded border border-primary/60 bg-primary/10/40 px-2 py-1 text-xs text-primary disabled:opacity-50"
                    >
                      {quickAdding ? <Loader2 className="size-3.5 animate-spin" /> : <Plus className="size-3.5" />}
                      Add to current month
                    </button>
                  </div>
                )}
              </aside>
            </div>
          </>
        )}
      </div>

      {canManageTime && !loading && !error && data && data.calendars.length > 0 && (
        <div className="mt-auto border-t border-border pt-3">
          <p className={`mb-2 ${META_SECTION_LABEL_CLASS}`}>
            DM time controls
          </p>
          <div className="flex flex-wrap gap-2">
            <AdvanceButton
              label="+1 Hour"
              busyKey="hour"
              advancing={advancing}
              onClick={() => void handleAdvance('hour', 1, 'hours')}
            />
            <AdvanceButton
              label="+1 Day"
              busyKey="day"
              advancing={advancing}
              onClick={() => void handleAdvance('day', 1, 'days')}
            />
            <AdvanceButton
              label="+1 Week"
              busyKey="week"
              advancing={advancing}
              onClick={() => void handleAdvance('week', 1, 'weeks')}
            />
            <AdvanceButton
              label="+1 Month"
              busyKey="month"
              advancing={advancing}
              disabled={!hasMasterCalendar}
              title={
                hasMasterCalendar
                  ? 'Advance one calendar month'
                  : 'Requires a master fantasy calendar'
              }
              onClick={() => void handleAdvance('month', 1, 'months')}
            />
            <AdvanceButton
              label="Next session"
              busyKey="session"
              advancing={advancing}
              title={`Advance by ~${sessionBlockMinutes} minutes (from campaign session duration)`}
              onClick={() =>
                void handleAdvance('session', sessionBlockMinutes, 'minutes')
              }
            />
          </div>
        </div>
      )}
    </DashboardWidgetShell>
  );
}

function projectRecurrencePlaceholders(
  event: CalendarEventRecord,
): Array<{ key: string; label: string }> {
  if (!event.isRecurring) return [];

  const rule =
    event.recurrenceRule && typeof event.recurrenceRule === 'object'
      ? (event.recurrenceRule as Record<string, unknown>)
      : {};

  const baseYear = event.targetYear ?? 1;
  const month = event.targetMonth ?? 0;
  const day = event.targetDay ?? 1;
  const type = typeof rule.type === 'string' ? rule.type : 'annual';

  const previews: Array<{ key: string; label: string }> = [];
  if (type === 'monthly') {
    for (let i = 1; i <= 4; i += 1) {
      previews.push({
        key: `${event.id}-monthly-${i}`,
        label: `Month ${(month + 1) + i}, Day ${day}: ${event.title} (monthly recurrence preview)`,
      });
    }
    return previews;
  }

  if (type === 'moon_alignment') {
    const moonNames = Array.isArray(rule.moons) ? rule.moons.join(', ') : 'configured moons';
    const phase = typeof rule.phase === 'string' ? rule.phase : 'alignment';
    for (let i = 1; i <= 3; i += 1) {
      previews.push({
        key: `${event.id}-moon-${i}`,
        label: `Year ${baseYear + i}: ${event.title} (projected ${phase} alignment for ${moonNames})`,
      });
    }
    return previews;
  }

  for (let i = 1; i <= 3; i += 1) {
    previews.push({
      key: `${event.id}-annual-${i}`,
      label: `Year ${baseYear + i}, Month ${month + 1}, Day ${day}: ${event.title} (annual recurrence preview)`,
    });
  }
  return previews;
}

function AdvanceButton({
  label,
  busyKey,
  advancing,
  onClick,
  title,
  disabled = false,
}: {
  label: string;
  busyKey: string;
  advancing: string | null;
  onClick: () => void;
  title?: string;
  disabled?: boolean;
}) {
  const busy = advancing === busyKey;
  return (
    <button
      type="button"
      title={title}
      disabled={disabled || advancing !== null}
      onClick={onClick}
      className="rounded-lg border border-border bg-surface px-3 py-1.5 text-xs font-medium text-foreground hover:border-primary/60 hover:text-primary disabled:opacity-50"
    >
      {busy ? (
        <span className="inline-flex items-center gap-1">
          <Loader2 className="size-3.5 animate-spin" />
          …
        </span>
      ) : (
        label
      )}
    </button>
  );
}
