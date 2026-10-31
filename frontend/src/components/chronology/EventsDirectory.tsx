import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useWiki } from '@/contexts/WikiContext';
import type { ChronologyTimelineBundle } from '@/lib/chronologyApi';
import { campaignEventPath, campaignWorkspaceIndexPath } from '@/lib/campaignPaths';
import { TYPE_DISPLAY_CLASS } from '@/lib/surfaceLayout';
import { ChronologyImportance } from './ChronologyImportance';

export function EventsDirectory({ bundle, campaignHandle }: { bundle: ChronologyTimelineBundle; campaignHandle: string }) {
  const { flatPages } = useWiki();
  const [view, setView] = useState('all');
  const [query, setQuery] = useState('');
  const pages = new Set(flatPages.map(page => page.id));
  const events = bundle.baseEvents.filter(event => (view !== 'pages' || (event.wikiPageId && pages.has(event.wikiPageId))) && event.title.toLocaleLowerCase().includes(query.toLocaleLowerCase()));
  return <section className="space-y-6 p-6" aria-label="Events directory">
    <h2 className={TYPE_DISPLAY_CLASS}>Events</h2>
    <Link className="text-sm text-muted underline" to={campaignWorkspaceIndexPath(campaignHandle, 'event-pages')}>Browse authored event pages</Link>
    <div className="flex flex-wrap items-center gap-4 text-sm">
      <label>View <select className="rounded border border-border bg-background p-2" value={view} onChange={e => setView(e.target.value)}><option value="all">All events</option><option value="pages">Event pages</option></select></label>
      <label>Find event <input className="rounded border border-border bg-background p-2" type="search" value={query} onChange={e => setQuery(e.target.value)} /></label>
    </div>
    <ul className="divide-y divide-border/40">{events.map(event => <li key={event.id}>
      <Link className="block min-h-11 space-y-1 py-4 hover:text-primary" to={campaignEventPath(campaignHandle, event.slug ?? event.id)}>
        <span className="block font-medium">{event.title}</span>
        <span className="block text-xs text-muted"><ChronologyImportance value={event.importance} />{' · '}{event.wikiPageId && pages.has(event.wikiPageId) ? 'Page' : 'Event only'}{event.isRepeating || event.isRecurring ? ' · Recurring event' : ''}</span>
      </Link>
    </li>)}</ul>
    {!events.length && <p className="text-sm text-muted">No matching events.</p>}
  </section>;
}
