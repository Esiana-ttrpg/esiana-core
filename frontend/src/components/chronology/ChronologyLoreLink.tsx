import { ChronologyPageLink } from './ChronologyPageLink';
export function ChronologyLoreLink({ baseEventId, title, wikiPageId, description, onChanged, className = '' }: {
  campaignHandle: string; baseEventId: string; title: string; wikiPageId?: string | null;
  description?: string | null; onChanged?: () => void | Promise<void>; className?: string;
}) {
  return <div className={className}><ChronologyPageLink key={baseEventId} type="events" id={baseEventId} title={title} pageId={wikiPageId} description={description} onChanged={onChanged} /></div>;
}
