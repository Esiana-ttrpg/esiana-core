import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { Check, CircleHelp, Settings } from 'lucide-react';
import { resolveCanonicalEntityCategory } from '@shared/resolveCanonicalEntityCategory';
import type { DevelopmentHistoryRow, PendingDevelopmentRow, WorldDevelopmentPresentation } from '@shared/worldDevelopmentPresentation';
import { TYPE_DISPLAY_CLASS } from '@/lib/surfaceLayout';
import { useWiki } from '@/contexts/WikiContext';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { SessionTimeAdvanceModal } from '@/components/session/SessionTimeAdvanceModal';
import { campaignChronologyPath, campaignProgressionPath, campaignSettingsPath, campaignWorkspaceIndexPath } from '@/lib/campaignPaths';
import { platformGuidePath } from '@/lib/platformGuides';
import { convertEpochToCalendarState } from '@/lib/timeEngine';
import { calendarRowToLike } from '@/lib/chronologyCalendar';
import { fetchTimeTracking, masterCalendarFromBundle, type FantasyCalendarApiRow } from '@/lib/timeTrackingApi';
import { fetchDevelopmentHistory, fetchPendingDevelopments, resolveDevelopmentSuggestion, suggestOnDemandDevelopments, type SuggestDevelopmentsResult } from '@/lib/worldDevelopmentApi';

interface DevelopmentsSectionProps { campaignHandle: string }

function suggestResultMessage(result: SuggestDevelopmentsResult): string {
  if (result.suggestionsCreated > 0) return `Queued ${result.suggestionsCreated} development${result.suggestionsCreated === 1 ? '' : 's'}.`;
  switch (result.skipReason) {
    case 'disabled': return 'World Development is off for this campaign.';
    case 'paused': return 'World Development is paused. Change this in settings to suggest developments.';
    case 'no_pressure_signals': return 'No grounded development matched the campaign state yet.';
    case 'budget_exhausted': return "This campaign month's world activity limit has been reached.";
    default: return 'No new grounded developments were found. Existing suggestions may already cover them.';
  }
}

export function formatDevelopmentDate(epochMinute: string, calendar: FantasyCalendarApiRow | null): string | null {
  if (!calendar) return null;
  try {
    const state = convertEpochToCalendarState(BigInt(epochMinute), calendarRowToLike(calendar));
    return `${state.day} ${state.monthName}, ${state.year}`;
  } catch { return null; }
}

function RationalePanel({ lines }: { lines: PendingDevelopmentRow['rationale'] }) {
  if (lines.length === 0) return null;
  return <details className="mt-3 text-sm text-muted-foreground"><summary className="cursor-pointer select-none font-medium hover:text-foreground">Why this developed</summary><ul className="mt-2 list-disc space-y-1 pl-5">{lines.map((line, index) => <li key={`${line.kind}-${index}`}>{line.text}</li>)}</ul></details>;
}

function HeaderIconLink({ to, label, children }: { to: string; label: string; children: ReactNode }) {
  return <Link to={to} aria-label={label} title={label} className="rounded-md p-2 text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary">{children}</Link>;
}

export function DevelopmentsSection({ campaignHandle }: DevelopmentsSectionProps) {
  const { flatPages } = useWiki();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<WorldDevelopmentPresentation | null>(null);
  const [calendar, setCalendar] = useState<FantasyCalendarApiRow | null>(null);
  const [history, setHistory] = useState<DevelopmentHistoryRow[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editNarrative, setEditNarrative] = useState('');
  const [advanceOpen, setAdvanceOpen] = useState(false);

  const load = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const [presentation, time, applied] = await Promise.all([
        fetchPendingDevelopments(campaignHandle),
        fetchTimeTracking(campaignHandle).catch(() => null),
        fetchDevelopmentHistory(campaignHandle, { status: ['accepted'] }).catch(() => ({ history: [] })),
      ]);
      setData(presentation); setCalendar(masterCalendarFromBundle(time)); setHistory(applied.history.slice(0, 3));
    } catch (err) { setError(err instanceof Error ? err.message : 'Failed to load developments'); }
    finally { setLoading(false); }
  }, [campaignHandle]);

  useEffect(() => { void load(); }, [load]);

  async function handleResolve(row: PendingDevelopmentRow, action: 'accept' | 'dismiss') {
    setBusyId(row.id); setError(null);
    try {
      await resolveDevelopmentSuggestion(campaignHandle, row.id, {
        action, source: row.source, acceptTarget: row.proposedAcceptTarget ?? 'calendar_event',
        ...(action === 'accept' && editingId === row.id ? { title: editTitle.trim(), narrative: editNarrative.trim() || null } : {}),
      });
      setEditingId(null); await load();
    } catch (err) { setError(err instanceof Error ? err.message : 'Action failed'); }
    finally { setBusyId(null); }
  }

  async function handleSuggest() {
    setError(null); setInfo(null);
    try { const result = await suggestOnDemandDevelopments(campaignHandle); setInfo(suggestResultMessage(result)); await load(); }
    catch (err) { setError(err instanceof Error ? err.message : 'Suggest failed'); }
  }

  const currentDate = calendar ? `${calendar.state.day} ${calendar.state.monthName}, ${calendar.state.year}` : null;
  const activeFactions = useMemo(() => flatPages.filter((page) => resolveCanonicalEntityCategory(page, flatPages) === 'organizations'), [flatPages]);

  if (loading) return <LoadingSpinner label="Loading pending developments…" />;
  if (!data) return <p className="text-sm text-destructive">{error ?? 'Failed to load developments.'}</p>;

  const canSuggest = data.settings.enabled && !data.settings.paused;
  const stateLabel = !data.settings.enabled ? 'Off' : data.settings.paused ? 'Paused' : data.status.worldActivityLabel;

  return <div className="space-y-8">
    <header className="flex min-w-0 items-start justify-between gap-3 border-b border-border/40 pb-4">
      <div className="min-w-0">
        <h2 className={TYPE_DISPLAY_CLASS}>Developments</h2>
        <p className="mt-1 text-sm text-muted-foreground">World Development · {stateLabel}</p>
        <p className="text-sm text-muted-foreground">{data.status.generatedThisCampaignMonth} developments this campaign month · {data.pendingCount} awaiting review</p>
        {!data.settings.enabled ? <p className="mt-1 text-xs text-muted-foreground">Suggestions are disabled in campaign settings.</p> : null}
        {data.settings.paused ? <p className="mt-1 text-xs text-muted-foreground">New suggestions are paused; pending ones remain available.</p> : null}
      </div>
      <div className="flex shrink-0 items-center gap-1">
        <HeaderIconLink to={campaignSettingsPath(campaignHandle, 'world-development')} label="World Development settings"><Settings className="size-4" aria-hidden="true" /></HeaderIconLink>
        <HeaderIconLink to={platformGuidePath('world-development')} label="World Development help"><CircleHelp className="size-4" aria-hidden="true" /></HeaderIconLink>
      </div>
    </header>

    <section aria-labelledby="pending-developments-heading" className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h3 id="pending-developments-heading" className="text-lg font-semibold text-foreground">Pending ({data.pendingCount})</h3>
        <div className="flex flex-wrap gap-2">
          <button type="button" disabled={!canSuggest} onClick={() => void handleSuggest()} className="rounded-md border border-border px-3 py-1.5 text-sm hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50">Suggest developments</button>
          <button type="button" onClick={() => setAdvanceOpen(true)} className="rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground hover:bg-primary/90">Advance time</button>
        </div>
      </div>
      {info ? <p role="status" className="text-sm text-muted-foreground">{info}</p> : null}
      {error ? <p role="alert" className="text-sm text-destructive">{error}</p> : null}

      {data.pending.length === 0 ? <div className="space-y-5 py-3">
        <p className="text-base text-foreground">Nothing is waiting for review.</p>
        <div className="flex flex-wrap gap-2">
          <button type="button" disabled={!canSuggest} onClick={() => void handleSuggest()} className="rounded-md border border-border px-3 py-1.5 text-sm hover:bg-muted disabled:opacity-50">Suggest developments</button>
          <button type="button" onClick={() => setAdvanceOpen(true)} className="rounded-md bg-primary px-3 py-1.5 text-sm text-primary-foreground hover:bg-primary/90">Advance time</button>
        </div>
        <div className="border-t border-border/40 pt-4">
          <h4 className="text-sm font-semibold text-foreground">Ways to develop your world</h4>
          <div className="mt-2 flex flex-wrap gap-x-5 gap-y-2 text-sm">
            <Link className="text-primary hover:underline" to={campaignChronologyPath(campaignHandle, 'events')}>Create a world event</Link>
            {activeFactions.length === 0 ? <Link className="text-primary hover:underline" to={campaignWorkspaceIndexPath(campaignHandle, 'organizations')}>Create a faction</Link> : <Link className="text-primary hover:underline" to={campaignProgressionPath(campaignHandle, 'insights')}>Give a faction a direction</Link>}
            <button type="button" onClick={() => setAdvanceOpen(true)} className="text-left text-primary hover:underline">Advance campaign time</button>
          </div>
        </div>
      </div> : <ul className="space-y-3">{data.pending.map((row) => {
        const isEditing = editingId === row.id;
        const proposedDate = formatDevelopmentDate(row.occurredAtEpochMinute, calendar);
        return <li key={`${row.source}-${row.id}`} className={`rounded-lg border border-border/60 bg-card/60 p-4 ${row.parentSuggestionId ? 'ml-2 border-l-2 border-l-primary/40 sm:ml-4' : ''}`}><article>
          <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground"><span className="font-semibold text-foreground">{row.kindLabel}</span>{proposedDate ? <time>{proposedDate}</time> : null}</div>
          {isEditing ? <div className="mt-3 space-y-3">
            <label className="block text-sm font-medium">Title<input value={editTitle} onChange={(event) => setEditTitle(event.target.value)} className="mt-1 block w-full rounded-md border border-border bg-background px-3 py-2" /></label>
            <label className="block text-sm font-medium">Description<textarea value={editNarrative} onChange={(event) => setEditNarrative(event.target.value)} rows={3} className="mt-1 block w-full resize-y rounded-md border border-border bg-background px-3 py-2" /></label>
          </div> : <>
            <h4 className="mt-2 text-lg font-semibold text-foreground">{row.title}</h4>
            {row.narrative ? <p className="mt-2 max-w-[80ch] text-sm leading-relaxed text-foreground/85">{row.narrative}</p> : null}
            {row.scopeLabel ? <p className="mt-3 text-xs text-muted-foreground">{row.scopeHref ? <Link to={row.scopeHref} className="hover:text-primary hover:underline">{row.scopeLabel}</Link> : row.scopeLabel}{row.chainStageLabel ? ` · ${row.chainStageLabel}` : ''}</p> : null}
          </>}
          <RationalePanel lines={row.rationale} />
          {row.canResolve ? <div className="mt-4 flex flex-wrap justify-end gap-2 border-t border-border/40 pt-3">
            <button type="button" disabled={busyId === row.id} onClick={() => void handleResolve(row, 'dismiss')} className="rounded-md px-3 py-1.5 text-sm text-muted-foreground hover:bg-muted hover:text-foreground disabled:opacity-50">Dismiss</button>
            <button type="button" disabled={busyId === row.id} onClick={() => { if (isEditing) setEditingId(null); else { setEditingId(row.id); setEditTitle(row.title); setEditNarrative(row.narrative ?? ''); } }} className="rounded-md border border-border px-3 py-1.5 text-sm hover:bg-muted disabled:opacity-50">{isEditing ? 'Cancel edit' : 'Edit'}</button>
            <button type="button" disabled={busyId === row.id || (isEditing && !editTitle.trim())} onClick={() => void handleResolve(row, 'accept')} className="rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50">Apply</button>
          </div> : null}
        </article></li>;
      })}</ul>}
    </section>

    <section aria-labelledby="campaign-time-heading" className="border-t border-border/40 pt-5"><div className="flex flex-wrap items-center justify-between gap-3"><div><h3 id="campaign-time-heading" className="text-base font-semibold">Campaign Time</h3><p className="mt-1 text-sm text-muted-foreground">{currentDate ?? 'No master calendar configured'}</p></div><button type="button" onClick={() => setAdvanceOpen(true)} className="rounded-md border border-border px-3 py-1.5 text-sm hover:bg-muted">Advance time</button></div></section>

    {history.length > 0 ? <section aria-labelledby="recently-applied-heading" className="border-t border-border/40 pt-5"><h3 id="recently-applied-heading" className="text-base font-semibold">Recently Applied</h3><ul className="mt-3 space-y-2">{history.map((row) => <li key={row.id} className="flex min-w-0 flex-wrap items-center justify-between gap-2 text-sm"><span className="flex min-w-0 items-center gap-2"><Check className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" /><span className="truncate">{row.title}</span></span><span className="text-xs text-muted-foreground">{formatDevelopmentDate(row.occurredAtEpochMinute, calendar)}</span></li>)}</ul><Link to={campaignProgressionPath(campaignHandle, 'history')} className="mt-3 inline-block text-sm text-primary hover:underline">View history →</Link></section> : null}

    <SessionTimeAdvanceModal open={advanceOpen} campaignHandle={campaignHandle} sessionDuration={null} onSkip={() => setAdvanceOpen(false)} onClose={() => setAdvanceOpen(false)} onAdvanced={() => { setAdvanceOpen(false); void load(); }} />
  </div>;
}
