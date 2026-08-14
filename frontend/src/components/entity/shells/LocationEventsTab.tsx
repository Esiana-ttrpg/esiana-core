import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { campaignWikiPath } from '@/lib/campaignPaths';
import {
  collectLocationSceneEvents,
  groupLocationEventsByBucket,
} from '@/lib/locationEventsProjection';
import { EntityPageSection } from './EntityPageSection';
import type { WikiTreeNode } from '@/types/wiki';

interface LocationEventsTabProps {
  campaignHandle: string;
  locationPageId: string;
  flatPages: readonly WikiTreeNode[];
}

export function LocationEventsTab({
  campaignHandle,
  locationPageId,
  flatPages,
}: LocationEventsTabProps) {
  const grouped = useMemo(() => {
    const events = collectLocationSceneEvents(locationPageId, flatPages, null);
    return groupLocationEventsByBucket(events);
  }, [locationPageId, flatPages]);

  const hasAny =
    grouped.current.length + grouped.historical.length + grouped.upcoming.length > 0;

  if (!hasAny) {
    return (
      <p className="text-sm text-muted">
        Scenes anchored to this location will appear here, grouped by narrative timing.
      </p>
    );
  }

  function renderBucket(
    title: string,
    items: ReturnType<typeof collectLocationSceneEvents>,
  ) {
    if (items.length === 0) return null;
    return (
      <EntityPageSection title={title} id={`events-${title.toLowerCase().replace(/\s+/g, '-')}`}>
        <ul className="space-y-1">
          {items.map((ev) => (
            <li key={ev.pageId}>
              <Link
                to={campaignWikiPath(campaignHandle, ev.pageId, flatPages)}
                className="text-sm hover:text-primary"
              >
                {ev.title}
              </Link>
            </li>
          ))}
        </ul>
      </EntityPageSection>
    );
  }

  return (
    <div className="space-y-6">
      {renderBucket('Current', grouped.current)}
      {renderBucket('Upcoming', grouped.upcoming)}
      {renderBucket('Historical', grouped.historical)}
    </div>
  );
}
