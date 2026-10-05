import { useState, type ComponentProps } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useWiki } from '@/contexts/WikiContext';
import { CampaignCapabilities } from '@shared/campaignPolicy/capabilities';
import { compareEraDates, type ChronologyEra, type EraDate, type EraInput, type EraDeletionImpact } from '@shared/chronologyEras';
import { saveEra, deleteEra, fetchEraImpact, reorderEras } from '@/lib/chronologyErasApi';
import { EventsLedgerView } from './EventsLedgerView';
import { FantasyDatePicker } from './FantasyDatePicker';
import { WikiTipTapEditor } from '@/components/wiki/WikiTipTapEditor';
import { WikiMarkdown } from '@/components/wiki/WikiMarkdown';
import { TYPE_DISPLAY_CLASS } from '@/lib/surfaceLayout';
import { resolveMonthName } from '@/lib/timeEngine';

type Props = ComponentProps<typeof EventsLedgerView> & { eras: ChronologyEra[]; onErasChanged: () => void | Promise<void> };
export function ErasView({ eras, onErasChanged, ...ledger }: Props) {
  const { can } = useWiki();
  const elevated = can(CampaignCapabilities.NARRATIVE_ELEVATED_VIEW);
  const [params, setParams] = useSearchParams();
  const defaultTrack = ledger.calendars.find(row => row.isMasterTime)?.id ?? ledger.calendars[0]?.id ?? '';
  const track = params.get('track') ?? defaultTrack;
  const trackEras = eras.filter(era => !track || era.calendarId === track).sort((a, b) => a.sortOrder - b.sortOrder);
  const eraId = params.get('era') ?? (track ? trackEras.find(era => era.isCurrent)?.id ?? '' : '');
  const selected = trackEras.find(era => era.id === eraId);
  const selectedTrackEras = selected ? trackEras.filter(era => era.calendarId === selected.calendarId) : [];
  const [year, setYear] = useState('');
  const [search, setSearch] = useState('');
  const [draft, setDraft] = useState<EraInput | null>(null);
  const [editing, setEditing] = useState<string | undefined>();
  const [visibilityTouched, setVisibilityTouched] = useState(false);
  const [impact, setImpact] = useState<EraDeletionImpact | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const calendar = ledger.timeBundle.calendars.find(row => row.id === (draft?.calendarId ?? selected?.calendarId ?? track));
  const like = calendar ? { ...calendar, epochOffset: BigInt(calendar.epochOffset) } : null;
  const dateLabel = (date: EraDate | null, fallback: string) => date && like
    ? `Year ${date.year}, ${resolveMonthName(like, date.year, date.month)} ${date.day}` : fallback;
  const matching = ledger.events.filter(event => (!track || event.calendarId === track)
    && (!selected || event.eraIds?.includes(selected.id)));
  const years = [...new Set(matching.map(event => event.start.year).filter((v): v is number => v != null))].sort((a, b) => a - b);
  function filter(key: string, value: string) {
    const next = new URLSearchParams(params); next.set(key, value);
    if (key === 'track') next.delete('era');
    setParams(next); setYear('');
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
  return <div className="flex h-full flex-col gap-4 overflow-auto p-4 [&_select]:rounded [&_select]:border [&_select]:border-border [&_select]:bg-background [&_select]:px-2 [&_select]:py-1 [&_input:not([type=checkbox])]:rounded [&_input:not([type=checkbox])]:border [&_input:not([type=checkbox])]:border-border [&_input:not([type=checkbox])]:bg-background [&_input:not([type=checkbox])]:px-2 [&_input:not([type=checkbox])]:py-1 [&_button]:disabled:opacity-50">
    <div className="flex flex-wrap items-center gap-3">
      <label>Timeline <select value={track} onChange={e => filter('track', e.target.value)}><option value="">All</option>{ledger.calendars.map(row => <option key={row.id} value={row.id}>{row.name}</option>)}</select></label>
      <label>Era <select value={eraId} onChange={e => filter('era', e.target.value)}><option value="">All</option>{trackEras.map(era => <option key={era.id} value={era.id}>{era.name}{era.visibility === 'DM_ONLY' ? ' [DM]' : ''}</option>)}</select></label>
      <label>Year <select value={year} onChange={e => setYear(e.target.value)}><option value="">All</option>{years.map(value => <option key={value}>{value}</option>)}</select></label>
      <input aria-label="Search events" placeholder="Search events…" value={search} onChange={e => setSearch(e.target.value)} />
      {ledger.canManage && <button disabled={!defaultTrack} onClick={() => open()}>+ Add era</button>}
    </div>
    {error && <p role="alert" className="text-red-500">{error}</p>}
    {selected && <article className="space-y-3">
      <h2 className={TYPE_DISPLAY_CLASS}>{selected.name}</h2>
      <p className="text-sm text-muted">{selected.calendarName} · {dateLabel(selected.startDate, 'No start date')} → {dateLabel(selected.endDate, 'No end date')}
        {selected.isCurrent && ' · Current'}{selected.status !== 'PRESENT' && ` · ${selected.status === 'FUTURE' ? 'Future' : 'Past'}`}{selected.visibility === 'DM_ONLY' && ' · [DM]'}</p>
      <WikiMarkdown content={selected.overview} emptyLabel="No Overview yet." />
      {selected.canManage && <div className="flex flex-wrap gap-3 text-sm">
        <button disabled={busy} onClick={() => open(selected)}>Edit era</button>
        <button disabled={busy} onClick={() => open(selected, true)}>Close era…</button>
        {!selected.isCurrent && <button disabled={busy} onClick={() => void perform(() => saveEra(ledger.campaignHandle, { ...selected, isCurrent: true }, selected.id))}>Make current</button>}
        <button disabled={busy || selectedTrackEras[0]?.id === selected.id} onClick={() => void move(-1)}>Move earlier</button>
        <button disabled={busy || selectedTrackEras.at(-1)?.id === selected.id} onClick={() => void move(1)}>Move later</button>
        <button disabled={busy} onClick={() => void perform(async () => setImpact(await fetchEraImpact(ledger.campaignHandle, selected.id)), false)}>Delete era…</button>
      </div>}
    </article>}
    <div className="min-h-[360px] flex-1"><EventsLedgerView {...ledger} showYearHeadings timeBundle={{ ...ledger.timeBundle, calendars: track ? ledger.timeBundle.calendars.filter(row => row.id === track).map(row => ({ ...row, isMasterTime: true })) : ledger.timeBundle.calendars }} events={matching.filter(event => (!year || String(event.start.year) === year) && `${event.title} ${event.description ?? ''}`.toLowerCase().includes(search.toLowerCase()))} /></div>
    {draft && like && <div role="dialog" aria-modal="true" aria-label={editing ? 'Edit era' : 'Add era'} className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <form className="max-h-[90vh] w-full max-w-2xl space-y-4 overflow-auto rounded-xl bg-background p-6" onSubmit={e => { e.preventDefault(); void perform(async () => { const result = await saveEra(ledger.campaignHandle, draft, editing); setDraft(null); const next = new URLSearchParams(params); next.set('track', result.era.calendarId); next.set('era', result.era.id); setParams(next); setYear(''); }); }}>
        <h2 className={TYPE_DISPLAY_CLASS}>{editing ? 'Edit era' : 'Add era'}</h2>
        <label className="block">Timeline <select disabled={!!editing} value={draft.calendarId} onChange={e => setDraft({ ...draft, calendarId: e.target.value, startDate: null, endDate: null })}>{ledger.calendars.map(row => <option key={row.id} value={row.id}>{row.name}</option>)}</select></label>
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
        <div className="flex gap-3"><button type="button" onClick={() => setDraft(null)}>Cancel</button><button disabled={busy} type="submit">Save era</button></div>
      </form>
    </div>}
    {impact && selected && <div role="dialog" aria-modal="true" aria-label="Delete era" className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"><div className="max-w-lg space-y-4 rounded-xl bg-background p-6">
      <h2 className={TYPE_DISPLAY_CLASS}>Delete “{selected.name}”?</h2>
      <p>{impact.events} chronology events · {impact.trajectories} progression references · {impact.recurringRules} recurring rules · Overview ({impact.overviewWords} words)</p>
      <p>Events and progression content will remain. Era references will be removed, preserving the former name. Future repeating events will use the remaining eras.</p>
      <p>The era Overview will be deleted. Links to it will become broken links.</p>
      <button disabled={busy} onClick={() => setImpact(null)}>Cancel</button>{' '}<button disabled={busy} onClick={() => void perform(async () => { await deleteEra(ledger.campaignHandle, selected.id); setImpact(null); filter('era', ''); })}>Delete era and Overview</button>
    </div></div>}
  </div>;
}
