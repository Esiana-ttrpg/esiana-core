import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { useSearchParams } from 'react-router-dom';
import { ChronologyEventSidebar } from './ChronologyEventSidebar';
import { ChronologyInspector } from './ChronologyInspector';
import { FantasyDatePicker } from './FantasyDatePicker';
import { HistoricalEraStrip, HistoricalTrack, type ComparisonEraBand } from './HistoricalTrack';
import { comparisonDateLabel, comparisonIntervalLabel, useComparisonText } from './comparisonText';
import type { ChronologyTimelineBundle } from '@/lib/chronologyApi';
import type { TimeTrackingBundle, FantasyCalendarApiRow } from '@/lib/timeTrackingApi';
import type { ChronologyEra } from '@shared/chronologyEras';
import type { ChronologyDateParts } from '@/lib/chronologyDates';
import { campaignChronologyPath } from '@/lib/campaignPaths';
import {
  comparisonEraGeometry, comparisonTicks, fitComparisonIntervals, historicalClock, historicalMinute,
  historicalNativeState, historicalTrackCoverage, initialComparisonViewport, initialHistoricalWorkspace,
  moveComparisonViewport, reconcileHistoricalWorkspace, reorderHistoricalTrack, sharedHistoricalIntervals,
  viewportDay, zoomComparisonViewport, type HistoricalInterval, type TimelineViewport,
} from '@/lib/historicalTimeline';

const control = 'min-h-11 rounded border border-border bg-background px-3 py-2 text-xs';
const dateParts = (state: { year: number; monthIndex: number; day: number }) =>
  ({ year: state.year, month: state.monthIndex, day: state.day });
const emptyBands: ComparisonEraBand[] = [];
const emptyIntervals: HistoricalInterval[] = [];
const emptyEras: ChronologyEra[] = [];

function buildTrack(calendar: ChronologyTimelineBundle['calendars'][number], definition: FantasyCalendarApiRow | undefined,
  rows: ChronologyTimelineBundle['occurrences'], eras: ChronologyEra[], capped: boolean) {
  const clock = definition ? historicalClock(definition) : { axis: null, aligned: false, reason: 'calendarUnavailable' as const };
  return { ...calendar, ...clock, definition, eras,
    intervals: clock.axis ? sharedHistoricalIntervals(rows, clock.axis) : emptyIntervals, capped };
}

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

export function HistoricalTimeline(props: HistoricalTimelineProps) {
  return <HistoricalWorkspace key={props.campaignHandle} {...props} />;
}

function HistoricalWorkspace({ campaignHandle, bundle, timeBundle, canManage, onBrowseAnchorChange,
  onMutated, onDeleted, onRevealEvent, categoryFooter }: HistoricalTimelineProps) {
  const text = useComparisonText();
  const [params] = useSearchParams();
  const trackCache = useRef({ entries: new Map<string, { signature: string; value: ReturnType<typeof buildTrack> }>(), list: [] as ReturnType<typeof buildTrack>[] });
  // The chronology response is the authorized track inventory. Definition data never adds tracks.
  const tracks = useMemo(() => {
    const definitions = new Map(timeBundle.calendars.map(row => [row.id, row]));
    const authorizedBases = new Map(bundle.baseEvents.map(row => [row.id, row.calendarId]));
    const partition = new Map<string, typeof bundle.occurrences>();
    for (const row of bundle.occurrences) {
      if (authorizedBases.get(row.baseEventId) !== row.calendarId) continue;
      const group = partition.get(row.calendarId) ?? [];
      group.push(row); partition.set(row.calendarId, group);
    }
    const nextTracks = bundle.calendars.map(calendar => {
      const definition = definitions.get(calendar.id);
      const eras = (bundle.eras ?? []).filter(era => era.calendarId === calendar.id);
      const rows = partition.get(calendar.id) ?? [];
      const capped = historicalTrackCoverage(bundle, calendar.id);
      const signature = JSON.stringify([calendar, definition, rows, eras, capped]);
      const cached = trackCache.current.entries.get(calendar.id);
      if (cached?.signature === signature) return cached.value;
      const value = buildTrack(calendar, definition, rows, eras, capped);
      trackCache.current.entries.set(calendar.id, { signature, value });
      return value;
    });
    const authorized = new Set(bundle.calendars.map(calendar => calendar.id));
    for (const id of trackCache.current.entries.keys()) if (!authorized.has(id)) trackCache.current.entries.delete(id);
    if (nextTracks.length !== trackCache.current.list.length || nextTracks.some((track, index) => track !== trackCache.current.list[index])) trackCache.current.list = nextTracks;
    return trackCache.current.list;
  }, [bundle.calendars, bundle.baseEvents, bundle.occurrences, bundle.eras, bundle.expansionMetadata, timeBundle.calendars]);
  const ids = useMemo(() => tracks.map(track => track.id), [tracks]);
  const aligned = useMemo(() => tracks.filter(track => track.aligned).map(track => track.id), [tracks]);
  const master = tracks.find(track => track.isMasterTime && track.axis)?.id ?? tracks.find(track => track.axis)?.id ?? tracks[0]?.id ?? null;
  const [state, setState] = useState(() => initialHistoricalWorkspace(ids,
    ids.includes(params.get('track') ?? '') ? params.get('track') : master));
  const workspace = useMemo(() => reconcileHistoricalWorkspace(state, ids, aligned, master), [state, ids, aligned, master]);
  useEffect(() => {
    if (JSON.stringify(state) !== JSON.stringify(workspace)) setState(workspace);
  }, [state, workspace]);
  const [importance, setImportance] = useState({ MAJOR: true, MINOR: true, NOTICE: false });
  const [category, setCategory] = useState('all');
  const [showEras, setShowEras] = useState(true);
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [clusterKeys, setClusterKeys] = useState<string[] | null>(null);
  const [focusedEraId, setFocusedEraId] = useState<string | null>(null);
  const [jumpDate, setJumpDate] = useState<ChronologyDateParts>({ year: 1, month: 0, day: 1 });
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const filterCache = useRef(new Map<string, { input: HistoricalInterval[]; key: string; rows: HistoricalInterval[] }>());
  const filtered = useMemo(() => {
    const key = JSON.stringify([importance, category]);
    const result = new Map<string, HistoricalInterval[]>();
    for (const track of tracks) {
      const cached = filterCache.current.get(track.id);
      const rows = cached?.input === track.intervals && cached.key === key ? cached.rows : track.intervals.filter(row =>
        importance[row.representative.importance] && (category === 'all' || (row.representative.categoryId ?? 'uncategorized') === category));
      filterCache.current.set(track.id, { input: track.intervals, key, rows });
      result.set(track.id, rows);
    }
    for (const id of filterCache.current.keys()) if (!result.has(id)) filterCache.current.delete(id);
    return result;
  }, [tracks, importance, category]);
  const activeId = workspace.independent ?? workspace.reference;
  const active = tracks.find(track => track.id === activeId);
  const axis = active?.axis ?? null;
  const native = workspace.independent !== null;
  const viewKey = native ? `native:${activeId}` : 'shared';
  const minimum = native ? axis?.calendar.epochOffset : undefined;
  const [views, setViews] = useState<Record<string, TimelineViewport>>({});
  const initial = useMemo(() => axis && active ? initialComparisonViewport(axis,
    active.definition?.state ? dateParts(active.definition.state) : null, active.intervals, active.eras) :
    { origin: 0n, offset: 0, span: 365 * 1440 }, [axis, active]);
  const view = views[viewKey] ?? initial;
  const viewRef = useRef(view);
  const frame = useRef<number | null>(null);
  const pending = useRef<{ key: string; view: TimelineViewport } | null>(null);
  useEffect(() => { viewRef.current = view; }, [view]);
  useEffect(() => {
    if (axis) setViews(previous => previous[viewKey] ? previous : { ...previous, [viewKey]: initial });
  }, [viewKey, axis, initial]);
  const updateView = useCallback((next: TimelineViewport) => {
    viewRef.current = next;
    pending.current = { key: viewKey, view: next };
    if (frame.current !== null) return;
    frame.current = requestAnimationFrame(() => {
      frame.current = null;
      const value = pending.current; pending.current = null;
      if (value) setViews(previous => ({ ...previous, [value.key]: value.view }));
    });
  }, [viewKey]);
  useEffect(() => () => {
    if (frame.current !== null) cancelAnimationFrame(frame.current);
    frame.current = null;
    const value = pending.current; pending.current = null;
    if (value) setViews(previous => ({ ...previous, [value.key]: value.view }));
  }, [viewKey]);
  const move = useCallback((value: TimelineViewport, delta: number, span = value.span) =>
    moveComparisonViewport(value, delta, span, minimum), [minimum]);
  const zoom = useCallback((value: TimelineViewport, factor: number, anchor = .5) =>
    zoomComparisonViewport(value, factor, anchor, minimum), [minimum]);
  const canvasRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(900);
  useEffect(() => {
    const element = canvasRef.current;
    if (!element) return;
    const observer = new ResizeObserver(entries => setWidth(Math.max(1, entries[0]!.contentRect.width)));
    observer.observe(element); return () => observer.disconnect();
  }, []);
  useEffect(() => {
    if (!axis || !activeId) return;
    const center = historicalNativeState(axis, viewportDay(view, .5));
    if (center) onBrowseAnchorChange(dateParts(center), activeId);
  }, [axis, activeId, view, onBrowseAnchorChange]);
  const visibleTracks = workspace.order.filter(id => workspace.visible.includes(id)).map(id => tracks.find(track => track.id === id)!);
  const shown = native ? visibleTracks.filter(track => track.id === activeId) : visibleTracks;
  const visibleIntervals = useMemo(() => tracks.filter(track => workspace.visible.includes(track.id)).flatMap(track => filtered.get(track.id) ?? []),
    [tracks, workspace.visible, filtered]);
  const selected = visibleIntervals.find(row => row.key === selectedKey) ?? null;
  const source = selected ? tracks.find(track => track.id === selected.calendarId) : null;
  const selectedBase = selected ? bundle.baseEvents.find(row => row.id === selected.baseEventId) ?? null : null;
  const clusterMembers = clusterKeys ? visibleIntervals.filter(row => clusterKeys.includes(row.key)) : [];
  useEffect(() => { if (selectedKey && !selected) setSelectedKey(null); }, [selectedKey, selected]);
  useEffect(() => { if (clusterKeys && !clusterMembers.length) setClusterKeys(null); }, [clusterKeys, clusterMembers.length]);
  const select = useCallback((row: HistoricalInterval) => { setClusterKeys(null); setSelectedKey(row.key); }, []);
  const cluster = useCallback((keys: string[]) => { setClusterKeys(keys); }, []);
  const collapse = useCallback((id: string) => setState(previous => ({ ...previous,
    collapsed: previous.collapsed.includes(id) ? previous.collapsed.filter(value => value !== id) : [...previous.collapsed, id] })), []);
  const fit = (rows: HistoricalInterval[]) => { const next = fitComparisonIntervals(rows, minimum); if (next) updateView(next); };
  const fitRows = native ? filtered.get(activeId ?? '') ?? emptyIntervals :
    visibleIntervals.filter(row => aligned.includes(row.calendarId));
  const ticks = useMemo(() => axis ? comparisonTicks(axis, view, width) : [], [axis, view, width]);
  const referenceBands = useMemo(() => axis && active ? active.eras.map(era => comparisonEraGeometry(era, axis, view, width))
    .filter((band): band is ComparisonEraBand => !!band && band.width > 0) : emptyBands, [active, axis, view, width]);
  const focusedEra = tracks.flatMap(track => track.eras).find(era => era.id === focusedEraId);
  const focusEra = useCallback((id: string) => {
    const track = tracks.find(track => track.eras.some(era => era.id === id));
    const era = track?.eras.find(era => era.id === id);
    if (!track?.axis || !era || (!native && !track.aligned)) return;
    const band = comparisonEraGeometry(era, track.axis, viewRef.current, width);
    if (!band) return;
    setFocusedEraId(id);
    if (band.start !== null && band.end !== null) {
      const next = fitComparisonIntervals([{ start: band.start, end: band.end }], minimum);
      if (next) updateView(next);
    } else if (band.start !== null || band.end !== null) updateView(move({ ...viewRef.current,
      origin: band.start ?? band.end!, offset: 0 }, -viewRef.current.span / 2));
  }, [tracks, native, width, minimum, updateView, move]);
  const deepLink = useRef('');
  useEffect(() => {
    const track = params.get('track'), era = params.get('era'), signature = `${track}:${era}`;
    if (signature === deepLink.current) return;
    deepLink.current = signature;
    if (track && ids.includes(track)) setState(previous => ({ ...previous, visible: [...new Set([...previous.visible, track])],
      reference: aligned.includes(track) ? track : previous.reference, independent: aligned.includes(track) ? null : track }));
    if (era && (!track || track === activeId)) focusEra(era);
    else if (era) deepLink.current = ''; // Apply after the requested clock becomes active.
  }, [params, ids, aligned, activeId, focusEra]);
  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const drag = useRef<{ x: number; y: number; view: TimelineViewport; distance?: number } | null>(null);
  const moved = useRef(false);
  useEffect(() => {
    const element = canvasRef.current;
    if (!element) return;
    const wheel = (event: WheelEvent) => {
      if (event.ctrlKey || event.metaKey) {
        event.preventDefault();
        updateView(zoom(viewRef.current, Math.exp(event.deltaY * .005), (event.clientX - element.getBoundingClientRect().left) / element.clientWidth));
      } else if (Math.abs(event.deltaX) > Math.abs(event.deltaY) || event.shiftKey) {
        event.preventDefault(); updateView(move(viewRef.current, (event.deltaX || event.deltaY) / element.clientWidth * viewRef.current.span));
      }
    };
    element.addEventListener('wheel', wheel, { passive: false });
    return () => element.removeEventListener('wheel', wheel);
  }, [updateView, move, zoom]);
  const today = axis && active?.definition?.state ? axis.date(dateParts(active.definition.state)) : null;
  const todayMinute = today !== null && axis ? historicalMinute(axis, today) : null;
  const setVisible = (id: string) => setState(previous => ({ ...previous,
    visible: previous.visible.includes(id) ? previous.visible.filter(value => value !== id) : [...previous.visible, id] }));
  const reset = () => {
    setState(initialHistoricalWorkspace(ids, master)); setSelectedKey(null); setClusterKeys(null); setFocusedEraId(null);
    setViews({});
  };
  const capped = bundle.expansionMetadata.generated.truncated || bundle.expansionMetadata.warnings.some(warning =>
    ['CAP_APPLIED_TOTAL', 'CAP_APPLIED_PER_EVENT', 'UNBOUNDED_RULE_FORCED_CAP'].includes(warning));
  const eraHref = `${campaignChronologyPath(campaignHandle)}?view=eras&track=${encodeURIComponent(activeId ?? '')}`;
  const occurrence = selected && source?.axis ? (() => {
    const start = historicalNativeState(source.axis, selected.start), end = historicalNativeState(source.axis, selected.end - 1440n);
    return start && end ? { ...selected.representative,
      start: { ...dateParts(start), monthName: start.monthName, epochMinute: selected.start.toString() },
      end: { ...dateParts(end), monthName: end.monthName, epochMinute: (selected.end - 1440n).toString() } } : null;
  })() : null;
  const context = selected && source ? <>
    <p>{text('source', { name: source.name })}</p>
    {!native && source.aligned && axis && <p>{text('referenceDate', { name: active?.name ?? '',
      start: comparisonDateLabel(axis, selected.start, text, true), end: comparisonDateLabel(axis, selected.end - 1n, text, true) })}</p>}
  </> : null;
  return <div className="relative flex h-full min-h-0 min-w-0 flex-col" data-historical-timeline>
    <div className="relative flex shrink-0 flex-wrap items-center gap-2 border-b border-border/40 p-2">
      <span className="text-sm font-semibold">{text('title')}</span>
      <button className={control} aria-expanded={sidebarOpen} aria-controls="historical-tracks" onClick={() => setSidebarOpen(value => !value)}>{text('tracks', { count: workspace.visible.length })}</button>
      <label className="text-xs">{text('reference')} <select className={control} value={workspace.reference ?? ''}
        onChange={event => { setState(previous => ({ ...previous, reference: event.target.value, independent: null })); setFocusedEraId(null); }}>
        {!workspace.reference && <option value="">—</option>}
        {visibleTracks.filter(track => track.aligned).map(track => <option key={track.id} value={track.id}>{track.name}</option>)}
      </select></label>
      <button className={control} disabled={!axis} aria-label={text('zoomIn')} onClick={() => updateView(zoom(view, .5))}>+</button>
      <button className={control} disabled={!axis} aria-label={text('zoomOut')} onClick={() => updateView(zoom(view, 2))}>−</button>
      <button className={control} disabled={!fitRows.length} onClick={() => fit(fitRows)}>{text('fit')}</button>
      <button className={control} disabled={todayMinute === null} onClick={() => todayMinute !== null && updateView(move({ ...view, origin: todayMinute, offset: 0 }, -view.span / 2))}>{text('today')}</button>
      <details>
        <summary className={`${control} cursor-pointer`}>{text('navigation')}</summary>
        <div className="absolute right-2 top-full z-30 mt-1 max-h-[65dvh] w-[min(320px,85vw)] max-w-[calc(100%_-_1rem)] space-y-3 overflow-y-auto rounded border border-border bg-background p-3 shadow-xl">
          <div className="flex flex-wrap gap-2" aria-label={text('importance')}>
            {(['MAJOR', 'MINOR', 'NOTICE'] as const).map(value => <button key={value} className={control} aria-pressed={importance[value]}
              onClick={() => setImportance(previous => ({ ...previous, [value]: !previous[value] }))}>{text(value.toLowerCase() as 'major' | 'minor' | 'notice')}</button>)}
          </div>
          <label className="block text-xs">{text('category')} <select className={control} value={category} onChange={event => setCategory(event.target.value)}>
            <option value="all">{text('allCategories')}</option><option value="uncategorized">{text('uncategorized')}</option>
            {bundle.categories.map(row => <option key={row.id} value={row.id}>{row.name}</option>)}
          </select></label>
          <label className="block text-xs"><input type="checkbox" checked={showEras} onChange={event => setShowEras(event.target.checked)} /> {text('showEras')}</label>
          <label className="block text-xs">{text('jumpEra')} <select className={control} value={focusedEraId ?? ''} onChange={event => focusEra(event.target.value)}>
            <option value="">{text('chooseEra')}</option>{active?.eras.map(era => <option key={era.id} value={era.id}>{era.name}</option>)}
          </select></label>
          {axis && <FantasyDatePicker key={activeId} calendar={axis.calendar} value={jumpDate} onChange={setJumpDate} />}
          <button className={control} disabled={!axis} onClick={() => {
            const day = axis?.date(jumpDate);
            if (day !== null && day !== undefined && axis) updateView(move({ ...view, origin: historicalMinute(axis, day), offset: 0 }, -view.span / 2));
          }}>{text('jumpDate')}</button>
          <a className="block text-xs underline" href={eraHref}>{text('openEras')}</a>{categoryFooter}
        </div>
      </details>
    </div>
    <div className="shrink-0 px-3 py-1 text-xs text-muted" aria-live="polite">
      {native ? text('native', { name: active?.name ?? '' }) : text('compare')}
      {axis && <> · {comparisonDateLabel(axis, viewportDay(view), text)} — {comparisonDateLabel(axis, viewportDay(view, 1), text)}</>}
      {native && <button className="ml-2 min-h-11 underline" onClick={() => setState(previous => ({ ...previous, independent: null }))}>{text('compare')}</button>}
    </div>
    <p role="status" className="shrink-0 px-3 pb-2 text-xs text-muted" title={bundle.expansionMetadata.warnings.join(', ')}>{text(capped ? 'capped' : 'coverage')}</p>
    {focusedEra && <div className="flex shrink-0 items-center gap-2 px-3 pb-2 text-xs">
      <a className="underline" href={`${campaignChronologyPath(campaignHandle)}?view=eras&track=${encodeURIComponent(focusedEra.calendarId)}&era=${encodeURIComponent(focusedEra.id)}`}>{text('eraOverview', { name: focusedEra.name })}</a>
      <button className="min-h-11 p-2" onClick={() => setFocusedEraId(null)} aria-label={text('dismissEra')}>×</button>
    </div>}
    <div className="relative flex min-h-0 min-w-0 flex-1">
      {sidebarOpen && <div id="historical-tracks" className="absolute inset-y-0 left-0 z-20 w-72 max-w-full overflow-y-auto border-r border-border bg-background p-2 shadow-lg lg:static lg:shrink-0 lg:shadow-none">
        <div className="flex flex-wrap gap-1">
          <button className={control} onClick={() => setState(previous => ({ ...previous, visible: ids }))}>{text('showAll')}</button>
          <button className={control} onClick={reset}>{text('reset')}</button>
        </div>
        {workspace.order.map((id, index) => {
          const track = tracks.find(track => track.id === id)!;
          return <div key={id} className="border-b border-border/40 py-2 text-xs" data-track-control={id}>
            <label className="flex min-h-11 items-center gap-2"><input type="checkbox" checked={workspace.visible.includes(id)} onChange={() => setVisible(id)} />{track.name}</label>
            {track.reason && <p className="text-muted">{text(track.reason)}</p>}
            <div className="flex flex-wrap gap-1">
              <button className={control} disabled={index === 0} aria-label={text('moveUp', { name: track.name })} onClick={() => setState(previous => ({ ...previous, order: reorderHistoricalTrack(previous.order, id, -1) }))}>↑</button>
              <button className={control} disabled={index === workspace.order.length - 1} aria-label={text('moveDown', { name: track.name })} onClick={() => setState(previous => ({ ...previous, order: reorderHistoricalTrack(previous.order, id, 1) }))}>↓</button>
              <button className={control} onClick={() => setState(previous => ({ ...previous, visible: [id] }))}>{text('hideOthers')}</button>
              <button className={control} disabled={!track.axis} onClick={() => { setState(previous => ({ ...previous, visible: [...new Set([...previous.visible, id])], independent: id })); setSidebarOpen(false); }}>{text('inspect', { name: track.name })}</button>
            </div>
          </div>;
        })}
      </div>}
      <div className="min-h-0 min-w-0 flex-1 overflow-y-auto" data-comparison-scroll>
        <div ref={canvasRef} tabIndex={0} role="region" aria-label={text('canvas')} className="relative min-h-full outline-offset-[-2px]"
          style={{ touchAction: 'pan-y' }} onKeyDown={event => {
            if (event.target !== event.currentTarget || !axis) return;
            if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') { event.preventDefault(); updateView(move(view, view.span * (event.key === 'ArrowLeft' ? -.2 : .2))); }
            if (event.key === '+' || event.key === '-') { event.preventDefault(); updateView(zoom(view, event.key === '+' ? .5 : 2)); }
          }} onPointerDown={event => {
            if (event.button !== 0 || !axis || (event.target as Element).closest('button, select, input, a')) return;
            pointers.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
            const points = [...pointers.current.values()]; moved.current = false;
            drag.current = { x: event.clientX, y: event.clientY, view: viewRef.current };
            if (points.length === 2) { moved.current = true; drag.current = { x: (points[0]!.x + points[1]!.x) / 2, y: 0,
              view: viewRef.current, distance: Math.max(1, Math.abs(points[0]!.x - points[1]!.x)) }; }
          }} onPointerMove={event => {
            if (!pointers.current.has(event.pointerId) || !drag.current) return;
            pointers.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
            const points = [...pointers.current.values()], initial = drag.current;
            if (points.length === 2 && initial.distance) {
              moved.current = true;
              const distance = Math.max(1, Math.abs(points[0]!.x - points[1]!.x));
              const center = (points[0]!.x + points[1]!.x) / 2;
              const anchor = (initial.x - event.currentTarget.getBoundingClientRect().left) / width;
              const zoomed = zoom(initial.view, initial.distance / distance, anchor);
              updateView(move(zoomed, (initial.x - center) / width * zoomed.span));
            } else if (!initial.distance && (moved.current || Math.abs(event.clientX - initial.x) > 6)) {
              if (event.pointerType === 'touch' && Math.abs(event.clientY - initial.y) > Math.abs(event.clientX - initial.x)) return;
              moved.current = true; event.currentTarget.setPointerCapture(event.pointerId);
              updateView(move(initial.view, (initial.x - event.clientX) / width * initial.view.span));
            }
          }} onPointerUp={event => { pointers.current.delete(event.pointerId); if (!pointers.current.size) drag.current = null; }}
          onPointerCancel={() => { pointers.current.clear(); drag.current = null; moved.current = true; }}
          onClickCapture={event => { if (moved.current) { event.preventDefault(); event.stopPropagation(); moved.current = false; } }}>
          <div className="sticky top-0 z-10 bg-background" data-timeline-axis data-viewport-origin={String(view.origin)} data-viewport-span={view.span}>
            <svg width="100%" height={36} aria-hidden="true">{ticks.map(tick => <g key={String(tick.day)}>
              <line x1={tick.x} x2={tick.x} y1={24} y2={36} stroke="currentColor" opacity=".3" />
              <text x={tick.x + 4} y={18} fill="currentColor" fontSize={11}>{tick.label}</text>
            </g>)}</svg>
          </div>
          {showEras && active && axis && <HistoricalEraStrip bands={referenceBands} name={active.name} onFocus={focusEra} />}
          {!tracks.length && <p className="p-4 text-sm text-muted">{text('noCalendars')}</p>}
          {!workspace.visible.length && tracks.length > 0 && <p className="p-4 text-sm text-muted">{text('selectTracks')}</p>}
          {shown.map(track => track.axis && (native || track.aligned) ? <HistoricalTrack key={track.id} id={track.id} name={track.name}
            axis={track.axis} intervals={filtered.get(track.id) ?? emptyIntervals} eras={track.id === activeId ? emptyEras : track.eras}
            view={view} width={width} collapsed={workspace.collapsed.includes(track.id)} showEras={showEras}
            referenceBands={showEras ? referenceBands : emptyBands} categories={bundle.categories} selected={native || source?.aligned ? selected : null}
            comparison={!native} capped={track.capped} today={todayMinute} onSelect={select} onCluster={cluster} onCollapse={collapse} onEra={focusEra} /> :
            <section key={track.id} className="p-4 text-sm" data-timeline-track={track.id}><p>{track.name}</p>
              <p className="text-xs text-muted">{text(track.reason ?? 'calendarUnavailable')}</p>
              {track.axis && <button className={control} onClick={() => setState(previous => ({ ...previous, independent: track.id }))}>{text('inspect', { name: track.name })}</button>}
            </section>)}
        </div>
      </div>
    </div>
    {clusterKeys && <ChronologyInspector title={text('clusterTitle', { count: clusterMembers.length })} onClose={() => setClusterKeys(null)}>
      <button className={control} onClick={() => { fit(clusterMembers); setClusterKeys(null); }}>{text('zoomPeriod')}</button>
      <ul className="mt-3 space-y-2">{clusterMembers.map(row => {
        const track = tracks.find(track => track.id === row.calendarId)!;
        return <li key={row.key}><button className="w-full rounded p-2 text-left text-sm hover:bg-elevated" onClick={() => select(row)}>{comparisonIntervalLabel(row, track.axis!, text)}</button></li>;
      })}</ul>
    </ChronologyInspector>}
    <ChronologyEventSidebar campaignHandle={campaignHandle} baseEvent={selectedBase} categories={bundle.categories}
      editableEvents={bundle.baseEvents} calendarLike={source?.axis?.calendar ?? null} canManage={canManage}
      open={!!selectedBase && !clusterKeys} occurrence={occurrence} dateSeed={occurrence?.start ?? null} comparisonContext={context}
      onClose={() => setSelectedKey(null)} onMutated={onMutated} onDeleted={async () => { setSelectedKey(null); await onDeleted(); }} onRevealEvent={onRevealEvent} />
  </div>;
}
