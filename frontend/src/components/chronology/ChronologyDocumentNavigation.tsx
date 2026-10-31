import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useWiki } from '@/contexts/WikiContext';
import { fetchChronologyTimeline } from '@/lib/chronologyApi';
import { campaignEraPath, campaignEventPath, campaignWorkspaceIndexPath } from '@/lib/campaignPaths';

/** Only the authorized chronology API can disclose links back from an independent wiki page. */
export function ChronologyDocumentNavigation({ pageId, kind }: { pageId: string; kind: 'event' | 'era' }) {
  const { campaignHandle } = useWiki();
  const [links, setLinks] = useState<Array<{ path: string; title: string }>>([]);
  useEffect(() => {
    let active = true;
    setLinks([]);
    void fetchChronologyTimeline(campaignHandle).then(bundle => {
      if (!active) return;
      setLinks(kind === 'event'
        ? bundle.baseEvents.filter(event => event.wikiPageId === pageId).map(event => ({ path: campaignEventPath(campaignHandle, event.slug ?? event.id), title: event.title }))
        : (bundle.eras ?? []).filter(era => era.overviewPageId === pageId).map(era => ({ path: campaignEraPath(campaignHandle, era.slug ?? era.id), title: era.name })));
    }).catch(() => { if (active) setLinks([]); });
    return () => { active = false; };
  }, [campaignHandle, pageId, kind]);
  return <nav aria-label="Wiki and chronology" className="flex flex-wrap gap-4 px-4 py-2 text-sm text-muted">
    <Link className="min-h-11 inline-flex items-center underline" to={campaignWorkspaceIndexPath(campaignHandle, kind === 'event' ? 'event-pages' : 'era-pages')}>{kind === 'event' ? 'Event pages' : 'Era pages'}</Link>
    {links.map(link => <Link className="min-h-11 inline-flex items-center underline" key={link.path} to={link.path}>{kind === 'event' ? 'Event' : 'Era'}: {link.title}</Link>)}
  </nav>;
}
