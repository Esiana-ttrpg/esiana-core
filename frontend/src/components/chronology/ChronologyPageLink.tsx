import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useWiki } from '@/contexts/WikiContext';
import { apiFetch } from '@/lib/api';
import { createWikiPage } from '@/lib/wiki';
import { campaignWikiPath } from '@/lib/campaignPaths';
import { CampaignCapabilities } from '@shared/campaignPolicy/capabilities';

/** Pages use the normal page API and editor; the chronology relationship is explicit. */
export function ChronologyPageLink({ type, id, title, pageId, description, onChanged, canManage: allowManage }: {
  type: 'events' | 'eras'; id: string; title: string; pageId?: string | null;
  canManage?: boolean;
  description?: string | null; onChanged?: () => void | Promise<void>;
}) {
  const { campaignHandle, flatPages, can, refresh } = useWiki();
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();
  const [linked, setLinked] = useState<string | null | undefined>();
  const effectiveId = linked === undefined ? pageId : linked;
  const page = flatPages.find(row => row.id === effectiveId);
  const canManage = allowManage !== false && can(CampaignCapabilities.CHRONOLOGY_EDIT);
  async function link(next: string | null) {
    setBusy(true); setError(undefined);
    try {
      await apiFetch(`/campaigns/${campaignHandle}/chronology/${type}/${id}/page`, { method: 'PUT', body: JSON.stringify({ pageId: next }) });
      setLinked(next); await onChanged?.();
    } catch (e) { setError(e instanceof Error ? e.message : 'Unable to link page.'); }
    finally { setBusy(false); }
  }
  async function create() {
    setBusy(true); setError(undefined);
    try {
      const created = await createWikiPage(campaignHandle, {
        title, parentId: null,
        ...(type === 'events' ? { chronologyEventId: id } : { chronologyEraId: id }),
        blocks: description ? [{ id: crypto.randomUUID(), type: 'text-tiptap', title: 'Description', x: 0, y: 0, w: 2, h: 2, isPrivate: false, content: { markdown: description } }] : undefined,
      });
      setLinked(created.id); await refresh(); await onChanged?.();
      navigate(campaignWikiPath(campaignHandle, created.id, [...flatPages, created]));
    } catch (e) { setError(e instanceof Error ? e.message : 'Unable to create page.'); }
    finally { setBusy(false); }
  }
  return <div className="space-y-2 text-sm">
    <div className="flex flex-wrap items-center gap-3">
      {page ? <Link className="min-h-11 inline-flex items-center text-primary underline" to={campaignWikiPath(campaignHandle, page.id, flatPages)}>Open page</Link>
        : <span className="text-muted">No {type === 'events' ? 'event' : 'era'} page</span>}
      {!page && canManage && can(CampaignCapabilities.PAGE_CREATE) && <button className="min-h-11 text-primary underline" disabled={busy} onClick={() => void create()}>Create page</button>}
      {canManage && <details><summary className="min-h-11 cursor-pointer py-3 text-muted">Manage page link</summary>
        <label className="block">Linked page <select className="max-w-full rounded border border-border bg-background p-2" disabled={busy} value={page?.id ?? ''} onChange={e => void link(e.target.value || null)}>
          <option value="">No linked page</option>
          {flatPages.map(row => <option key={row.id} value={row.id}>{row.title}</option>)}
        </select></label>
      </details>}
    </div>
    {error && <p role="alert" className="text-destructive">{error}</p>}
  </div>;
}
