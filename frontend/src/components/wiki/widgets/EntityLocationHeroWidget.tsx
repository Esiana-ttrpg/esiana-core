import { LocationMetadataEditor } from '@/components/entity/LocationMetadataEditor';
import { SinceLastVisitPanel } from '@/components/entity/SinceLastVisitPanel';
import { RegionRumorsPanel } from '@/components/entity/RegionRumorsPanel';
import { BlockEmptyState } from '@/components/wiki/BlockEmptyState';
import { MapPin } from 'lucide-react';
import type { WikiTreeNode } from '@/types/wiki';
import { useElevatedNarrativeView } from '@/hooks/useWikiCampaignPolicy';

interface EntityLocationHeroWidgetProps {
  blockId: string;
  campaignHandle: string;
  pageId: string;
  metadata: unknown;
  flatPages: WikiTreeNode[];
  isEditingPage: boolean;
  onMetadataSaved: (metadata: Record<string, unknown>) => void;
  isDMUser?: boolean;
}

export function EntityLocationHeroWidget({
  blockId,
  campaignHandle,
  pageId,
  metadata,
  flatPages,
  isEditingPage,
  onMetadataSaved,
  isDMUser: isDMUserProp,
}: EntityLocationHeroWidgetProps) {
  const isDMUser = useElevatedNarrativeView(isDMUserProp);
  const memberRole = isDMUser ? 'GAMEMASTER' : 'Player';
  if (isEditingPage) {
    return (
      <LocationMetadataEditor
        blockId={blockId}
        campaignHandle={campaignHandle}
        pageId={pageId}
        metadata={metadata}
        flatPages={flatPages}
        onSaved={onMetadataSaved}
        bare
      />
    );
  }

  return (
    <div className="space-y-4">
      <BlockEmptyState
        icon={MapPin}
        title="Location overview"
        description="Region, ruler, and place details appear here."
      />
      <SinceLastVisitPanel
        campaignHandle={campaignHandle}
        locationPageId={pageId}
        memberRole={memberRole}
      />
      <RegionRumorsPanel
        campaignHandle={campaignHandle}
        locationPageId={pageId}
      />
    </div>
  );
}
