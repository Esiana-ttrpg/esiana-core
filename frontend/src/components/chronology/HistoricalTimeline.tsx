import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { useSearchParams } from 'react-router-dom';
import { ChronologyEventSidebar } from './ChronologyEventSidebar';
import { ChronologyInspector } from './ChronologyInspector';
import { FantasyDatePicker } from './FantasyDatePicker';
import { calendarRowToLike } from '@/lib/chronologyCalendar';
import type { ChronologyTimelineBundle } from '@/lib/chronologyApi';
import type { TimeTrackingBundle } from '@/lib/timeTrackingApi';
import type { ChronologyDateParts } from '@/lib/chronologyDates';
import { campaignChronologyPath } from '@/lib/campaignPaths';
import {
  createHistoricalAxis, dayX, fitTimeline, historicalCoverage, historicalEraGeometry,
  historicalTicks, initialHistoricalViewport, moveViewport, normalizeHistoricalOccurrences,
  packHistoricalIntervals, viewportDay, zoomViewport,
  type HistoricalInterval, type TimelineViewport,
} from '@/lib/historicalTimeline';

const control = 'min-h-11 rounded border border-border bg-background px-3 py-2 text-xs';
const dateParts = (state: { year: number; monthIndex: number; day: number }) =>
  ({ year: state.year, month: state.monthIndex, day: state.day });

interface HistoricalTimelineProps {
  campaignHandle: string;
  bundle: ChronologyTimelineBundle;
  timeBundle: TimeTrackingBundle;
  canManage: boolean;
  onBrowseAnchorChange: (date: ChronologyDateParts, calendarId?: string) => void;
  onMutated: () => void | Promise<void>;
  onDeleted: () => void | Promise<void>;
  onRevealEvent: (id: string) => void | Promise<void>;
  categoryFooter?: ReactNode;
}

export function HistoricalTimeline({ campaignHandle, bundle, timeBundle, canManage, onBrowseAnchorChange,
  onMutated, onDeleted, onRevealEvent, categoryFooter }: HistoricalTimelineProps) {
  const [params, setParams] = useSearchParams();
  const calendar = timeBundle.calendars.find(row => row.id === params.get('track')) ??
    timeBundle.calendars.find(row => row.isMasterTime) ?? timeBundle.calendars[0];
  if (!calendar) return <p className="p-4 text-sm text-muted">No fantasy calendars configured for this campaign.</p>;
  return <HistoricalClockTimeline {...{ campaignHandle, bundle, timeBundle, canManage, onBrowseAnchorChange,
    onMutated, onDeleted, onRevealEvent, categoryFooter }} calendarId={calendar.id}
    onClockChange={id => { const next = new URLSearchParams(params); next.set('track', id); next.delete('era'); setParams(next); }} />;
}

function HistoricalClockTimeline({ campaignHandle, bundle, timeBundle, canManage, onBrowseAnchorChange,
  onMutated, onDeleted, onRevealEvent, categoryFooter, calendarId, onClockChange }: HistoricalTimelineProps & {
    calendarId: string; onClockChange: (id: string) => void;
  }) {
  const calendar = timeBundle.calendars.find(row => row.id === calendarId)!;
  const axis = useMemo(() => createHistoricalAxis(calendarRowToLike(calendar)),
    [calendar.id, calendar.epochOffset, calendar.months, calendar.leapDays, calendar.weekdays, calendar.seasons, calendar.moons]);
  const eras = useMemo(() => (bundle.eras ?? []).filter(era => era.calendarId === calendarId), [bundle.eras, calendarId]);
  const intervals = useMemo(() => normalizeHistoricalOccurrences(bundle.occurrences.filter(row => row.calendarId === calendarId), axis),
    [bundle.occurrences, calendarId, axis]);
  const [importance, setImportance] = useState({ MAJOR: true, MINOR: true, NOTICE: false });
  const [category, setCategory] = useState('all');
  const [showEras, setShowEras] = useState(true);
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [clusterKeys, setClusterKeys] = useState<string[] | null>(null);
  const [focusedEraId, setFocusedEraId] = useState<string | null>(null);
  const [jumpDate, setJumpDate] = useState<ChronologyDateParts>({ year: calendar.state?.year ?? 1, month: 0, day: 1 });
  const [views, setViews] = useState<Record<string, TimelineViewport>>({});
  const filtered = useMemo(() => intervals.filter(row => importance[row.representative.importance] &&
    (category === 'all' || (row.representative.categoryId ?? 'uncategorized') === category)), [intervals, category, importance]);
  const initial = useMemo(() => initialHistoricalViewport(axis, calendar.state ? dateParts(calendar.state) : null, filtered, eras), [axis, calendar.state, filtered, eras]);
  const view = views[calendarId] ?? initial;
  const viewRef = useRef(view);
  const frame = useRef<number | null>(null);
  const pending = useRef<TimelineViewport | null>(null);
  useEffect(() => {
    if (pending.current === null) viewRef.current = view;
  }, [view]);
  const updateView = useCallback((next: TimelineViewport) => {
    viewRef.current = next;
    pending.current = next;
    if (frame.current != null) return;
    frame.current = requestAnimationFrame(() => {
      frame.current = null;
      const next = pending.current;
      if (next) setViews(previous => ({ ...previous, [calendarId]: next }));
      pending.current = null;
    });
  }, [calendarId]);
  useEffect(() => {
    setViews(previous => previous[calendarId] ? previous : { ...previous, [calendarId]: initial });
    setSelectedKey(null); setClusterKeys(null); setFocusedEraId(null);
    return () => {
      if (frame.current != null) cancelAnimationFrame(frame.current);
      frame.current = null; pending.current = null;
    };
    // Initialize each mounted clock once, independent of filters and background refreshes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [calendarId]);
  const workspace = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(900);
  const [workspaceHeight, setWorkspaceHeight] = useState(320);
  useEffect(() => {
    const element = workspace.current!;
    const observer = new ResizeObserver(entries => {
      setWidth(Math.max(1, entries[0]!.contentRect.width));
      setWorkspaceHeight(entries[0]!.contentRect.height);
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, []);
  useEffect(() => {
    onBrowseAnchorChange(dateParts(axis.state(viewportDay(view, .5))), calendarId);
  }, [axis, view.origin, view.offset, view.span, calendarId, onBrowseAnchorChange]);
  const layout = useMemo(() => packHistoricalIntervals(filtered, view, width), [filtered, view, width]);
  const ticks = useMemo(() => historicalTicks(axis, view, width), [axis, view, width]);
  const eraBands = useMemo(() => eras.map(era => historicalEraGeometry(era, axis, view, width)).filter(band => band.width > 0), [eras, axis, view, width]);
  const coverage = historicalCoverage(bundle.expansionMetadata);
  const label = (day: bigint) => { const state = axis.state(day); return `${state.monthName} ${state.day}, Year ${state.year}`; };
  const intervalLabel = (row: HistoricalInterval) => `${row.representative.title} · ${label(row.start)} — ${label(row.end - 1n)} · ${row.representative.importance.toLowerCase()} · ${row.end - row.start} day(s)`;
  const selected = intervals.find(row => row.key === selectedKey);
  const selectedBase = selected ? bundle.baseEvents.find(row => row.id === selected.baseEventId) ?? null : null;
  const clusterMembers = clusterKeys ? intervals.filter(row => clusterKeys.includes(row.key)) : [];
  const focusedEra = eras.find(era => era.id === focusedEraId);
  const select = (row: HistoricalInterval) => { setClusterKeys(null); setSelectedKey(row.key); };
  const fit = (rows: HistoricalInterval[]) => {
    if (!rows.length) return;
    updateView(fitTimeline(rows.reduce((min, row) => row.start < min ? row.start : min, rows[0]!.start),
      rows.reduce((max, row) => row.end > max ? row.end : max, rows[0]!.end)));
  };
  const focusEra = (id: string) => {
    const era = eras.find(row => row.id === id);
    if (!era) return;
    setFocusedEraId(id);
    const start = era.startDate ? axis.date(era.startDate) : null;
    const end = era.endDate ? axis.date(era.endDate) : null;
    if (start != null && end != null) updateView(fitTimeline(start, end + 1n));
    else if (start != null || end != null) updateView(moveViewport({ ...view, origin: start ?? end!, offset: 0 }, -view.span / 2));
  };
  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const drag = useRef<{ x: number; y: number; view: TimelineViewport; distance?: number } | null>(null);
  const moved = useRef(false);
  const canvasRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const element = canvasRef.current!;
    const wheel = (event: WheelEvent) => {
      if (event.ctrlKey || event.metaKey) {
        event.preventDefault();
        const anchor = (event.clientX - element.getBoundingClientRect().left) / element.clientWidth;
        updateView(zoomViewport(viewRef.current, Math.exp(event.deltaY * .005), anchor));
      } else if (Math.abs(event.deltaX) > Math.abs(event.deltaY) || event.shiftKey) {
        event.preventDefault();
        updateView(moveViewport(viewRef.current, (event.deltaX || event.deltaY) / element.clientWidth * viewRef.current.span));
      }
    };
    element.addEventListener('wheel', wheel, { passive: false });
    return () => element.removeEventListener('wheel', wheel);
  }, [updateView]);
  const height = Math.max(320, workspaceHeight - (showEras ? 80 : 36), layout.laneCount * 48 + 32);
  const nowDay = calendar.state ? axis.date(dateParts(calendar.state)) : null;
  const currentEra = eras.find(era => era.isCurrent);
  const eraHref = `${campaignChronologyPath(campaignHandle)}?view=eras&track=${encodeURIComponent(calendarId)}`;
  return (
    <div className="relative flex h-full min-h-0 flex-col" data-historical-timeline>
      <div className="relative flex shrink-0 flex-wrap items-center gap-2 border-b border-border/40 p-2">
        <label className="text-xs">Clock <select className={control} value={calendarId} onChange={event => onClockChange(event.target.value)}>
          {timeBundle.calendars.map(row => <option key={row.id} value={row.id}>{row.name}</option>)}
        </select></label>
        <button className={control} aria-label="Zoom in" onClick={() => updateView(zoomViewport(view, .5))}>+</button>
        <button className={control} aria-label="Zoom out" onClick={() => updateView(zoomViewport(view, 2))}>−</button>
        <button className={control} disabled={!filtered.length} onClick={() => fit(filtered)}>{coverage.label}</button>
        <button className={control} disabled={nowDay == null} onClick={() => nowDay != null && updateView(moveViewport({ ...view, origin: nowDay, offset: 0 }, -view.span / 2))}>Today</button>
        <details>
          <summary className={`${control} cursor-pointer`}>Navigation & filters</summary>
          <div className="absolute right-2 top-full z-30 mt-1 max-h-[65dvh] w-[min(320px,85vw)] max-w-[calc(100%_-_1rem)] space-y-3 overflow-y-auto rounded border border-border bg-background p-3 shadow-xl">
            <div className="flex flex-wrap gap-2" aria-label="Importance filters">
              {(['MAJOR', 'MINOR', 'NOTICE'] as const).map(value => <button key={value} className={control} aria-pressed={importance[value]}
                onClick={() => setImportance(previous => ({ ...previous, [value]: !previous[value] }))}>{value[0] + value.slice(1).toLowerCase()}</button>)}
            </div>
            <label className="block text-xs">Category <select className={control} value={category} onChange={event => setCategory(event.target.value)}>
              <option value="all">All categories</option><option value="uncategorized">Uncategorized</option>
              {bundle.categories.map(row => <option key={row.id} value={row.id}>{row.name}</option>)}
            </select></label>
            <label className="block text-xs"><input type="checkbox" checked={showEras} onChange={event => setShowEras(event.target.checked)} /> Show era bands</label>
            <label className="block text-xs">Jump to era <select className={control} value={focusedEraId ?? ''} onChange={event => focusEra(event.target.value)}>
              <option value="">Choose era</option>{eras.map(era => <option key={era.id} value={era.id}>{era.name}</option>)}
            </select></label>
            <FantasyDatePicker calendar={axis.calendar} value={jumpDate} onChange={setJumpDate} />
            <button className={control} onClick={() => { const day = axis.date(jumpDate); if (day != null) updateView(moveViewport({ ...view, origin: day, offset: 0 }, -view.span / 2)); }}>Jump to date</button>
            <a className="block text-xs underline" href={eraHref}>Open Eras workspace</a>
            {categoryFooter}
          </div>
        </details>
      </div>
      <div className="shrink-0 px-3 py-1 text-xs text-muted" aria-live="polite">
        {currentEra?.name && <span>{currentEra.name} · </span>}{label(viewportDay(view))} — {label(viewportDay(view, 1))}
      </div>
      <p role="status" className="shrink-0 px-3 pb-2 text-xs text-muted" title={coverage.warnings.join(', ')}>{coverage.message}</p>
      {focusedEra && <div className="flex shrink-0 items-center gap-2 px-3 pb-2 text-xs">
        <a className="underline" href={`${eraHref}&era=${encodeURIComponent(focusedEra.id)}`}>{focusedEra.name}: read overview</a>
        <button className="p-2" onClick={() => setFocusedEraId(null)} aria-label="Dismiss era focus">×</button>
      </div>}
      <div ref={workspace} className="min-h-0 flex-1 overflow-y-auto">
        <div ref={canvasRef} tabIndex={0} role="region" aria-label="Historical timeline. Arrow keys pan; plus and minus zoom."
          className="relative min-h-full outline-offset-[-2px]" style={{ touchAction: 'pan-y' }}
          onKeyDown={event => {
            if (event.target !== event.currentTarget) return;
            if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') { event.preventDefault(); updateView(moveViewport(view, view.span * (event.key === 'ArrowLeft' ? -.2 : .2))); }
            if (event.key === '+' || event.key === '-') { event.preventDefault(); updateView(zoomViewport(view, event.key === '+' ? .5 : 2)); }
          }}
          onPointerDown={event => {
            if (event.button !== 0) return;
            pointers.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
            const points = [...pointers.current.values()];
            moved.current = false;
            drag.current = { x: event.clientX, y: event.clientY, view: viewRef.current };
            if (points.length === 2) {
              moved.current = true;
              drag.current = { x: (points[0]!.x + points[1]!.x) / 2, y: 0, view: viewRef.current,
                distance: Math.max(1, Math.abs(points[0]!.x - points[1]!.x)) };
            }
          }}
          onPointerMove={event => {
            if (!pointers.current.has(event.pointerId) || !drag.current) return;
            pointers.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
            const points = [...pointers.current.values()], initial = drag.current;
            if (points.length === 2 && initial.distance) {
              moved.current = true;
              const distance = Math.max(1, Math.abs(points[0]!.x - points[1]!.x));
              const center = (points[0]!.x + points[1]!.x) / 2;
              const anchor = (initial.x - event.currentTarget.getBoundingClientRect().left) / width;
              const zoomed = zoomViewport(initial.view, initial.distance / distance, anchor);
              updateView(moveViewport(zoomed, (initial.x - center) / width * zoomed.span));
            } else if (!initial.distance && (moved.current || Math.abs(event.clientX - initial.x) > 6)) {
              if (event.pointerType === 'touch' && Math.abs(event.clientY - initial.y) > Math.abs(event.clientX - initial.x)) return;
              moved.current = true;
              event.currentTarget.setPointerCapture(event.pointerId);
              updateView(moveViewport(initial.view, (initial.x - event.clientX) / width * initial.view.span));
            }
          }}
          onPointerUp={event => { pointers.current.delete(event.pointerId); if (!pointers.current.size) drag.current = null; }}
          onPointerCancel={() => { pointers.current.clear(); drag.current = null; moved.current = true; }}
          onClickCapture={event => { if (moved.current) { event.preventDefault(); event.stopPropagation(); moved.current = false; } }}>
          <div className="sticky top-0 z-10 bg-background" data-timeline-axis>
            <svg width="100%" height={36} aria-hidden="true">
              {ticks.map(tick => <g key={String(tick.day)}><line x1={tick.x} x2={tick.x} y1={24} y2={36} stroke="currentColor" opacity=".3" /><text x={tick.x + 4} y={18} fill="currentColor" fontSize={11}>{tick.label}</text></g>)}
            </svg>
            {showEras && <div className="relative h-11 overflow-hidden border-y border-border/40" aria-label="Era strip">
              {eraBands.map(band => <button key={band.era.id} className="absolute inset-y-0 truncate border-l border-border/40 bg-primary/10 px-2 text-left text-xs"
                style={{ left: band.x, width: band.width }} onClick={() => focusEra(band.era.id)} title={band.era.name}>{band.openStart ? '← ' : ''}{band.era.name}{band.openEnd ? ' →' : ''}</button>)}
            </div>}
          </div>
          <svg width="100%" height={height} className="block" aria-label="Historical events">
            {showEras && eraBands.map((band, index) => <rect key={band.era.id} x={band.x} width={band.width} y={0} height={height} fill="currentColor" opacity={index % 2 ? .025 : .055} pointerEvents="none" />)}
            {ticks.map(tick => <line key={String(tick.day)} x1={tick.x} x2={tick.x} y1={0} y2={height} stroke="currentColor" opacity=".08" />)}
            {nowDay != null && <line x1={dayX(nowDay, view, width)} x2={dayX(nowDay, view, width)} y1={0} y2={height} stroke="currentColor" strokeDasharray="3 4" opacity=".35"><title>Campaign today</title></line>}
            {layout.marks.filter(mark => mark.endX >= 0 && mark.x <= width).map(mark => {
              const row = mark.interval, major = row.representative.importance === 'MAJOR', notice = row.representative.importance === 'NOTICE';
              const x = Math.max(0, mark.x), right = Math.min(width, mark.endX), y = mark.lane * 48 + 22;
              const categoryColor = bundle.categories.find(category => category.id === row.representative.categoryId)?.color;
              const title = row.representative.title;
              const chars = Math.floor(Math.min(124, Math.max(0, width - x - 24)) / 7);
              const shown = title.length > chars ? `${title.slice(0, Math.max(0, chars - 1))}…` : title;
              return <g key={row.key} role="button" tabIndex={0} aria-label={intervalLabel(row)} aria-pressed={selectedKey === row.key}
                data-timeline-event={row.representative.occurrenceId} className="cursor-pointer text-foreground outline-offset-2"
                onClick={() => select(row)} onKeyDown={event => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); select(row); } }}>
                <title>{intervalLabel(row)}</title>
                <rect x={Math.max(0, x - 20)} y={y - 22} width={Math.min(width - Math.max(0, x - 20), Math.max(44, right - x + 40, 140))} height={44} fill="transparent" />
                {row.end - row.start === 1n ? <path d={`M ${x} ${y - (major ? 9 : 6)} l ${major ? 9 : 6} ${major ? 9 : 6} l -${major ? 9 : 6} ${major ? 9 : 6} l -${major ? 9 : 6} -${major ? 9 : 6} Z`} fill="currentColor" opacity={notice ? .4 : .85} /> :
                  <rect x={x} y={y - (major ? 7 : 4)} width={Math.max(.75, right - x)} height={major ? 14 : 8} rx={2} fill="currentColor" opacity={notice ? .3 : .65} stroke={selectedKey === row.key ? 'currentColor' : 'none'} strokeWidth={3} />}
                {categoryColor && <circle cx={x + 3} cy={y + 16} r={2.5} fill={categoryColor} />}
                {chars > 2 && <text x={x + 14} y={y + 4} fontSize={12} fontWeight={major ? 600 : 400} fill="currentColor">{major ? '◆ ' : ''}{shown}</text>}
              </g>;
            })}
            {layout.clusters.map(cluster => <g key={cluster.key} role="button" tabIndex={0} aria-label={`${cluster.members.length} overlapping events; open complete list`}
              className="cursor-pointer" onClick={() => { setSelectedKey(null); setClusterKeys(cluster.members.map(row => row.key)); }}
              onKeyDown={event => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); setSelectedKey(null); setClusterKeys(cluster.members.map(row => row.key)); } }}>
              <rect x={cluster.x} y={11 * 48} width={Math.max(44, cluster.endX - cluster.x)} height={44} rx={4} fill="currentColor" opacity=".12" />
              <text x={cluster.x + 8} y={11 * 48 + 27} fontSize={12} fill="currentColor">+{cluster.members.length}</text>
            </g>)}
            {!layout.marks.length && !layout.clusters.length && <text x={16} y={48} fill="currentColor" fontSize={13}>No loaded events in this range and filter.</text>}
          </svg>
        </div>
      </div>
      {clusterKeys && <ChronologyInspector title={`${clusterMembers.length} overlapping events`} onClose={() => setClusterKeys(null)}>
        <button className={control} onClick={() => { fit(clusterMembers); setClusterKeys(null); }}>Zoom to period</button>
        <ul className="mt-3 space-y-2">{clusterMembers.map(row => <li key={row.key}><button className="w-full rounded p-2 text-left text-sm hover:bg-elevated" onClick={() => select(row)}>{intervalLabel(row)}</button></li>)}</ul>
      </ChronologyInspector>}
      <ChronologyEventSidebar campaignHandle={campaignHandle} baseEvent={selectedBase} categories={bundle.categories}
        editableEvents={bundle.baseEvents} calendarLike={axis.calendar} canManage={canManage} open={!!selectedBase}
        dateSeed={selected ? dateParts(axis.state(selected.start)) : null}
        occurrence={selected ? { ...selected.representative, start: { ...dateParts(axis.state(selected.start)), monthName: axis.state(selected.start).monthName, epochMinute: (axis.calendar.epochOffset + selected.start * 1440n).toString() },
          end: { ...dateParts(axis.state(selected.end - 1n)), monthName: axis.state(selected.end - 1n).monthName, epochMinute: (axis.calendar.epochOffset + (selected.end - 1n) * 1440n).toString() } } : null}
        onClose={() => setSelectedKey(null)} onMutated={onMutated}
        onDeleted={async () => { setSelectedKey(null); await onDeleted(); }} onRevealEvent={onRevealEvent} />
    </div>
  );
}
