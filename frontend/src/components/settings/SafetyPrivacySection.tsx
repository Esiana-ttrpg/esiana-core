import { SafetyReviewerPermissions } from './SafetyReviewerPermissions';
import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { apiFetch, ApiError } from '@/lib/api';
import { controlClasses, textareaClasses, primaryButtonClasses, secondaryButtonClasses } from '@/components/ui/formStyles';
import { SAFETY_CATEGORIES, SAFETY_CONTENT_TYPES, SAFETY_STATUSES } from '@shared/safetyPrivacy';

type Campaign = { id: string; handle: string; name: string };
type Person = { id: string; displayName: string | null };
type RequestRow = { id: string; campaign: Campaign; category: string; status: string; description: string; updatedAt: string; createdAt: string; unread: boolean };
type Detail = RequestRow & { requesterId: string; revision: number; manager: boolean; resolution: string | null; relatedContentType: string | null; relatedContentId: string | null; reviewerIds: string[]; people: Person[];
  messages: { id: string; body: string; authorId: string; createdAt: string }[]; events: { id: string; actorId: string; newStatus: string; reason: string | null; createdAt: string }[] };
type Recording = { id: string; title: string; campaign: Campaign; sessionId: string; sessionTitle: string };
const base = '/safety-privacy';

export function SafetyPrivacySection({ campaignHandle, onUnreadChange }: { campaignHandle?: string; onUnreadChange?: (count: number) => void }) {
  const { t } = useTranslation();
  const label = (key: string) => t('profile.safety.' + key.replace(/_([a-z])/g, (_, letter: string) => letter.toUpperCase()));
  const [params, setParams] = useSearchParams();
  const selectedId = params.get('request');
  const [rows, setRows] = useState<RequestRow[]>([]), [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [recordings, setRecordings] = useState<Recording[]>([]), [detail, setDetail] = useState<Detail | null>(null);
  const [error, setError] = useState(''), [busy, setBusy] = useState(false), [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all'), [body, setBody] = useState(''), [status, setStatus] = useState('in_review'), [reason, setReason] = useState('');
  const [creating, setCreating] = useState(false), [campaign, setCampaign] = useState(''), [category, setCategory] = useState('other');
  const [relatedType, setRelatedType] = useState(''), [relatedId, setRelatedId] = useState(''), [description, setDescription] = useState('');
  const [recipients, setRecipients] = useState<Person[] | null>(null);
  const dialog = useRef<HTMLDialogElement>(null);
  const reload = useCallback(async () => {
    const list = await apiFetch<RequestRow[]>(base + '/requests' + (campaignHandle ? '?campaign=' + encodeURIComponent(campaignHandle) : ''));
    setRows(list); onUnreadChange?.(list.filter(r => r.unread).length);
  }, [campaignHandle, onUnreadChange]);
  const openDetail = useCallback(async (id: string) => {
    const row = await apiFetch<Detail>(base + '/requests/' + encodeURIComponent(id));
    if (campaignHandle && row.campaign.handle !== campaignHandle) throw new Error(t('profile.safety.wrongCampaign'));
    setDetail(row); await reload();
  }, [campaignHandle, reload, t]);
  useEffect(() => {
    let active = true;
    setDetail(null); setError(''); setLoading(true);
    void reload().catch(e => active && setError(e.message)).finally(() => active && setLoading(false));
    if (!campaignHandle) void Promise.all([apiFetch<Campaign[]>(base + '/campaigns'), apiFetch<Recording[]>(base + '/recordings')])
      .then(([c, r]) => { if (active) { setCampaigns(c); setRecordings(r); } }).catch(e => active && setError(e.message));
    return () => { active = false; };
  }, [campaignHandle, reload]);
  useEffect(() => { if (selectedId) void openDetail(selectedId).catch(e => { setDetail(null); setError(e.message); }); else setDetail(null); }, [selectedId, openDetail]);
  useEffect(() => {
    setRecipients(null); if (!campaign || !creating) return;
    let active = true;
    void apiFetch<Person[]>(base + '/recipients/' + encodeURIComponent(campaign)).then(r => active && setRecipients(r)).catch(e => active && setError(e.message));
    return () => { active = false; };
  }, [campaign, creating]);
  useEffect(() => { if (creating) dialog.current?.showModal(); else dialog.current?.close(); }, [creating]);
  function choose(id: string | null) { const next = new URLSearchParams(params); if (id) next.set('request', id); else next.delete('request'); setParams(next); }
  async function run(action: () => Promise<void>) { setBusy(true); setError(''); try { await action(); } catch (e) { setError(e instanceof Error ? e.message : label('failed')); } finally { setBusy(false); } }
  async function submit(event: FormEvent) {
    event.preventDefault();
    await run(async () => {
      let row: RequestRow;
      try {
        row = await apiFetch<RequestRow>(base + '/requests', { method: 'POST', body: JSON.stringify({ campaign, category, description,
          ...(relatedType && relatedId ? { relatedContentType: relatedType, relatedContentId: relatedId } : {}), recipientIds: recipients?.map(p => p.id) ?? [] }) });
      } catch (error) {
        if (error instanceof ApiError && error.status === 409) {
          setRecipients(null);
          setRecipients(await apiFetch<Person[]>(base + '/recipients/' + encodeURIComponent(campaign)));
        }
        throw error;
      }
      setCreating(false); setDescription(''); await reload(); choose(row.id);
    });
  }
  const name = (id: string) => detail?.people.find(p => p.id === id)?.displayName || label('participant');
  const date = (value: string) => new Date(value).toLocaleString();
  return <section className="space-y-6 min-w-0">
    <header className="space-y-2"><h2 className="text-xl font-semibold">{label('title')}</h2><p className="text-sm text-muted">{label(campaignHandle ? 'adminIntro' : 'intro')}</p>
      {!campaignHandle && <button className={primaryButtonClasses} onClick={() => { setError(''); setCreating(true); }}>{label('newRequest')}</button>}</header>
    {campaignHandle && <SafetyReviewerPermissions campaignHandle={campaignHandle} />}
    {error && <p role="alert" className="text-sm text-red-400">{error}</p>}
    {loading && <p role="status">{label('loading')}</p>}
    {detail ? <article className="space-y-4">
      <button className={secondaryButtonClasses} onClick={() => choose(null)}>{label('back')}</button>
      <h3 className="text-lg font-semibold">{label(detail.category)} ? {detail.campaign.name}</h3>
      <p className="text-sm text-muted">{label(detail.status)} ? {date(detail.createdAt)} ? {name(detail.requesterId)}</p>
      <p className="whitespace-pre-wrap break-words">{detail.description}</p>
      {detail.relatedContentId && <p className="text-sm text-muted break-all">{label(detail.relatedContentType!)}: {detail.relatedContentId}</p>}
      <p className="text-sm text-muted">{label('reviewers')}: {detail.reviewerIds.map(name).join(', ') || label('noReviewers')}</p>
      <h4 className="font-semibold">{label('conversation')}</h4>
      {detail.messages.map(m => <div key={m.id} className="border-l border-border/40 pl-3 space-y-1"><p className="text-sm text-muted">{name(m.authorId)} ? {date(m.createdAt)}</p><p className="whitespace-pre-wrap break-words">{m.body}</p></div>)}
      <form className="space-y-2" onSubmit={e => { e.preventDefault(); void run(async () => { await apiFetch(base + '/requests/' + detail.id + '/messages', { method: 'POST', body: JSON.stringify({ body }) }); setBody(''); await openDetail(detail.id); }); }}>
        <label className="block">{label('reply')}<textarea required maxLength={10000} className={textareaClasses + ' w-full'} value={body} onChange={e => setBody(e.target.value)} /></label>
        <button disabled={busy || !body.trim()} className={primaryButtonClasses}>{label('send')}</button>
      </form>
      {detail.manager && <form className="space-y-2" onSubmit={e => { e.preventDefault(); void run(async () => { await apiFetch(base + '/requests/' + detail.id + '/status', { method: 'PATCH', body: JSON.stringify({ status, reason: reason || undefined, expectedRevision: detail.revision }) }); setReason(''); await openDetail(detail.id); }); }}>
        <label className="block">{label('status')}<select value={status} onChange={e => setStatus(e.target.value)} className={controlClasses}>{SAFETY_STATUSES.map(s => <option key={s} value={s}>{label(s)}</option>)}</select></label>
        <label className="block">{label('resolution')}<textarea required={status === 'resolved' || status === 'declined'} maxLength={10000} className={textareaClasses + ' w-full'} value={reason} onChange={e => setReason(e.target.value)} /></label>
        <button disabled={busy || status === detail.status} className={secondaryButtonClasses}>{label('updateStatus')}</button>
      </form>}
      {!detail.manager && ['resolved','declined'].includes(detail.status) && <button disabled={busy} className={secondaryButtonClasses} onClick={() => void run(async () => { await apiFetch(base + '/requests/' + detail.id + '/status', { method: 'PATCH', body: JSON.stringify({ status: 'open', expectedRevision: detail.revision }) }); await openDetail(detail.id); })}>{label('reopen')}</button>}
      <details><summary>{label('history')}</summary><ol className="space-y-2 mt-2">{detail.events.map(e => <li key={e.id}><p className="text-sm text-muted">{date(e.createdAt)} ? {name(e.actorId)} ? {label(e.newStatus)}</p>{e.reason && <p className="whitespace-pre-wrap break-words">{e.reason}</p>}</li>)}</ol></details>
    </article> : <div className="space-y-3">
      <h3 className="font-semibold">{label(campaignHandle ? 'inbox' : 'myRequests')} ? {rows.filter(r => ['open','in_review'].includes(r.status)).length} {label('active')}</h3>
      {campaignHandle && <label>{label('filter')} <select className={controlClasses} value={filter} onChange={e => setFilter(e.target.value)}>{['all',...SAFETY_STATUSES].map(s => <option key={s} value={s}>{label(s)}</option>)}</select></label>}
      {!loading && rows.length === 0 && <p className="text-sm text-muted">{label('empty')}</p>}
      {rows.filter(r => filter === 'all' || r.status === filter).map(r => <button key={r.id} className="block w-full text-left border-b border-border/40 py-3 space-y-1" onClick={() => choose(r.id)}><span className="font-medium">{label(r.category)}{r.unread ? ' ? ' + label('unread') : ''}</span><span className="block text-sm text-muted">{r.campaign.name} ? {label(r.status)} ? {date(r.updatedAt)}</span></button>)}
    </div>}
    {!campaignHandle && <details><summary className="font-semibold">{label('recordings')} ({recordings.length})</summary><p className="text-sm text-muted my-3">{label('discovery')}</p>
      {Array.from(new Set(recordings.map(r => r.campaign.id))).map(id => <section key={id} className="space-y-3 mt-4"><h3 className="font-semibold">{recordings.find(r => r.campaign.id === id)!.campaign.name}</h3>{Array.from(new Set(recordings.filter(r => r.campaign.id === id).map(r => r.sessionId))).map(sid => <div key={sid}><h4>{recordings.find(r => r.sessionId === sid)!.sessionTitle}</h4>{recordings.filter(r => r.campaign.id === id && r.sessionId === sid).map(r => <div key={r.id} className="flex flex-wrap gap-3 py-2"><a className="text-primary" href={'/campaigns/' + encodeURIComponent(r.campaign.handle) + '/notes/' + r.sessionId}>{r.title}</a><button className={secondaryButtonClasses} onClick={() => { setCampaign(r.campaign.handle); setCategory('recording_privacy'); setRelatedType('recording'); setRelatedId(r.id); setCreating(true); }}>{label('requestChange')}</button></div>)}</div>)}</section>)}
      {recordings.length === 0 && <p className="text-sm text-muted">{label('noRecordings')}</p>}
    </details>}
    <dialog ref={dialog} onCancel={() => setCreating(false)} onClose={() => setCreating(false)} className="w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-xl bg-surface text-foreground p-6 backdrop:bg-black/60">
      <form onSubmit={submit} className="space-y-4"><h3 className="text-xl font-semibold">{label('newRequest')}</h3>
        <label className="block">{label('campaign')}<select required className={controlClasses + ' w-full'} value={campaign} onChange={e => { setCampaign(e.target.value); setRelatedType(''); setRelatedId(''); }}><option value="">{label('chooseCampaign')}</option>{campaigns.map(c => <option key={c.id} value={c.handle}>{c.name}</option>)}</select></label>
        <label className="block">{label('category')}<select className={controlClasses + ' w-full'} value={category} onChange={e => setCategory(e.target.value)}>{SAFETY_CATEGORIES.map(c => <option key={c} value={c}>{label(c)}</option>)}</select></label>
        <label className="block">{label('related')}<select className={controlClasses + ' w-full'} value={relatedType} onChange={e => { setRelatedType(e.target.value); setRelatedId(''); }}><option value="">{label('none')}</option>{SAFETY_CONTENT_TYPES.map(c => <option key={c} value={c}>{label(c)}</option>)}</select></label>
        {relatedType && <label className="block">{label('reference')}<input required className={controlClasses + ' w-full'} maxLength={300} value={relatedId} onChange={e => setRelatedId(e.target.value)} /></label>}
        {category === 'recording_privacy' && <p className="text-sm text-muted">{label('outcomes')}</p>}
        <label className="block">{label('description')}<textarea required maxLength={10000} className={textareaClasses + ' w-full'} value={description} onChange={e => setDescription(e.target.value)} /><span className="text-sm text-muted">{label('shortEnough')}</span></label>
        <p className="text-sm">{label('reviewers')}: {recipients?.map(p => p.displayName || label('participant')).join(', ') || label('noReviewers')}</p>
        <p className="text-sm text-muted">{label('confidentiality')}</p>
        {error && <p role="alert" className="text-sm text-red-400">{error}</p>}
        <div className="flex gap-3"><button className={primaryButtonClasses} disabled={busy || !recipients?.length || !description.trim()}>{label('submit')}</button><button type="button" className={secondaryButtonClasses} onClick={() => setCreating(false)}>{label('cancel')}</button></div>
      </form>
    </dialog>
  </section>;
}
