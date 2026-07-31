import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { campaignWikiPath } from '@/lib/campaignPaths';
import { buildLocationHubProjection } from '@/lib/locationHubProjection';
import { EntityPageSection } from './EntityPageSection';
import { LocationRelationshipTree } from './LocationRelationshipTree';
import type { WikiTreeNode } from '@/types/wiki';

interface LocationConnectionsTabProps {
  campaignHandle: string;
  locationPageId: string;
  pageMetadata: unknown;
  flatPages: readonly WikiTreeNode[];
  mapAssetId?: string | null;
  campaignMaps?: Array<{ id: string; title: string }>;
}

export function LocationConnectionsTab({
  campaignHandle,
  locationPageId,
  pageMetadata,
  flatPages,
  mapAssetId,
  campaignMaps,
}: LocationConnectionsTabProps) {
  const hub = useMemo(
    () =>
      buildLocationHubProjection({
        campaignHandle,
        locationPageId,
        pageMetadata,
        flatPages,
        mapAssetId,
        campaignMaps,
      }),
    [
      campaignHandle,
      locationPageId,
      pageMetadata,
      flatPages,
      mapAssetId,
      campaignMaps,
    ],
  );

  const { connections } = hub;

  return (
    <div className="space-y-6">
      <EntityPageSection id="location-relationship-tree" title="Relationship">
        <LocationRelationshipTree
          locationPageId={locationPageId}
          campaignHandle={campaignHandle}
          flatPages={flatPages}
          pageMetadata={pageMetadata}
        />
      </EntityPageSection>

      {connections.parentLocation ? (
        <EntityPageSection id="location-parent" title="Parent location">
          <Link
            to={campaignWikiPath(
              campaignHandle,
              connections.parentLocation.pageId,
              flatPages,
            )}
            className="text-sm hover:text-primary"
          >
            {connections.parentLocation.title}
          </Link>
        </EntityPageSection>
      ) : null}

      {connections.childLocations.length > 0 ? (
        <EntityPageSection id="location-children" title="Child locations">
          <ul className="space-y-1">
            {connections.childLocations.map((loc) => (
              <li key={loc.pageId}>
                <Link
                  to={campaignWikiPath(campaignHandle, loc.pageId, flatPages)}
                  className="text-sm hover:text-primary"
                >
                  {loc.title}
                </Link>
              </li>
            ))}
          </ul>
        </EntityPageSection>
      ) : null}

      {connections.nearbyLocations.length > 0 ? (
        <EntityPageSection id="location-nearby" title="Nearby">
          <ul className="space-y-1">
            {connections.nearbyLocations.map((loc) => (
              <li key={loc.pageId}>
                <Link
                  to={campaignWikiPath(campaignHandle, loc.pageId, flatPages)}
                  className="text-sm hover:text-primary"
                >
                  {loc.title}
                </Link>
              </li>
            ))}
          </ul>
        </EntityPageSection>
      ) : null}

      {connections.politicalRegion ? (
        <EntityPageSection id="location-political-region" title="Political region">
          <Link
            to={campaignWikiPath(
              campaignHandle,
              connections.politicalRegion.pageId,
              flatPages,
            )}
            className="text-sm hover:text-primary"
          >
            {connections.politicalRegion.title}
          </Link>
        </EntityPageSection>
      ) : null}
    </div>
  );
}
