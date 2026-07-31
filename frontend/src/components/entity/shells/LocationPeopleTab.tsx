import { useMemo } from 'react';
import { buildLocationHubProjection } from '@/lib/locationHubProjection';
import { useCampaignChronologyNow } from '@/hooks/useCampaignChronologyNow';
import { LocationPeopleSection } from './LocationPeopleSection';
import type { WikiTreeNode } from '@/types/wiki';

interface LocationPeopleTabProps {
  campaignHandle: string;
  locationPageId: string;
  pageMetadata: unknown;
  flatPages: readonly WikiTreeNode[];
}

export function LocationPeopleTab({
  campaignHandle,
  locationPageId,
  pageMetadata,
  flatPages,
}: LocationPeopleTabProps) {
  const campaignNow = useCampaignChronologyNow(campaignHandle);
  const hub = useMemo(
    () =>
      buildLocationHubProjection({
        campaignHandle,
        locationPageId,
        pageMetadata,
        flatPages,
        campaignNow,
      }),
    [campaignHandle, locationPageId, pageMetadata, flatPages, campaignNow],
  );

  const { people } = hub;
  const hasAny =
    people.featured.length > 0 ||
    people.residents.length > 0 ||
    people.visitors.length > 0 ||
    people.formerResidents.length > 0 ||
    people.lastSeenHere.length > 0;

  if (!hasAny) {
    return (
      <p className="text-sm text-muted">
        Notable people appear when characters link to this place with a residence, visit, or former
        home — edit character identity to add location relationships.
      </p>
    );
  }

  return (
    <div className="space-y-6">
      <LocationPeopleSection
        title="Featured people"
        entries={people.featured}
        campaignHandle={campaignHandle}
        flatPages={flatPages}
      />
      <LocationPeopleSection
        title="Residents"
        entries={people.residents}
        campaignHandle={campaignHandle}
        flatPages={flatPages}
      />
      <LocationPeopleSection
        title="Visitors"
        entries={people.visitors}
        campaignHandle={campaignHandle}
        flatPages={flatPages}
      />
      <LocationPeopleSection
        title="Former residents"
        entries={people.formerResidents}
        campaignHandle={campaignHandle}
        flatPages={flatPages}
      />
      <LocationPeopleSection
        title="Last seen here"
        entries={people.lastSeenHere}
        campaignHandle={campaignHandle}
        flatPages={flatPages}
      />
    </div>
  );
}
