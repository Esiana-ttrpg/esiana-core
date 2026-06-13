import { FamilyMetadataEditor } from '@/components/entity/FamilyMetadataEditor';
import { FamilyIdentityStrip } from '@/components/entity/FamilyIdentityStrip';
import type { FamilyIdentityProjection } from '@/lib/familyIdentityProjection';
import { BlockEmptyState } from '@/components/wiki/BlockEmptyState';
import { Users } from 'lucide-react';
import type { WikiTreeNode } from '@/types/wiki';

interface EntityFamilyHeroWidgetProps {
  blockId: string;
  campaignHandle: string;
  pageId: string;
  metadata: unknown;
  flatPages: WikiTreeNode[];
  seatLocationId?: string | null;
  isEditingPage: boolean;
  identityProjection: FamilyIdentityProjection | null;
  onMetadataSaved: (metadata: Record<string, unknown>) => void;
}

export function EntityFamilyHeroWidget({
  blockId,
  campaignHandle,
  pageId,
  metadata,
  flatPages,
  seatLocationId,
  isEditingPage,
  identityProjection,
  onMetadataSaved,
}: EntityFamilyHeroWidgetProps) {
  if (!isEditingPage && identityProjection) {
    return (
      <FamilyIdentityStrip
        projection={identityProjection}
        campaignHandle={campaignHandle}
        seatLocationId={seatLocationId}
      />
    );
  }

  if (isEditingPage) {
    return (
      <FamilyMetadataEditor
        blockId={blockId}
        campaignHandle={campaignHandle}
        pageId={pageId}
        metadata={metadata}
        flatPages={flatPages}
        onSaved={onMetadataSaved}
        section="identity"
        bare
      />
    );
  }

  return (
    <BlockEmptyState
      icon={Users}
      title="Family overview"
      description="House identity and seat appear here."
    />
  );
}
