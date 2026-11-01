import { ChronologyCategoryLabel } from './ChronologyCategoryLabel';
import { ChronologyPageLink } from './ChronologyPageLink';
import { ChevronLeft, ChevronRight, MoreHorizontal, Plus } from 'lucide-react';
import { ChronologyImportance } from './ChronologyImportance';
import { ChronologyCoverageNotice } from './ChronologyCoverageNotice';
import { useEffect, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { chronologyTargetSignature, intervalOccurrence } from '@/lib/chronologyNavigation';
import { createPortal } from 'react-dom';
import { Link, useSearchParams, useNavigate, useParams } from 'react-router-dom';
import { useWiki } from '@/contexts/WikiContext';
import { CampaignCapabilities } from '@shared/campaignPolicy/capabilities';
import { compareEraDates, eraContainsDate, type ChronologyEra, type EraDate, type EraInput, type EraDeletionImpact } from '@shared/chronologyEras';
import { saveEra, deleteEra, fetchEraImpact, reorderEras } from '@/lib/chronologyErasApi';
import { ChronologyEventSidebar } from './ChronologyEventSidebar';
import { comparisonDateLabel, useComparisonText } from './comparisonText';
import { historicalClock, sharedHistoricalIntervals } from '@/lib/historicalTimeline';
import { eraBounds, eraDateSummary, selectedEraEvents, selectWorkspaceEra } from '@/lib/eraWorkspace';
import { campaignWikiPath, campaignEraPath, campaignWorkspaceIndexPath } from '@/lib/campaignPaths';
import type { ChronologyTimelineBundle, TimelineOccurrenceRecord } from '@/lib/chronologyApi';
import type { TimeTrackingBundle } from '@/lib/timeTrackingApi';
import { FantasyDatePicker } from './FantasyDatePicker';
import { WikiTipTapEditor } from '@/components/wiki/WikiTipTapEditor';
import { WikiMarkdown } from '@/components/wiki/WikiMarkdown';
import { TYPE_DISPLAY_CLASS, META_SECTION_LABEL_CLASS } from '@/lib/surfaceLayout';
import { resolveMonthName } from '@/lib/timeEngine';

export interface ErasSession {
  signature?: string;
  snapshot?: { track: string; era: string | null; importance: Record<'MAJOR' | 'MINOR' | 'NOTICE', boolean> };
}
interface Props {
  onInspectionChange?: (occurrence: TimelineOccurrenceRecord | null) => void;
  session?: ErasSession;
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
export function ErasView({ bundle, onErasChanged, onTimeline, session, onInspectionChange, ...ledger }: Props) {
  const { can, flatPages } = useWiki();
  const elevated = can(CampaignCapabilities.NARRATIVE_ELEVATED_VIEW);
  const text = useComparisonText();
  const [params, setParams] = useSearchParams();
  const navigate = useNavigate();
  const route = useParams();
  const eras = bundle.eras ?? [];
  const defaultTrack = bundle.calendars.find(row => row.isMasterTime)?.id ?? bundle.calendars[0]?.id ?? '';
  const signature = chronologyTargetSignature(params);
  const [pendingRestore, setPendingRestore] = useState(() => ({
    signature, snapshot: params.get('focus') !== 'eras' ? session?.snapshot : undefined,
  }));
  if (pendingRestore.signature !== signature) setPendingRestore({ signature, snapshot: undefined });
  const restore = pendingRestore.signature === signature ? pendingRestore.snapshot : undefined;
  const requestedEra = route.eraSlug ? eras.find(era => era.id === route.eraSlug || era.slugAliases?.includes(route.eraSlug!))?.id ?? route.eraSlug : restore?.era ?? params.get('era');
  const linkedEra = eras.find(row => row.id === requestedEra);
  const track = route.eraSlug && linkedEra ? linkedEra.calendarId : restore?.track ?? params.get('track') ?? linkedEra?.calendarId ?? defaultTrack;
  const trackEras = useMemo(() => (bundle.eras ?? []).filter(era => era.calendarId === track)
    .sort((a, b) => a.sortOrder - b.sortOrder || a.id.localeCompare(b.id)), [bundle.eras, track]);
  const definition = ledger.timeBundle.calendars.find(row => row.id === track);
  const clock = useMemo(() => definition ? historicalClock(definition) : null, [definition]);
  const axis = clock?.axis;
  const today = useMemo(() => definition ? { year: definition.state.year, month: definition.state.monthIndex, day: definition.state.day } : undefined, [definition]);
  const selected = bundle.calendars.some(row => row.id === track) ? selectWorkspaceEra(trackEras, requestedEra, today) : undefined;
  const eraId = selected?.id ?? '';
  const selectedTrackEras = trackEras;
  const [importance, setImportance] = useState(session?.snapshot?.importance ?? { MAJOR: true, MINOR: false, NOTICE: false });
  useLayoutEffect(() => {
    if (session) { session.signature = signature; session.snapshot = { track, era: requestedEra ?? selected?.id ?? null, importance }; }
  }, [session, signature, track, requestedEra, selected?.id, importance]);
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const intervals = useMemo(() => {
    const bases = new Set(bundle.baseEvents.filter(row => row.calendarId === track).map(row => row.id));
    return axis ? sharedHistoricalIntervals(bundle.occurrences.filter(row => row.calendarId === track && bases.has(row.baseEventId)), axis) : [];
  }, [axis, bundle.occurrences, bundle.baseEvents, track]);
  const matchingEvents = useMemo(() => axis && selected ? selectedEraEvents(intervals, selected, axis, importance) : [], [axis, intervals, selected, importance]);
  const events = matchingEvents.slice(0, 5);
  const inspection = events.find(row => row.key === selectedKey);
  useEffect(() => { if (!inspection) setSelectedKey(null); }, [inspection]);
  const selectedIndex = trackEras.findIndex(era => era.id === selected?.id);
  const previous = trackEras[selectedIndex - 1];
  const nextEra = selectedIndex >= 0 ? trackEras[selectedIndex + 1] : undefined;
  const bounds = useMemo(() => axis && selected ? eraBounds(selected, axis) : null, [axis, selected]);
  const masterDefinition = ledger.timeBundle.calendars.find(row => row.id === defaultTrack);
  const masterClock = useMemo(() => masterDefinition ? historicalClock(masterDefinition) : null, [masterDefinition]);
  const canCompare = track !== defaultTrack && clock?.aligned && masterClock?.aligned && masterClock.axis;
  const occurrence = inspection && axis ? intervalOccurrence(inspection, axis) : null;
  useEffect(() => { onInspectionChange?.(occurrence); }, [occurrence, onInspectionChange]);
  const [draft, setDraft] = useState<EraInput | null>(null);
  const [editing, setEditing] = useState<string | undefined>();
  const [savedEraPath, setSavedEraPath] = useState<string | null>(null);
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
  const dateLabel = (date: EraDate) => `${axis ? resolveMonthName(axis.calendar, date.year, date.month) : `Month ${date.month + 1}`} ${date.day}, Year ${date.year}`;
  function filter(key: string, value: string) {
    if (route.eraSlug && key === 'era') { navigate(campaignEraPath(ledger.campaignHandle, eras.find(era => era.id === value)?.slug ?? value)); return; }
    if (route.eraSlug && key === 'track') { navigate(campaignEraPath(ledger.campaignHandle, '') + '?track=' + encodeURIComponent(value)); return; }
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
    setSavedEraPath(null);
    setEditing(era?.id); setVisibilityTouched(false);
    const state = ledger.timeBundle.calendars.find(row => row.id === era?.calendarId)?.state;
    setDraft(era ? { calendarId: era.calendarId, name: era.name, startDate: era.startDate, endDate: era.endDate, visibility: era.visibility, isCurrent: era.isCurrent, description: era.description, ...(close && state ? { endDate: { year: state.year, month: state.monthIndex, day: state.day } } : {}) } : { calendarId: track || defaultTrack, name: '', startDate: null, endDate: null, visibility: 'PARTY', isCurrent: false, description: null });
  }
  async function move(delta: number) {
    if (!selected) return;
    const ids = selectedTrackEras.map(era => era.id); const index = ids.indexOf(selected.id); const target = index + delta;
    if (target < 0 || target >= ids.length) return;
    [ids[index], ids[target]] = [ids[target]!, ids[index]!];
    await perform(() => reorderEras(ledger.campaignHandle, selected.calendarId, ids));
  }
  return <div className="relative flex h-full min-w-0 flex-col gap-4 overflow-y-auto p-4 [&_select]:rounded [&_select]:border [&_select]:border-border [&_select]:bg-background [&_select]:px-2 [&_select]:py-1 [&_input:not([type=checkbox])]:rounded [&_input:not([type=checkbox])]:border [&_input:not([type=checkbox])]:border-border [&_input:not([type=checkbox])]:bg-background [&_input:not([type=checkbox])]:px-2 [&_input:not([type=checkbox])]:py-1 [&_button]:disabled:opacity-50">
    <div className="flex min-w-0 flex-wrap items-end gap-3 border-b border-border/40 pb-4 text-sm">
      <label className="flex min-w-0 max-w-full flex-col gap-1 text-muted">Calendar
        <select className="min-h-11 max-w-full text-foreground" value={track} onChange={e => filter('track', e.target.value)}>
          {!bundle.calendars.some(row => row.id === track) && <option value={track}>Calendar unavailable</option>}
          {bundle.calendars.map(row => <option key={row.id} value={row.id}>{row.name}</option>)}
        </select>
      </label>
      <label className="flex min-w-0 max-w-full flex-col gap-1 text-muted">Era
        <select className="min-h-11 max-w-full text-foreground" value={eraId} onChange={e => filter('era', e.target.value)}>
          {!selected && <option value="">Select an era</option>}
          {trackEras.map(era => <option key={era.id} value={era.id}>{era.name}{era.isCurrent ? ' - Current' : ''}</option>)}
        </select>
      </label>
      {ledger.canManage && <button className="inline-flex min-h-11 items-center gap-2 rounded border border-border px-3 hover:bg-elevated sm:ml-auto" disabled={busy || !definition || !bundle.calendars.some(row => row.id === track)} onClick={() => open()}><Plus className="size-4" aria-hidden />Create era</button>}
    </div>
    <Link className="text-sm text-muted underline" to={campaignWorkspaceIndexPath(ledger.campaignHandle, 'era-pages')}>Browse authored era pages</Link>
    {error && <p role="alert" className="text-red-500">{error}</p>}
    {selected ? <article className="min-w-0 space-y-8 pt-2">
      <header className="space-y-2">
        <div className="relative flex flex-wrap items-center gap-x-4 gap-y-2">
          <h2 className={TYPE_DISPLAY_CLASS + ' min-w-0 break-words'}>{selected.name}</h2>
          {selected.canManage && <div className="flex items-center gap-1 text-sm">
            <button className="min-h-11 rounded px-3 hover:bg-elevated" disabled={busy} onClick={() => open(selected)}>Edit era</button>
            <details key={selected.id} onKeyDown={e => {
              if (e.key === 'Escape') { e.currentTarget.open = false; e.currentTarget.querySelector('summary')?.focus(); }
            }} onBlur={e => { if (!e.currentTarget.contains(e.relatedTarget as Node | null)) e.currentTarget.open = false; }}>
              <summary aria-label="More era actions" className="flex min-h-11 min-w-11 cursor-pointer list-none items-center justify-center rounded hover:bg-elevated [&::-webkit-details-marker]:hidden"><MoreHorizontal className="size-5" aria-hidden /></summary>
              <div className="absolute right-0 top-full z-20 w-56 max-w-full rounded-lg border border-border bg-background p-1 shadow-lg [&_button]:min-h-11 [&_button]:w-full [&_button]:rounded [&_button]:px-3 [&_button]:text-left [&_button:hover]:bg-elevated" onClick={e => {
                if ((e.target as HTMLElement).closest('button, a')) e.currentTarget.closest('details')?.removeAttribute('open');
              }}>
                <button disabled={busy || !definition} onClick={() => open(selected, true)}>Close era...</button>
                {!selected.isCurrent && <button disabled={busy} onClick={() => void perform(() => saveEra(ledger.campaignHandle, { ...selected, isCurrent: true }, selected.id))}>Make current</button>}
                <button disabled={busy || !previous} onClick={() => void move(-1)}>Move up</button>
                <button disabled={busy || !nextEra} onClick={() => void move(1)}>Move down</button>
                {flatPages.some(page => page.id === selected.overviewPageId) && <Link className="flex min-h-11 items-center rounded px-3 hover:bg-elevated" to={campaignWikiPath(ledger.campaignHandle, selected.overviewPageId!, flatPages)}>Open overview</Link>}
                <button className="text-red-500" disabled={busy} onClick={() => void perform(async () => setImpact({ era: selected, details: await fetchEraImpact(ledger.campaignHandle, selected.id) }), false)}>Delete era...</button>
              </div>
            </details>
          </div>}
        </div>
        <p className="flex flex-wrap items-center gap-x-2 text-sm text-muted">
          <span>{selected.calendarName}</span><span aria-hidden>·</span>
          <button className="min-h-11 text-left underline decoration-border underline-offset-4 hover:text-foreground" aria-label={'Open ' + selected.name + ' on Timeline'} onClick={() => onTimeline(track, selected.id)}>{eraDateSummary(selected, dateLabel)}</button>
          {bounds?.start != null && bounds.end != null && <><span aria-hidden>·</span><span>{String((bounds.end - bounds.start) / 1440n)} {(bounds.end - bounds.start) / 1440n === 1n ? 'day' : 'days'}</span></>}
          <span aria-hidden>·</span><span>{selected.visibility === 'DM_ONLY' ? 'DM only' : selected.visibility === 'PARTY' ? 'Party' : 'Public'}</span>
        </p>
        {(selected.isCurrent || (today && eraContainsDate(selected, today))) && <p className="text-xs text-muted">
          {selected.isCurrent && <span>Current era</span>}
          {today && eraContainsDate(selected, today) && <span>{selected.isCurrent && ' · '}Contains campaign today</span>}
        </p>}
      </header>
      <ChronologyPageLink key={selected.id} type="eras" canManage={selected.canManage} id={selected.id} title={selected.name} pageId={selected.overviewPageId} description={selected.overview} onChanged={onErasChanged} />
      <Link className="text-sm text-muted underline" to={campaignEraPath(ledger.campaignHandle, selected.slug ?? selected.id)}>Link to this era</Link>
      <section className="type-prose max-w-[80ch]" aria-label="Era overview">
        {selected.overview.trim() ? <WikiMarkdown content={selected.overview} /> : selected.canManage ? <div className="space-y-1 border-l-2 border-border/60 pl-4">
          <p className="text-sm text-muted">Tell the story of this era.</p>
          <button className="min-h-11 text-sm underline underline-offset-4" disabled={busy} onClick={() => open(selected)}>Add description</button>
        </div> : <p className="text-sm text-muted">No overview yet.</p>}
      </section>
      <nav className="space-y-2 border-y border-border/40 py-4" aria-label="Historical context">
        <h3 className={META_SECTION_LABEL_CLASS}>Historical context</h3>
        <div className="flex min-w-0 flex-wrap items-center gap-x-6 gap-y-3 text-sm">
          {previous ? <button className="flex min-h-11 min-w-0 items-center gap-2 text-left hover:underline" onClick={() => filter('era', previous.id)}>
            <ChevronLeft className="size-4 shrink-0 text-muted" aria-hidden /><span className="min-w-0 break-words"><span className="block text-xs text-muted">Previous era</span>{previous.name}</span>
          </button> : <span className="text-xs text-muted">No previous era</span>}
          <span aria-current="true" className="min-w-0 border-l-2 border-primary pl-3"><span className="block text-xs text-muted">Selected era</span><span className="break-words font-medium">{selected.name}</span></span>
          {nextEra ? <button className="flex min-h-11 min-w-0 items-center gap-2 text-left hover:underline" onClick={() => filter('era', nextEra.id)}>
            <span className="min-w-0 break-words"><span className="block text-xs text-muted">Next era</span>{nextEra.name}</span><ChevronRight className="size-4 shrink-0 text-muted" aria-hidden />
          </button> : <span className="text-xs text-muted">No next era</span>}
        </div>
        {canCompare && <button className="min-h-11 text-xs text-muted underline" onClick={() => onTimeline(track, selected.id, true)}>Compare on Timeline</button>}
      </nav>
      <section className="space-y-3" aria-label="Events in this era">
        <h3 className={META_SECTION_LABEL_CLASS}>Events in this era</h3>
        <div className="flex flex-wrap gap-4 text-sm">{(['MAJOR', 'MINOR', 'NOTICE'] as const).map(level => <label key={level} className="inline-flex min-h-11 items-center gap-2">
          <input type="checkbox" checked={importance[level]} onChange={e => setImportance(value => ({ ...value, [level]: e.target.checked }))} />{level === 'MAJOR' ? 'Major' : level === 'MINOR' ? 'Minor' : 'Notice'}
        </label>)}</div>
        {!events.length && <p className="py-3 text-sm text-muted">No matching events in this era.</p>}
        {!matchingEvents.length && bundle.expansionMetadata.generated.truncated && <ChronologyCoverageNotice metadata={bundle.expansionMetadata} />}
        <ul className="divide-y divide-border/40">{events.map(row => <li key={row.key}>
          <button className="flex min-h-11 w-full flex-wrap items-center justify-between gap-x-6 gap-y-1 rounded px-2 py-3 text-left hover:bg-elevated" aria-expanded={selectedKey === row.key} onClick={() => setSelectedKey(row.key)}>
            <span className="min-w-0 space-y-1">
              <span className="block break-words text-sm font-medium">{row.representative.title}</span>
              <span className="block text-xs text-muted"><ChronologyImportance value={row.representative.importance} />
                {' · '}<ChronologyCategoryLabel category={bundle.categories.find(category => category.id === row.representative.categoryId)} />
                {bounds?.start != null && row.start < bounds.start && ' · Began before this era'}{bounds?.end != null && row.end > bounds.end && ' · Continues beyond this era'}</span>
            </span>
            <span className="text-xs text-muted">{comparisonDateLabel(axis!, row.start, text)}{row.end - row.start > 1440n && ' – ' + comparisonDateLabel(axis!, row.end - 1440n, text)}</span>
          </button>
        </li>)}</ul>
        {matchingEvents.length > events.length && <button className="min-h-11 text-sm underline underline-offset-4" onClick={() => onTimeline(track, selected.id)}>Show all events</button>}
      </section>
    </article> : <p className="text-sm text-muted">{!bundle.calendars.length ? 'No calendars available.' : params.has('era') || !bundle.calendars.some(row => row.id === track) ? 'This era or calendar is unavailable. Select an available period.' : 'No eras configured for this calendar.'}</p>}
    <ChronologyEventSidebar campaignHandle={ledger.campaignHandle} timeBundle={ledger.timeBundle} baseEvent={bundle.baseEvents.find(base => base.id === inspection?.baseEventId) ?? null}
      calendarName={definition?.name} categories={bundle.categories} editableEvents={bundle.baseEvents} calendarLike={axis?.calendar ?? null} canManage={ledger.canManage}
      open={!!inspection} occurrence={occurrence} dateSeed={occurrence?.start} onClose={() => setSelectedKey(null)}
      onMutated={ledger.onEventMutated} onDeleted={async () => { setSelectedKey(null); await ledger.onEventDeleted(); }} onRevealEvent={ledger.onRevealEvent} />
    {draft && like && <EraDialog title={editing ? 'Edit era' : 'Create era'} busy={busy} onClose={() => setDraft(null)}>
      <form className="space-y-4" onSubmit={e => { e.preventDefault(); void perform(async () => {
        let path = savedEraPath;
        if (!path) {
          const result = await saveEra(ledger.campaignHandle, draft, editing);
          path = campaignEraPath(ledger.campaignHandle, result.era.slug ?? result.era.id);
          setSavedEraPath(path);
        }
        await onErasChanged(); setDraft(null); navigate(path); setSelectedKey(null);
      }, false); }}>
        <fieldset disabled={busy || !!savedEraPath} className="space-y-4">
        <h2 className={TYPE_DISPLAY_CLASS}>{editing ? 'Edit era' : 'Create era'}</h2>
        <label className="block">Calendar <select disabled={!!editing} value={draft.calendarId} onChange={e => setDraft({ ...draft, calendarId: e.target.value, startDate: null, endDate: null })}>{bundle.calendars.map(row => <option key={row.id} value={row.id}>{row.name}</option>)}</select></label>
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
        <p>Description</p><WikiTipTapEditor content={draft.description ?? ''} onChange={description => setDraft({ ...draft, description })} wikiTree={[]} />
        </fieldset>
        {error && <p role="alert">{error}</p>}
        <div className="flex gap-3"><button disabled={busy} type="button" onClick={() => setDraft(null)}>Cancel</button><button disabled={busy} type="submit">{savedEraPath ? 'Retry refresh' : 'Save era'}</button></div>
      </form>
    </EraDialog>}
    {impact && <EraDialog title="Delete era" busy={busy} onClose={() => setImpact(null)}><div className="space-y-4">
      <h2 className={TYPE_DISPLAY_CLASS}>Delete “{impact.era.name}”?</h2>
      <p>{impact.details.events} chronology events · {impact.details.trajectories} progression references · {impact.details.recurringRules} recurring rules · Overview ({impact.details.overviewWords} words)</p>
      <p>Events and progression content will remain. Era references will be removed, preserving the former name. Future repeating events will use the remaining eras.</p>
      <p>Linked pages will remain available in the wiki.</p>
      {error && <p role="alert">{error}</p>}
      <button disabled={busy} onClick={() => setImpact(null)}>Cancel</button>{' '}<button disabled={busy} onClick={() => void perform(async () => { await deleteEra(ledger.campaignHandle, impact.era.id); setImpact(null); if (selected?.id === impact.era.id) navigate(campaignEraPath(ledger.campaignHandle, '')); })}>Delete era</button>
    </div></EraDialog>}
  </div>;
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
