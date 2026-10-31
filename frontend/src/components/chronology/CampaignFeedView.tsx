import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { TYPE_DISPLAY_CLASS, META_SECTION_LABEL_CLASS } from '@/lib/surfaceLayout';
import type { ConvergenceOverlayBundle, ConvergenceTimelineEntry } from '@/lib/chronologyOverlayApi';
import { fetchChronologyTimeline, type ChronologyTimelineBundle, type TimelineOccurrenceRecord } from '@/lib/chronologyApi';
import type { TimeTrackingBundle } from '@/lib/timeTrackingApi';
import { historicalClock, historicalNativeState, sharedHistoricalIntervals, type HistoricalInterval } from '@/lib/historicalTimeline';
import { intervalOccurrence, linkedInterval, nativeDateMinute } from '@/lib/chronologyNavigation';
import { ChronologyNavigationLinks } from './ChronologyNavigationLinks';
import { ChronologyImportance } from './ChronologyImportance';
import { calendarEpochMinuteForDate } from '@/lib/timeEngine';
import { narrowFeedRange, shiftFeedRange } from '@shared/campaignFeed';
import { FEED_SOURCES, groupCampaignFeed, groupFeedDevelopments } from '@/lib/campaignFeedPresentation';
import { formatConvergenceLinkLabel } from '@shared/convergenceFeedDisplay';
import { ChronologyEventSidebar } from './ChronologyEventSidebar';
import { ChronologyEventDialog } from './ChronologyEventDialog';
import { CampaignHistoryPanel } from './CampaignHistoryPanel';
import { DowntimeGapOverlayEditor } from './DowntimeGapOverlayEditor';
import { FantasyDatePicker } from './FantasyDatePicker';

interface Props {
  onInspectionChange?: (occurrence: TimelineOccurrenceRecord | null) => void;
  campaignHandle: string; bundle: ConvergenceOverlayBundle; timeBundle: TimeTrackingBundle;
  chronologyBundle?: ChronologyTimelineBundle | null; canManageChronology?: boolean;
  onOverlaySaved: () => void | Promise<void>;
}
const control = 'min-h-11 rounded border border-border/40 px-3 py-2 text-sm';
export function CampaignFeedView({ campaignHandle, bundle, timeBundle, chronologyBundle, canManageChronology = false, onOverlaySaved, onInspectionChange }: Props) {
  const [params, setParams] = useSearchParams();
  const [manage, setManage] = useState(false);
  const [gapId, setGapId] = useState<string | null>(null);
  const [rangeOpen, setRangeOpen] = useState(false);
  const [selection, setSelection] = useState<ConvergenceTimelineEntry | null>(null);
  const [catalogue, setCatalogue] = useState<ChronologyTimelineBundle | null>(null);
  const [inspectionError, setInspectionError] = useState<string | null>(null);
  const [inspecting, setInspecting] = useState(false);
  const [showTarget, setShowTarget] = useState(false);
  const inspectionVersion = useRef(0);
  useEffect(() => { setCatalogue(null); }, [chronologyBundle]);
  useEffect(() => { setShowTarget(params.get('focus') === 'feed' && bundle.entries.some(row => row.projection.visible && row.domain === 'world_event' &&
    row.source.entityId === params.get('event') && row.feed?.calendarId === params.get('track') && String(row.feed?.occurrenceIndex) === params.get('occurrence'))); },
  [bundle.entries, params.get('track'), params.get('event'), params.get('occurrence'), params.get('focus')]);
  useEffect(() => () => { inspectionVersion.current++; }, []);
  const coverage = bundle.feed;
  const range = coverage?.requestedRange ?? bundle.window;
  const importance = (params.get('importance') ?? 'MAJOR,MINOR,NOTICE').split(',');
  const domains = params.get('domains')?.split(',');
  const groups = useMemo(() => groupCampaignFeed(bundle.entries.filter(row => row.projection.visible), params.get('group') === 'session'), [bundle.entries, params]);
  const axes = useMemo(() => new Map(timeBundle.calendars.map(calendar => [calendar.id, historicalClock(calendar).axis])), [timeBundle.calendars]);
  const master = timeBundle.calendars.find(row => row.isMasterTime) ?? timeBundle.calendars[0];
  const axis = master ? axes.get(master.id) ?? null : null;
  const label = (minute: string) => {
    const state = axis ? historicalNativeState(axis, BigInt(minute)) : null;
    return state ? `${state.monthName} ${state.day}, Year ${state.year}` : 'Date unavailable';
  };
  function filter(key: string, value: string) {
    const next = new URLSearchParams(params); next.set(key, value); setParams(next);
  }
  function navigate(nextRange: { from: string; to: string }) {
    const next = new URLSearchParams(params);
    for (const key of ['event', 'occurrence', 'at', 'date']) next.delete(key);
    next.set('windowMode', 'EPOCH_RANGE'); next.set('from', nextRange.from); next.set('to', nextRange.to);
    setParams(next); setRangeOpen(false);
  }
  async function inspect(entry: ConvergenceTimelineEntry) {
    const version = ++inspectionVersion.current;
    setInspectionError(null); setInspecting(true);
    try {
      const loaded = await fetchChronologyTimeline(campaignHandle);
      if (version !== inspectionVersion.current) return;
      setCatalogue(loaded);
      if (!loaded.baseEvents.some(row => row.id === entry.source.entityId)) throw new Error('This event is no longer available.');
      setSelection(entry);
    } catch (error) { if (version === inspectionVersion.current) setInspectionError(error instanceof Error ? error.message : 'Unable to inspect this event.'); }
    finally { if (version === inspectionVersion.current) setInspecting(false); }
  }
  const details = chronologyBundle ?? catalogue;
  const intervals = useMemo(() => timeBundle.calendars.flatMap(calendar => {
    const axis = axes.get(calendar.id);
    return axis && details?.calendars.some(row => row.id === calendar.id) ? sharedHistoricalIntervals(details.occurrences.filter(row =>
      row.calendarId === calendar.id && details.baseEvents.some(base => base.id === row.baseEventId && base.calendarId === row.calendarId)), axis) : [];
  }), [timeBundle.calendars, axes, details]);
  const intervalIndex = useMemo(() => {
    const index = new Map<string, HistoricalInterval>();
    for (const row of intervals) {
      const key = JSON.stringify([row.calendarId, row.baseEventId, row.recurrenceIndex, String(row.start)]);
      if (!index.has(key)) index.set(key, row);
    }
    return index;
  }, [intervals]);
  function entryOccurrence(entry: ConvergenceTimelineEntry): TimelineOccurrenceRecord | null {
    const axis = entry.feed?.calendarId ? axes.get(entry.feed.calendarId) : null;
    const minute = axis && entry.feed?.nativeStart ? nativeDateMinute(axis, entry.feed.nativeStart) : null;
    if (!axis || minute === null || entry.feed?.occurrenceIndex === undefined) return null;
    const interval = intervalIndex.get(JSON.stringify([entry.feed.calendarId, entry.source.entityId, entry.feed.occurrenceIndex, String(minute)]));
    return interval && axis ? intervalOccurrence(interval, axis) : null;
  }
  const linked = linkedInterval(params, intervals);
  const linkedClock = timeBundle.calendars.find(row => row.id === linked?.calendarId);
  const linkedAxis = linkedClock ? axes.get(linkedClock.id) : null;
  const linkedOccurrence = linked && linkedAxis ? intervalOccurrence(linked, linkedAxis) : null;
  const occurrence = selection ? entryOccurrence(selection) : showTarget ? linkedOccurrence : null;
  useEffect(() => { onInspectionChange?.(occurrence); }, [occurrence, onInspectionChange]);
  const baseEvent = details?.baseEvents.find(row => row.id === occurrence?.baseEventId) ?? null;
  const sourceClock = timeBundle.calendars.find(row => row.id === occurrence?.calendarId);
  const sourceAxis = sourceClock ? axes.get(sourceClock.id) : null;
  useEffect(() => {
    if (selection && !occurrence) { setSelection(null); setInspectionError('This occurrence is unavailable in the loaded authorized history.'); }
  }, [selection, occurrence]);
  const renderEntry = (entry: ConvergenceTimelineEntry) => <li key={entry.entryId} className="space-y-1 py-3" data-feed-entry={entry.entryId}>
    {entry.domain === 'world_event' ? <button className="min-h-11 text-left font-medium" aria-busy={inspecting || undefined} onClick={() => void inspect(entry)}>{entry.display.title}</button> : <p className="font-medium">{entry.display.title}</p>}
    {entry.display.summary && <p className="type-prose max-w-[80ch] text-sm">{entry.display.summary}</p>}
    <p className="text-xs text-muted">{FEED_SOURCES[entry.domain as keyof typeof FEED_SOURCES] ?? entry.domain}
      {entry.feed?.originLabel && ` · ${entry.feed.originLabel}`}
      {entry.domain === 'world_event' && chronologyBundle?.baseEvents.some(event => event.id === entry.source.entityId) && <span> / {chronologyBundle.baseEvents.find(event => event.id === entry.source.entityId)?.wikiPageId ? 'Page' : 'Event only'}</span>}
      {entry.feed?.importance && <> · <ChronologyImportance value={entry.feed.importance} /></>}{entry.feed?.calendarName && ` · ${entry.feed.calendarName}`}
      {entry.feed?.nativeDateLabel && ` · ${entry.feed.nativeDateLabel}`}{entry.feed?.duration && entry.feed.duration > 1 ? ` · ${entry.feed.duration} days` : ''}</p>
    <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm">
      {entry.domain === 'world_event' && (() => { const occurrence = entryOccurrence(entry); return occurrence ? <ChronologyNavigationLinks campaignHandle={campaignHandle} occurrence={occurrence} /> : null; })()}
      {entry.links.filter(link => entry.domain !== 'world_event' || link.hrefKind !== 'chronology_events').map(link => <Link key={`${link.hrefKind}:${link.path}`} className="inline-flex min-h-11 items-center underline" to={link.path}>{formatConvergenceLinkLabel(link.hrefKind)}</Link>)}
      {canManageChronology && entry.domain === 'downtime_period' && <button className="min-h-11 underline" onClick={() => setGapId((entry.domainPayload as { payload: { gapId: string } }).payload.gapId)}>Edit period</button>}
    </div>
  </li>;
  return <div className="relative h-full min-w-0 overflow-y-auto p-4" data-campaign-feed>
    <header className="mb-8 space-y-3">
      <h2 className={TYPE_DISPLAY_CLASS}>Campaign history</h2>
      <p className="type-prose max-w-[80ch] text-sm text-muted">Recorded developments, sessions, and discoveries across your campaign.</p>
      <div className="flex flex-wrap items-center gap-2" aria-label="Historical navigation">
        <button className={control} onClick={() => navigate(shiftFeedRange(range.from, range.to, -1))}>Earlier</button>
        <button className={control} aria-label="Choose historical range" onClick={() => setRangeOpen(true)}>{label(range.from)} – {label(String(BigInt(range.to) - 1n))}</button>
        <button className={control} disabled={!coverage?.includeFuture && BigInt(range.to) >= BigInt(coverage?.todayEndEpochMinute ?? range.to)} onClick={() => navigate(shiftFeedRange(range.from, range.to, 1))}>Later</button>
        <button className={control} onClick={() => { const next = new URLSearchParams(params); next.delete('from'); next.delete('to'); next.delete('windowMode'); for (const key of ['event', 'occurrence', 'at', 'date']) next.delete(key); setParams(next); }}>Latest history</button>
      </div>
      <details><summary className="min-h-11 cursor-pointer py-3 text-sm">Filter and group history</summary>
        <div className="space-y-3 text-sm">
          <fieldset className="flex flex-wrap gap-4"><legend className={META_SECTION_LABEL_CLASS}>Sources</legend>
            {Object.entries(FEED_SOURCES).map(([id, title]) => <label className="inline-flex min-h-11 items-center gap-2" key={id}><input type="checkbox" checked={domains === undefined || domains.includes(id)} onChange={e => {
              const selected = domains ?? Object.keys(FEED_SOURCES); filter('domains', (e.target.checked ? [...selected, id] : selected.filter(value => value !== id)).join(','));
            }} />{title}</label>)}
          </fieldset>
          <fieldset className="flex flex-wrap gap-4"><legend className={META_SECTION_LABEL_CLASS}>Chronology importance</legend>
            {['MAJOR', 'MINOR', 'NOTICE'].map(level => <label className="inline-flex min-h-11 items-center gap-2" key={level}><input type="checkbox" checked={importance.includes(level)} onChange={e => filter('importance', (e.target.checked ? [...importance, level] : importance.filter(value => value !== level)).join(','))} />{level === 'MAJOR' ? 'Major' : level === 'MINOR' ? 'Minor' : 'Notice'}</label>)}
          </fieldset>
          <div className="flex flex-wrap gap-4">
            <label className="inline-flex min-h-11 items-center gap-2"><input type="checkbox" checked={params.get('sessionLinkedOnly') === 'true'} onChange={e => filter('sessionLinkedOnly', String(e.target.checked))} />Session-linked only</label>
            <label className="inline-flex min-h-11 items-center gap-2"><input type="checkbox" checked={coverage?.includeFuture ?? false} onChange={e => filter('includeFuture', String(e.target.checked))} />Include future</label>
            <label className="inline-flex min-h-11 items-center gap-2">Group by <select className={control} value={params.get('group') ?? 'date'} onChange={e => filter('group', e.target.value)}><option value="date">In-world date</option><option value="session">Session</option></select></label>
          </div>
        </div>
      </details>
      <p className="text-xs text-muted">Use Earlier or choose a range to explore older history.</p>
      {bundle.truncation.capped && <div role="status" className="text-sm"><p>This window is incomplete: the response limit was reached.</p><button className={control} disabled={BigInt(range.to) - BigInt(range.from) <= 1n} onClick={() => navigate(narrowFeedRange(range.from, range.to))}>Narrow range</button></div>}
      <details className="text-xs text-muted"><summary className="min-h-11 cursor-pointer py-3">Coverage and source limitations</summary><ul className="list-disc space-y-2 pl-4">
        {coverage?.sourceWarnings.map(row => <li key={`${row.source}:${row.code}`}>{row.source}: {row.message}</li>)}{coverage?.gaps.map(gap => <li key={gap}>{gap}</li>)}</ul></details>
      {canManageChronology && <button className="min-h-11 text-sm underline" onClick={() => setManage(true)}>Manage history</button>}
      {inspectionError && <p role="alert">{inspectionError}</p>}
      {params.has('event') && (!linkedOccurrence
        ? <p role="status">This historical target is unavailable in the loaded authorized history.</p>
        : <p role="status">{linkedClock && historicalClock(linkedClock).aligned ? "Showing the event's historical window." : 'Reference date unavailable; the native date is retained.'} Existing source, importance, session and future filters still apply. <button className={control} onClick={() => { setSelection(null); setShowTarget(true); }}>Show this event</button></p>)}
    </header>
    {!groups.length && <p className="type-prose">No loaded recorded developments match this window and its filters.</p>}
    <div className="space-y-8">{groups.map(group => {
      const content = <><h3 className={META_SECTION_LABEL_CLASS}>{group.title}</h3>
        {group.key === 'undated' && <p className="text-xs text-muted">Undated records are separate from this date window. {coverage?.undated.capped ? 'This section is capped.' : ''}</p>}
        {group.key.startsWith('native:') && <p className="text-xs text-muted">These dates cannot be aligned reliably with other clocks. {coverage?.unaligned.capped ? 'This section is capped.' : ''}</p>}
        {groupFeedDevelopments(group.entries).map(development => development.title && development.entries.length > 1
          ? <details key={development.key} className="mt-3"><summary className="min-h-11 cursor-pointer py-3 text-sm">{development.title} · {development.entries.length} recorded developments</summary><ul className="divide-y divide-border/40 pl-3">{development.entries.map(renderEntry)}</ul></details>
          : <ul key={development.key} className="divide-y divide-border/40">{development.entries.map(renderEntry)}</ul>)}
      </>;
      return group.key === 'undated' || group.key.startsWith('native:') ? <details key={group.key}><summary className="min-h-11 cursor-pointer py-3 text-sm">{group.title} ({group.entries.length})</summary>{content}</details>
        : <section key={group.key} aria-label={group.title}>{content}</section>;
    })}</div>
    {(selection || showTarget) && <ChronologyEventSidebar campaignHandle={campaignHandle} timeBundle={timeBundle} baseEvent={baseEvent} editableEvents={details?.baseEvents ?? []} categories={details?.categories ?? []}
      calendarName={sourceClock?.name} calendarLike={sourceAxis?.calendar ?? null} open={!!baseEvent} canManage={canManageChronology} occurrence={occurrence} onClose={() => { setSelection(null); setShowTarget(false); }}
      onMutated={async () => { await onOverlaySaved(); setCatalogue(await fetchChronologyTimeline(campaignHandle)); }} onDeleted={() => { setSelection(null); setShowTarget(false); }} />}
    {manage && canManageChronology && <HistoryDialog title="Manage history" onClose={() => setManage(false)}><CampaignHistoryPanel campaignHandle={campaignHandle} /></HistoryDialog>}
    {gapId && canManageChronology && <HistoryDialog title="Edit downtime period" onClose={() => setGapId(null)}><DowntimeGapOverlayEditor campaignHandle={campaignHandle} gapId={gapId} onSaved={() => { setGapId(null); void onOverlaySaved(); }} /></HistoryDialog>}
    {rangeOpen && <HistoryDialog title="Choose historical range" onClose={() => setRangeOpen(false)}>{axis ? <FeedRangeEditor axis={axis} from={range.from} to={range.to} onApply={navigate} /> : <p>Calendar unavailable. Use Earlier and Later to navigate bounded history.</p>}</HistoryDialog>}
  </div>;
}
function HistoryDialog({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
  return <ChronologyEventDialog title={title} dirty={false} busy={false} onClose={onClose}>{children}</ChronologyEventDialog>;
}
function FeedRangeEditor({ axis, from, to, onApply }: { axis: NonNullable<ReturnType<typeof historicalClock>['axis']>; from: string; to: string; onApply: (range: { from: string; to: string }) => void }) {
  const first = historicalNativeState(axis, BigInt(from)), last = historicalNativeState(axis, BigInt(to) - 1n);
  const [start, setStart] = useState({ year: first?.year ?? 1, month: first?.monthIndex ?? 0, day: first?.day ?? 1 });
  const [end, setEnd] = useState({ year: last?.year ?? 1, month: last?.monthIndex ?? 0, day: last?.day ?? 1 });
  const fromMinute = calendarEpochMinuteForDate(axis.calendar, start.year, start.month, start.day);
  const toMinute = calendarEpochMinuteForDate(axis.calendar, end.year, end.month, end.day) + 1440n;
  return <div className="space-y-4"><p>Dates use the campaign reference calendar. The last selected day is included.</p>
    <fieldset><legend>First day</legend><FantasyDatePicker calendar={axis.calendar} value={start} onChange={parts => setStart({ year: parts.year ?? 1, month: parts.month ?? 0, day: parts.day ?? 1 })} /></fieldset>
    <fieldset><legend>Last day</legend><FantasyDatePicker calendar={axis.calendar} value={end} onChange={parts => setEnd({ year: parts.year ?? 1, month: parts.month ?? 0, day: parts.day ?? 1 })} /></fieldset>
    {fromMinute >= toMinute && <p role="alert">The last day must follow or equal the first day.</p>}
    <button className={control} disabled={fromMinute >= toMinute} onClick={() => onApply({ from: String(fromMinute), to: String(toMinute) })}>Apply range</button></div>;
}
