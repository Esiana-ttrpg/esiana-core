import { OrganizationMetadataEditor } from '@/components/entity/OrganizationMetadataEditor';
import { OrganizationIdentityStrip } from '@/components/entity/OrganizationIdentityStrip';
import type { OrganizationIdentityProjection } from '@/lib/organizationIdentityProjection';
import { BlockEmptyState } from '@/components/wiki/BlockEmptyState';
import { Building2 } from 'lucide-react';
import type { WikiTreeNode } from '@/types/wiki';

interface EntityOrgHeroWidgetProps {
  blockId: string;
  campaignHandle: string;
  pageId: string;
  metadata: unknown;
  flatPages: WikiTreeNode[];
  headquartersId?: string | null;
  isEditingPage: boolean;
  identityProjection: OrganizationIdentityProjection | null;
  onMetadataSaved: (metadata: Record<string, unknown>) => void;
}

export function EntityOrgHeroWidget({
  blockId,
  campaignHandle,
  pageId,
  metadata,
  flatPages,
  headquartersId,
  isEditingPage,
  identityProjection,
  onMetadataSaved,
}: EntityOrgHeroWidgetProps) {
  if (!isEditingPage && identityProjection) {
    return (
      <OrganizationIdentityStrip
        projection={identityProjection}
        campaignHandle={campaignHandle}
        headquartersId={headquartersId}
      />
    );
  }

  if (isEditingPage) {
    return (
      <OrganizationMetadataEditor
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
      icon={Building2}
      title="Organization overview"
      description="Identity and leadership details appear here."
    />
  );
}
