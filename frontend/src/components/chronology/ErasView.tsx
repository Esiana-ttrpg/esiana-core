import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { Link, useSearchParams } from 'react-router-dom';
import { useWiki } from '@/contexts/WikiContext';
import { CampaignCapabilities } from '@shared/campaignPolicy/capabilities';
import { compareEraDates, eraContainsDate, type ChronologyEra, type EraDate, type EraInput, type EraDeletionImpact } from '@shared/chronologyEras';
import { saveEra, deleteEra, fetchEraImpact, reorderEras } from '@/lib/chronologyErasApi';
import { HistoricalEraStrip, type ComparisonEraBand } from './HistoricalTrack';
import { ChronologyEventSidebar } from './ChronologyEventSidebar';
import { comparisonDateLabel, useComparisonText } from './comparisonText';
import { comparisonEraGeometry, historicalClock, historicalCoverage, historicalNativeState, sharedHistoricalIntervals, viewportDay, type HistoricalInterval } from '@/lib/historicalTimeline';
import { eraBounds, eraContext, selectedEraEvents, selectWorkspaceEra } from '@/lib/eraWorkspace';
import { campaignWikiPath } from '@/lib/campaignPaths';
import type { ChronologyTimelineBundle } from '@/lib/chronologyApi';
import type { TimeTrackingBundle } from '@/lib/timeTrackingApi';
import { FantasyDatePicker } from './FantasyDatePicker';
import { WikiTipTapEditor } from '@/components/wiki/WikiTipTapEditor';
import { WikiMarkdown } from '@/components/wiki/WikiMarkdown';
import { TYPE_DISPLAY_CLASS, META_SECTION_LABEL_CLASS } from '@/lib/surfaceLayout';
import { resolveMonthName } from '@/lib/timeEngine';

interface Props {
  campaignHandle: string;
  bundle: ChronologyTimelineBundle;
  timeBundle: TimeTrackingBundle;
  canManage: boolean;
  onErasChanged: () => void | Promise<void>;
  onEventMutated: () => void | Promise<void>;
  onEventDeleted: () => void | Promise<void>;
  onRevealEvent: (id: string) => void | Promise<void>;
  onTimeline: (calendarId: string, eraId: string, compare?: boolean) => void;
}
export function ErasView({ bundle, onErasChanged, onTimeline, ...ledger }: Props) {
  const { can, flatPages } = useWiki();
  const elevated = can(CampaignCapabilities.NARRATIVE_ELEVATED_VIEW);
  const text = useComparisonText();
  const [params, setParams] = useSearchParams();
  const eras = bundle.eras ?? [];
  const defaultTrack = bundle.calendars.find(row => row.isMasterTime)?.id ?? bundle.calendars[0]?.id ?? '';
  const linkedEra = eras.find(row => row.id === params.get('era'));
  const track = params.get('track') ?? linkedEra?.calendarId ?? defaultTrack;
  const trackEras = useMemo(() => (bundle.eras ?? []).filter(era => era.calendarId === track)
    .sort((a, b) => a.sortOrder - b.sortOrder || a.id.localeCompare(b.id)), [bundle.eras, track]);
  const definition = ledger.timeBundle.calendars.find(row => row.id === track);
  const clock = useMemo(() => definition ? historicalClock(definition) : null, [definition]);
  const axis = clock?.axis;
  const today = useMemo(() => definition ? { year: definition.state.year, month: definition.state.monthIndex, day: definition.state.day } : undefined, [definition]);
  const selected = bundle.calendars.some(row => row.id === track) ? selectWorkspaceEra(trackEras, params.get('era'), today) : undefined;
  const eraId = selected?.id ?? '';
  const selectedTrackEras = trackEras;
  const [navigationOpen, setNavigationOpen] = useState(false);
  const [importance, setImportance] = useState({ MAJOR: true, MINOR: false, NOTICE: false });
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const intervals = useMemo(() => {
    const bases = new Set(bundle.baseEvents.filter(row => row.calendarId === track).map(row => row.id));
    return axis ? sharedHistoricalIntervals(bundle.occurrences.filter(row => row.calendarId === track && bases.has(row.baseEventId)), axis) : [];
  }, [axis, bundle.occurrences, bundle.baseEvents, track]);
  const events = useMemo(() => axis && selected ? selectedEraEvents(intervals, selected, axis, importance) : [], [axis, intervals, selected, importance]);
  const inspection = events.find(row => row.key === selectedKey);
  useEffect(() => { if (!inspection) setSelectedKey(null); }, [inspection]);
  const context = useMemo(() => axis && selected ? eraContext(trackEras, selected, axis, today) : null, [axis, selected, trackEras, today]);
  const bounds = useMemo(() => axis && selected ? eraBounds(selected, axis) : null, [axis, selected]);
  const stripRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(600);
  useEffect(() => {
    const element = stripRef.current;
    if (!element) return;
    const observer = new ResizeObserver(entries => setWidth(Math.max(1, entries[0]!.contentRect.width)));
    observer.observe(element); return () => observer.disconnect();
  }, [selected?.id]);
  const bands = useMemo(() => axis && context ? trackEras.map(era => comparisonEraGeometry(era, axis, context.view, width))
    .filter((band): band is ComparisonEraBand => !!band && band.width > 0)
    .sort((a, b) => a.x - b.x || a.era.id.localeCompare(b.era.id)) : [], [axis, context, trackEras, width]);
  const masterDefinition = ledger.timeBundle.calendars.find(row => row.id === defaultTrack);
  const masterClock = useMemo(() => masterDefinition ? historicalClock(masterDefinition) : null, [masterDefinition]);
  const canCompare = track !== defaultTrack && clock?.aligned && masterClock?.aligned && masterClock.axis;
  const coverage = historicalCoverage(bundle.expansionMetadata);
  const occurrence = inspection && axis ? inspectionOccurrence(inspection, axis) : null;
  const [draft, setDraft] = useState<EraInput | null>(null);
  const [editing, setEditing] = useState<string | undefined>();
  const [visibilityTouched, setVisibilityTouched] = useState(false);
  const [impact, setImpact] = useState<{ era: ChronologyEra; details: EraDeletionImpact } | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    if (draft && (editing ? !eras.find(era => era.id === editing)?.canManage : !ledger.canManage)) setDraft(null);
    if (impact && !eras.find(era => era.id === impact.era.id)?.canManage) setImpact(null);
  }, [bundle.eras, ledger.canManage, draft, editing, impact]);
  const calendar = ledger.timeBundle.calendars.find(row => row.id === (draft?.calendarId ?? selected?.calendarId ?? track));
  const like = useMemo(() => calendar ? historicalClock(calendar).axis?.calendar ?? null : null, [calendar]);
  const dateLabel = (date: EraDate | null, fallback: string) => date
    ? `Year ${date.year}, ${axis ? resolveMonthName(axis.calendar, date.year, date.month) : `Month ${date.month + 1}`} ${date.day}` : fallback;
  function filter(key: string, value: string) {
    const next = new URLSearchParams(params); if (value) next.set(key, value); else next.delete(key);
    if (key === 'track') next.delete('era');
    setParams(next); setSelectedKey(null);
  }
  async function perform(action: () => Promise<unknown>, refresh = true) {
    setBusy(true); setError(null);
    try { await action(); if (refresh) await onErasChanged(); }
    catch (e) { setError(e instanceof Error ? e.message : 'Unable to save eras.'); }
    finally { setBusy(false); }
  }
  function open(era?: ChronologyEra, close = false) {
    setEditing(era?.id); setVisibilityTouched(false);
    const state = ledger.timeBundle.calendars.find(row => row.id === era?.calendarId)?.state;
    setDraft(era ? { ...era, ...(close && state ? { endDate: { year: state.year, month: state.monthIndex, day: state.day } } : {}) } : { calendarId: track || defaultTrack, name: '', startDate: null, endDate: null, visibility: 'PARTY', isCurrent: false, overview: '' });
  }
  async function move(delta: number) {
    if (!selected) return;
    const ids = selectedTrackEras.map(era => era.id); const index = ids.indexOf(selected.id); const target = index + delta;
    if (target < 0 || target >= ids.length) return;
    [ids[index], ids[target]] = [ids[target]!, ids[index]!];
    await perform(() => reorderEras(ledger.campaignHandle, selected.calendarId, ids));
  }
  return <div className="relative flex h-full min-w-0 flex-col gap-4 overflow-y-auto p-4 [&_select]:rounded [&_select]:border [&_select]:border-border [&_select]:bg-background [&_select]:px-2 [&_select]:py-1 [&_input:not([type=checkbox])]:rounded [&_input:not([type=checkbox])]:border [&_input:not([type=checkbox])]:border-border [&_input:not([type=checkbox])]:bg-background [&_input:not([type=checkbox])]:px-2 [&_input:not([type=checkbox])]:py-1 [&_button]:disabled:opacity-50">
    <div className="flex flex-wrap items-center gap-3">
      <label>Calendar <select value={track} onChange={e => filter('track', e.target.value)}>
        {!bundle.calendars.some(row => row.id === track) && <option value={track}>Calendar unavailable</option>}
        {bundle.calendars.map(row => <option key={row.id} value={row.id}>{row.name}</option>)}
      </select></label>
      <button className="hidden min-h-11 px-3 lg:block" aria-expanded={navigationOpen} aria-controls="era-navigation" onClick={() => setNavigationOpen(value => !value)}>Browse eras</button>
      <label className="lg:hidden">Era <select value={eraId} onChange={e => filter('era', e.target.value)}>
        {!selected && <option value="">Select an era</option>}
        {trackEras.map(era => <option key={era.id} value={era.id}>{era.name}{era.isCurrent ? ' - Current' : ''}</option>)}
      </select></label>
      {ledger.canManage && <button className="min-h-11 px-3" disabled={!definition || !bundle.calendars.some(row => row.id === track)} onClick={() => open()}>Create era</button>}
    </div>
    {error && <p role="alert" className="text-red-500">{error}</p>}
    <div className="flex min-w-0 items-start gap-8">
      {navigationOpen && <nav id="era-navigation" aria-label="Eras in configured display order" className="hidden w-72 shrink-0 space-y-2 lg:block">
        <p className="text-xs text-muted">Configured display order; historical positions follow dates.</p>
        {trackEras.map(era => <button key={era.id} aria-current={era.id === eraId ? 'true' : undefined}
          className={era.id === eraId ? 'block min-h-11 w-full rounded bg-primary/10 px-3 py-2 text-left' : 'block min-h-11 w-full rounded px-3 py-2 text-left hover:bg-elevated'} onClick={() => filter('era', era.id)}>
          <span className="block text-sm">{era.name}</span>
          <span className="block text-xs text-muted">{dateLabel(era.startDate, 'Start unspecified')} - {dateLabel(era.endDate, 'End unspecified')}</span>
          <span className="block text-xs text-muted">{era.isCurrent && 'Current - '}{today && eraContainsDate(era, today) && 'Contains today'}</span>
        </button>)}
      </nav>}
      {selected ? <article className="min-w-0 flex-1 space-y-8">
        <header className="space-y-2">
          <h2 className={TYPE_DISPLAY_CLASS}>{selected.name}</h2>
          <p className="text-sm text-muted">{selected.calendarName} - {dateLabel(selected.startDate, 'Start unspecified')} - {dateLabel(selected.endDate, 'End unspecified')}</p>
          <p className="text-xs text-muted">{selected.isCurrent && 'Configured Current - '}{today && eraContainsDate(selected, today) && 'Contains today - '}
            {bounds?.start != null && bounds.end != null && String((bounds.end - bounds.start) / 1440n) + ' days - '}{selected.visibility === 'DM_ONLY' && 'Restricted - '}Display position {trackEras.indexOf(selected) + 1} of {trackEras.length}</p>
        </header>
        <div className="type-prose max-w-[80ch]">
          <WikiMarkdown content={selected.overview} emptyLabel="No overview yet." />
          {flatPages.some(page => page.id === selected.overviewPageId) && <Link className="inline-flex min-h-11 items-center text-sm underline" to={campaignWikiPath(ledger.campaignHandle, selected.overviewPageId, flatPages)}>Open Wiki overview</Link>}
          {!selected.overview.trim() && selected.canManage && <button className="min-h-11 px-3 text-sm underline" onClick={() => open(selected)}>Edit era</button>}
        </div>
        <section className="min-w-0 space-y-3" aria-label="Historical context">
          <h3 className={META_SECTION_LABEL_CLASS}>Historical context</h3>
          <div ref={stripRef} className="min-w-0">
            {context && bands.length ? <HistoricalEraStrip bands={bands} name={selected.calendarName} selectedId={selected.id} onFocus={id => onTimeline(track, id)} />
              : <p className="text-sm text-muted">Historical position unavailable for this calendar or its configured boundaries.</p>}
          </div>
          {context && axis && <p className="flex justify-between gap-3 text-xs text-muted" aria-label="Context date range">
            <span>{comparisonDateLabel(axis, viewportDay(context.view), text)}</span>
            <span>{comparisonDateLabel(axis, viewportDay(context.view, 1), text)}</span>
          </p>}
          {context && <p className="text-xs text-muted">{context.preceding && 'Preceding: ' + context.preceding.name + '. '}{context.following && 'Following: ' + context.following.name + '.'}</p>}
          {canCompare && bounds && <p className="text-xs text-muted">{masterDefinition?.name}: {bounds.start === null ? 'Start unspecified' : comparisonDateLabel(masterClock.axis!, bounds.start, text, true)} - {bounds.end === null ? 'End unspecified' : comparisonDateLabel(masterClock.axis!, bounds.end - 1n, text, true)}</p>}
          <div className="flex flex-wrap gap-3 text-sm">
            <button className="min-h-11 underline" onClick={() => onTimeline(track, selected.id)}>View on Timeline</button>
            {canCompare && <button className="min-h-11 underline" onClick={() => onTimeline(track, selected.id, true)}>Compare on Timeline</button>}
          </div>
        </section>
        <section className="space-y-3" aria-label="Defining historical events">
          <h3 className={META_SECTION_LABEL_CLASS}>{importance.MINOR || importance.NOTICE ? 'Selected historical events' : 'Selected major events'}</h3>
          <div className="flex flex-wrap gap-4 text-sm">{(['MAJOR', 'MINOR', 'NOTICE'] as const).map(level => <label key={level} className="inline-flex min-h-11 items-center gap-2">
            <input type="checkbox" checked={importance[level]} onChange={e => setImportance(value => ({ ...value, [level]: e.target.checked }))} />{level === 'MAJOR' ? 'Major' : level === 'MINOR' ? 'Minor' : 'Notice'}
          </label>)}</div>
          <p className="text-xs text-muted">A sample of up to five loaded matching occurrences. {coverage.message}</p>
          {coverage.warnings.length > 0 && <p className="text-xs text-muted" role="status">Expansion warnings: {coverage.warnings.join(', ')}</p>}
          {!events.length && <p className="text-sm text-muted">{!axis || !bounds ? 'Events cannot be positioned reliably.' : 'No loaded matching events in this period.'}</p>}
          <ul className="divide-y divide-border/40">{events.map(row => <li key={row.key}>
            <button className="min-h-11 w-full py-3 text-left" onClick={() => setSelectedKey(row.key)}>
              <span className="block text-sm font-medium">{row.representative.title}</span>
              <span className="block text-xs text-muted">{comparisonDateLabel(axis!, row.start, text)}{row.end - row.start > 1440n && ' - ' + comparisonDateLabel(axis!, row.end - 1440n, text) + ' - ' + String((row.end - row.start) / 1440n) + ' days'}
                {row.representative.categoryId && ' - ' + (bundle.categories.find(category => category.id === row.representative.categoryId)?.name ?? '')}
                {bounds?.start != null && row.start < bounds.start && ' - Began before this era'}{bounds?.end != null && row.end > bounds.end && ' - Continues beyond this era'}</span>
            </button>
          </li>)}</ul>
          <button className="min-h-11 text-sm underline" onClick={() => onTimeline(track, selected.id)}>View all on Timeline</button>
        </section>
        {selected.canManage && <details className="text-sm">
          <summary className="min-h-11 cursor-pointer py-3">Manage era</summary>
          <div className="flex flex-wrap gap-3 [&_button]:min-h-11">
            <button disabled={busy} onClick={() => open(selected)}>Edit era</button>
            <button disabled={busy || !definition} onClick={() => open(selected, true)}>Close era...</button>
            {!selected.isCurrent && <button disabled={busy} onClick={() => void perform(() => saveEra(ledger.campaignHandle, { ...selected, isCurrent: true }, selected.id))}>Make current</button>}
            <button disabled={busy || selectedTrackEras[0]?.id === selected.id} onClick={() => void move(-1)}>Move up</button>
            <button disabled={busy || selectedTrackEras.at(-1)?.id === selected.id} onClick={() => void move(1)}>Move down</button>
            <button disabled={busy} onClick={() => void perform(async () => setImpact({ era: selected, details: await fetchEraImpact(ledger.campaignHandle, selected.id) }), false)}>Delete era...</button>
          </div><p className="text-xs text-muted">Reordering changes display order, not historical dates.</p>
        </details>}
      </article> : <p className="text-sm text-muted">{!bundle.calendars.length ? 'No calendars available.' : params.has('era') || !bundle.calendars.some(row => row.id === track) ? 'This era or calendar is unavailable. Select an available period.' : 'No eras configured for this calendar.'}</p>}
    </div>
    <ChronologyEventSidebar campaignHandle={ledger.campaignHandle} baseEvent={bundle.baseEvents.find(base => base.id === inspection?.baseEventId) ?? null}
      categories={bundle.categories} editableEvents={bundle.baseEvents} calendarLike={axis?.calendar ?? null} canManage={ledger.canManage}
      open={!!inspection} occurrence={occurrence} dateSeed={occurrence?.start} onClose={() => setSelectedKey(null)}
      onMutated={ledger.onEventMutated} onDeleted={async () => { setSelectedKey(null); await ledger.onEventDeleted(); }} onRevealEvent={ledger.onRevealEvent} />
    {draft && like && <EraDialog title={editing ? 'Edit era' : 'Add era'} busy={busy} onClose={() => setDraft(null)}>
      <form className="space-y-4" onSubmit={e => { e.preventDefault(); void perform(async () => { const result = await saveEra(ledger.campaignHandle, draft, editing); setDraft(null); const next = new URLSearchParams(params); next.set('track', result.era.calendarId); next.set('era', result.era.id); setParams(next); setSelectedKey(null); }); }}>
        <h2 className={TYPE_DISPLAY_CLASS}>{editing ? 'Edit era' : 'Add era'}</h2>
        <label className="block">Timeline <select disabled={!!editing} value={draft.calendarId} onChange={e => setDraft({ ...draft, calendarId: e.target.value, startDate: null, endDate: null })}>{bundle.calendars.map(row => <option key={row.id} value={row.id}>{row.name}</option>)}</select></label>
        <label className="block">Name <input required maxLength={120} value={draft.name} onChange={e => setDraft({ ...draft, name: e.target.value })} /></label>
        {(['startDate', 'endDate'] as const).map(key => <fieldset key={key}><legend>{key === 'startDate' ? 'Start date' : 'End date (inclusive)'}</legend>
          <label><input type="checkbox" checked={draft[key] != null} onChange={e => setDraft({ ...draft, [key]: e.target.checked ? { year: calendar!.state.year, month: calendar!.state.monthIndex, day: calendar!.state.day } : null })} />{key === 'startDate' ? 'Set a start date' : 'Set an end date'}</label>
          {draft[key] && <FantasyDatePicker calendar={like} value={draft[key]!} onChange={value => {
            const date = { year: value.year ?? 1, month: value.month ?? 0, day: value.day ?? 1 };
            const future = key === 'startDate' && compareEraDates(date, { year: calendar!.state.year, month: calendar!.state.monthIndex, day: calendar!.state.day }) > 0;
            setDraft({ ...draft, [key]: date, ...(!editing && !visibilityTouched && elevated && future ? { visibility: 'DM_ONLY' as const } : {}) });
          }} />}</fieldset>)}
        <label>Visibility <select value={draft.visibility} onChange={e => { setVisibilityTouched(true); setDraft({ ...draft, visibility: e.target.value as EraInput['visibility'] }); }}><option value="PUBLIC">Public</option><option value="PARTY">Party</option>{elevated && <option value="DM_ONLY">DM only</option>}</select></label>
        <label className="block"><input type="checkbox" checked={draft.isCurrent} onChange={e => setDraft({ ...draft, isCurrent: e.target.checked })} /> Make current</label>
        <p>Overview</p><WikiTipTapEditor content={draft.overview ?? ''} onChange={overview => setDraft({ ...draft, overview })} wikiTree={[]} />
        {error && <p role="alert">{error}</p>}
        <div className="flex gap-3"><button disabled={busy} type="button" onClick={() => setDraft(null)}>Cancel</button><button disabled={busy} type="submit">Save era</button></div>
      </form>
    </EraDialog>}
    {impact && <EraDialog title="Delete era" busy={busy} onClose={() => setImpact(null)}><div className="space-y-4">
      <h2 className={TYPE_DISPLAY_CLASS}>Delete “{impact.era.name}”?</h2>
      <p>{impact.details.events} chronology events · {impact.details.trajectories} progression references · {impact.details.recurringRules} recurring rules · Overview ({impact.details.overviewWords} words)</p>
      <p>Events and progression content will remain. Era references will be removed, preserving the former name. Future repeating events will use the remaining eras.</p>
      <p>The era Overview will be deleted. Links to it will become broken links.</p>
      <button disabled={busy} onClick={() => setImpact(null)}>Cancel</button>{' '}<button disabled={busy} onClick={() => void perform(async () => { await deleteEra(ledger.campaignHandle, impact.era.id); setImpact(null); if (selected?.id === impact.era.id) filter('era', ''); })}>Delete era and Overview</button>
    </div></EraDialog>}
  </div>;
}

function inspectionOccurrence(row: HistoricalInterval, axis: NonNullable<ReturnType<typeof historicalClock>['axis']>) {
  const start = historicalNativeState(axis, row.start), end = historicalNativeState(axis, row.end - 1440n);
  return start && end ? { ...row.representative,
    start: { year: start.year, month: start.monthIndex, day: start.day, monthName: start.monthName, epochMinute: String(row.start) },
    end: { year: end.year, month: end.monthIndex, day: end.day, monthName: end.monthName, epochMinute: String(row.end - 1440n) } } : null;
}

/** Native modal preserves focus containment and restoration without another editor. */
function EraDialog({ title, busy, onClose, children }: { title: string; busy: boolean; onClose: () => void; children: ReactNode }) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    const dialog = ref.current!; dialog.showModal();
    return () => { dialog.close(); if (previous?.isConnected) previous.focus(); };
  }, []);
  return createPortal(<dialog ref={ref} aria-label={title} onCancel={e => { e.preventDefault(); if (!busy) onClose(); }}
    className="m-auto max-h-[100dvh] min-h-[100dvh] w-full max-w-none overflow-y-auto bg-background p-6 text-foreground backdrop:bg-black/60 md:min-h-0 md:max-h-[90dvh] md:max-w-2xl md:rounded-xl">{children}</dialog>, document.body);
}
