import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { campaignWikiPath } from '@/lib/campaignPaths';
import { buildLocationHubProjection } from '@/lib/locationHubProjection';
import { EntityPageSection } from './EntityPageSection';
import type { WikiTreeNode } from '@/types/wiki';

interface LocationPlacesTabProps {
  campaignHandle: string;
  locationPageId: string;
  pageMetadata: unknown;
  flatPages: readonly WikiTreeNode[];
}

export function LocationPlacesTab({
  campaignHandle,
  locationPageId,
  pageMetadata,
  flatPages,
}: LocationPlacesTabProps) {
  const hub = useMemo(
    () =>
      buildLocationHubProjection({
        campaignHandle,
        locationPageId,
        pageMetadata,
        flatPages,
      }),
    [campaignHandle, locationPageId, pageMetadata, flatPages],
  );

  if (hub.places.length === 0) {
    return (
      <p className="text-sm text-muted">
        Child locations and notable places appear when wiki pages are nested under this location.
      </p>
    );
  }

  return (
    <div className="space-y-6">
      {hub.places.map((group) => (
        <EntityPageSection key={group.label} id={`places-${group.label}`} title={group.label}>
          <ul className="space-y-1">
            {group.places.map((place) => (
              <li key={place.pageId}>
                <Link
                  to={campaignWikiPath(campaignHandle, place.pageId, flatPages)}
                  className="text-sm hover:text-primary"
                >
                  {place.title}
                </Link>
              </li>
            ))}
          </ul>
        </EntityPageSection>
      ))}
    </div>
  );
}
