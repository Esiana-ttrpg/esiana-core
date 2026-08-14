import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { campaignWikiPath } from '@/lib/campaignPaths';
import { collectLocationSceneEvents } from '@/lib/locationEventsProjection';
import { EntityPageSection } from './EntityPageSection';
import type { WikiTreeNode } from '@/types/wiki';

interface LocationTimelineTabProps {
  campaignHandle: string;
  locationPageId: string;
  flatPages: readonly WikiTreeNode[];
}

export function LocationTimelineTab({
  campaignHandle,
  locationPageId,
  flatPages,
}: LocationTimelineTabProps) {
  const events = useMemo(
    () => collectLocationSceneEvents(locationPageId, flatPages, null),
    [locationPageId, flatPages],
  );

  if (events.length === 0) {
    return (
      <p className="text-sm text-muted">
        A chronological feed will build from scenes and chronology tied to this place — milestone
        pins may come later without a separate editor.
      </p>
    );
  }

  return (
    <EntityPageSection id="location-timeline" title="Notable moments">
      <ul className="space-y-2">
        {events.map((ev) => (
          <li key={ev.pageId} className="flex flex-wrap items-baseline gap-2 border-b border-border/30 pb-2">
            <Link
              to={campaignWikiPath(campaignHandle, ev.pageId, flatPages)}
              className="text-sm font-medium hover:text-primary"
            >
              {ev.title}
            </Link>
            <span className="text-[10px] uppercase tracking-wide text-muted">{ev.bucket}</span>
          </li>
        ))}
      </ul>
    </EntityPageSection>
  );
}
