import { useEffect, useState } from 'react';
import { Megaphone } from 'lucide-react';
import type { AnnouncementInput, CampaignAnnouncement } from '@shared/dashboardCampaignFeatures';
import { parseAnnouncement } from '@shared/dashboardCampaignFeatures';
import { fetchCampaignAnnouncements, saveCampaignAnnouncement, deleteCampaignAnnouncement } from '@/lib/dashboard';
import { WikiMarkdown } from '@/components/wiki/WikiMarkdown';
import { WikiTipTapEditor } from '@/components/wiki/WikiTipTapEditor';
import { useWiki } from '@/contexts/WikiContext';
import { DashboardWidgetShell } from '../DashboardWidgetShell';
import type { ContextWidgetProps } from './CampaignContextWidgets';

const empty: AnnouncementInput = { title: '', message: '', style: 'information', link: null, expiresAt: null };
const field = 'w-full rounded border border-border bg-background p-2 text-sm';
export function CampaignAnnouncementsWidget({ campaignHandle, features, customizeMode, onHide }: ContextWidgetProps) {
  const { tree } = useWiki();
  const [records, setRecords] = useState<CampaignAnnouncement[]>(features?.announcements ?? []);
  const [editing, setEditing] = useState<CampaignAnnouncement>();
  const [input, setInput] = useState<AnnouncementInput>(empty);
  const [error, setError] = useState<string>();
  const [busy, setBusy] = useState(false);
  const [editorOpen, setEditorOpen] = useState(false);
  const [now, setNow] = useState(Date.now);
  useEffect(() => setRecords(features?.announcements ?? []), [features?.announcements]);
  useEffect(() => {
    if (!customizeMode) return;
    let cancelled = false;
    void fetchCampaignAnnouncements(campaignHandle).then(result => { if (!cancelled) setRecords(result.announcements); }).catch(err => { if (!cancelled) setError(String(err)); });
    return () => { cancelled = true; };
  }, [campaignHandle, customizeMode]);
  useEffect(() => {
    const next = Math.min(...records.map(row => row.expiresAt ? Date.parse(row.expiresAt) : Infinity).filter(time => time > now));
    if (!Number.isFinite(next)) return;
    const timer = setTimeout(() => setNow(Date.now()), Math.min(2147483647, Math.max(1, next - Date.now())));
    return () => clearTimeout(timer);
  }, [records, now]);
  const active = records.filter(row => !row.expiresAt || Date.parse(row.expiresAt) > now);
  async function save() {
    const parsed = parseAnnouncement(input);
    if (!parsed) { setError('Enter a title and message, a safe HTTP/HTTPS link, and a valid expiration.'); return; }
    setBusy(true); setError(undefined);
    try { const result = await saveCampaignAnnouncement(campaignHandle, parsed, editing); setRecords(result.announcements); setEditing(undefined); setInput(empty); }
    catch (err) { setError(err instanceof Error ? err.message : 'Announcement could not be saved.'); }
    finally { setBusy(false); }
  }
  async function remove(row: CampaignAnnouncement) {
    if (!window.confirm(`Remove “${row.title}”?`)) return;
    setBusy(true); setError(undefined);
    try { await deleteCampaignAnnouncement(campaignHandle, row.id); setRecords(rows => rows.filter(item => item.id !== row.id)); if (editing?.id === row.id) { setEditing(undefined); setInput(empty); } }
    catch (err) { setError(err instanceof Error ? err.message : 'Announcement could not be removed.'); }
    finally { setBusy(false); }
  }
  return <DashboardWidgetShell title="Campaign Announcements" icon={<Megaphone className="size-4" />} customizeMode={customizeMode} onHide={onHide}>
    {error && <p role="alert" className="mb-3 text-sm text-[var(--color-status-warning-fg)]">{error}</p>}
    {active.length ? <>
      <ul className="space-y-4">{active.slice(0, 3).map(row => <AnnouncementNotice key={row.id} notice={row} />)}</ul>
      {active.length > 3 && <details className="mt-3"><summary className="cursor-pointer py-2 text-sm">{active.length - 3} more announcements</summary><ul className="space-y-4">{active.slice(3).map(row => <AnnouncementNotice key={row.id} notice={row} />)}</ul></details>}
    </> : <p className="text-sm text-muted">No active announcements.</p>}
    {customizeMode && <details className="mt-3" onToggle={event => setEditorOpen(event.currentTarget.open)}><summary className="cursor-pointer py-2 text-sm">Manage announcements</summary>{editorOpen && <div className="space-y-3">
      <ul className="space-y-2">{records.map(row => <li key={row.id} className="flex flex-wrap items-center gap-2 text-sm"><span className="min-w-0 flex-1 break-words">{row.title}{row.expiresAt && Date.parse(row.expiresAt) <= now ? ' (expired)' : ''}</span><button type="button" disabled={busy} className="rounded border border-border px-2 py-1" onClick={() => { setEditing(row); setInput(row); }}>Edit<span className="sr-only"> {row.title}</span></button><button type="button" disabled={busy} className="rounded border border-border px-2 py-1" onClick={() => void remove(row)}>Remove<span className="sr-only"> {row.title}</span></button></li>)}</ul>
      <form className="space-y-3" onSubmit={event => { event.preventDefault(); void save(); }}>
        <h4 className="text-sm font-semibold">{editing ? 'Edit announcement' : 'New announcement'}</h4>
        <label className="block text-sm">Title<input required maxLength={120} className={field} value={input.title} onChange={event => setInput({ ...input, title: event.target.value })} /></label>
        <label className="block text-sm">Style<select className={field} value={input.style} onChange={event => setInput({ ...input, style: event.target.value as AnnouncementInput['style'] })}><option value="information">Information</option><option value="important">Important</option><option value="update">Update</option></select></label>
        <p className="text-sm">Message</p><WikiTipTapEditor content={input.message} onChange={message => setInput(value => ({ ...value, message }))} wikiTree={tree} minHeight="100px" enableInstrumentation={false} />
        <label className="block text-sm">Link (optional, HTTP/HTTPS)<input type="url" className={field} value={input.link ?? ''} onChange={event => setInput({ ...input, link: event.target.value || null })} /></label>
        <label className="block text-sm">Expiration (optional, your local time)<input type="datetime-local" className={field} value={input.expiresAt ? new Date(Date.parse(input.expiresAt) - new Date(input.expiresAt).getTimezoneOffset() * 60000).toISOString().slice(0, 16) : ''} onChange={event => setInput({ ...input, expiresAt: event.target.value ? new Date(event.target.value).toISOString() : null })} /></label>
        <div className="flex gap-2"><button disabled={busy} className="rounded bg-foreground px-3 py-2 text-sm text-background">{busy ? 'Saving…' : 'Save announcement'}</button><button type="button" className="rounded border border-border px-3 py-2 text-sm" onClick={() => { setEditing(undefined); setInput(empty); }}>Clear editor</button></div>
      </form>
    </div>}</details>}
  </DashboardWidgetShell>;
}

function AnnouncementNotice({ notice }: { notice: CampaignAnnouncement }) {
  const border = notice.style === 'important'
    ? 'border-[var(--color-status-warning-border)]'
    : notice.style === 'update' ? 'border-primary' : 'border-border';
  return <li className={`border-l-2 pl-3 ${border}`}>
    <p className="text-xs capitalize text-muted">{notice.style}</p>
    <h4 className="mb-1 break-words font-semibold">{notice.title}</h4>
    <div className="break-words text-sm [&_.prose]:text-foreground"><WikiMarkdown content={notice.message} /></div>
    {notice.link && <a className="mt-2 inline-block text-sm text-foreground underline decoration-primary underline-offset-4" href={notice.link} target="_blank" rel="noopener noreferrer">
      More information <span className="sr-only">(opens in a new tab)</span><span aria-hidden="true">&#8599;</span>
    </a>}
  </li>;
}
