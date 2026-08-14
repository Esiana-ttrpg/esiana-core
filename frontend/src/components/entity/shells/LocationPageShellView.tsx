import { useEffect, useState } from 'react';
import { LocationHeroSurface } from './LocationHeroSurface';
import { LocationOverviewDashboard } from './LocationOverviewDashboard';
import { LocationPeopleTab } from './LocationPeopleTab';
import { LocationPlacesTab } from './LocationPlacesTab';
import { LocationOrganizationsTab } from './LocationOrganizationsTab';
import { LocationEventsTab } from './LocationEventsTab';
import { LocationConnectionsTab } from './LocationConnectionsTab';
import { LocationTimelineTab } from './LocationTimelineTab';
import { ImmatureTabPlaceholder } from './ImmatureTabPlaceholder';
import { fetchCampaignMaps } from '@/lib/maps';
import { mapDisplayTitle } from '@/types/maps';
import { useWiki } from '@/contexts/WikiContext';
import type { EntityPageShellViewProps } from '@/lib/entityPageShells/types';

export function LocationPageShellView({
  campaignHandle,
  pageId,
  pageData,
  blocks,
  displayBlocks,
  pageSubview,
  templateType,
  isEditingPage,
  pageVisibility,
  onVisibilityChange,
  discovery,
  flatPages,
  onJumpToTab,
  onBlocksChange,
  wikiPageRenderer,
  onMetadataSaved,
  isDMUser,
}: EntityPageShellViewProps & {
  onMetadataSaved: (metadata: Record<string, unknown>) => void;
}) {
  const { refresh } = useWiki();
  const [campaignMaps, setCampaignMaps] = useState<Array<{ id: string; title: string }>>(
    [],
  );

  useEffect(() => {
    let cancelled = false;
    void fetchCampaignMaps(campaignHandle)
      .then((data) => {
        if (cancelled) return;
        setCampaignMaps(
          data.maps.map((m) => ({ id: m.id, title: mapDisplayTitle(m) })),
        );
      })
      .catch(() => {
        if (!cancelled) setCampaignMaps([]);
      });
    return () => {
      cancelled = true;
    };
  }, [campaignHandle]);

  const hasContentBlocks = displayBlocks.length > 0;
  const mapAssetId = pageData.mapAssetId ?? null;

  function renderTabContent() {
    switch (pageSubview) {
      case 'overview':
        return (
          <LocationOverviewDashboard
            campaignHandle={campaignHandle}
            pageId={pageId}
            displayTitle={pageData.title}
            templateType={pageData.templateType ?? templateType}
            blocks={blocks}
            flatPages={flatPages}
            isDMUser={isDMUser}
            isEditingPage={isEditingPage}
            pageMetadata={pageData.metadata}
            mapAssetId={mapAssetId}
            campaignMaps={campaignMaps}
            onMetadataSaved={onMetadataSaved}
            onBlocksChange={onBlocksChange}
            onJumpToTab={onJumpToTab}
          />
        );
      case 'people':
        return (
          <LocationPeopleTab
            campaignHandle={campaignHandle}
            locationPageId={pageId}
            pageMetadata={pageData.metadata}
            flatPages={flatPages}
          />
        );
      case 'places':
        return (
          <LocationPlacesTab
            campaignHandle={campaignHandle}
            locationPageId={pageId}
            pageMetadata={pageData.metadata}
            flatPages={flatPages}
          />
        );
      case 'organizations':
        return (
          <LocationOrganizationsTab
            campaignHandle={campaignHandle}
            locationPageId={pageId}
            pageMetadata={pageData.metadata}
            flatPages={flatPages}
          />
        );
      case 'events':
        return (
          <LocationEventsTab
            campaignHandle={campaignHandle}
            locationPageId={pageId}
            flatPages={flatPages}
          />
        );
      case 'connections':
        return (
          <LocationConnectionsTab
            campaignHandle={campaignHandle}
            locationPageId={pageId}
            pageMetadata={pageData.metadata}
            flatPages={flatPages}
            mapAssetId={mapAssetId}
            campaignMaps={campaignMaps}
          />
        );
      case 'timeline':
        return (
          <LocationTimelineTab
            campaignHandle={campaignHandle}
            locationPageId={pageId}
            flatPages={flatPages}
          />
        );
      case 'lore':
        return hasContentBlocks ? (
          wikiPageRenderer
        ) : (
          <ImmatureTabPlaceholder
            title="Lore"
            description="Extended prose and connected knowledge — separate from relationship summaries."
          />
        );
      default:
        return wikiPageRenderer;
    }
  }

  return (
    <div className="min-w-0">
      <LocationHeroSurface
        campaignHandle={campaignHandle}
        pageId={pageId}
        metadata={pageData.metadata}
        flatPages={flatPages}
        parentId={pageData.parentId ?? null}
        onParentIdSaved={() => void refresh()}
        isEditingPage={isEditingPage}
        pageVisibility={pageVisibility}
        discovery={discovery}
        onVisibilityChange={onVisibilityChange}
        onMetadataSaved={onMetadataSaved}
        showIdentityEditor={pageSubview === 'overview'}
      />
      {renderTabContent()}
    </div>
  );
}
