import { CodexEntityIdentityStrip } from '@/components/entity/CodexEntityIdentityStrip';
import { AncestryMetadataEditor } from '@/components/entity/AncestryMetadataEditor';
import type { AncestryIdentityProjection } from '@/lib/ancestryIdentityProjection';
import { BlockEmptyState } from '@/components/wiki/BlockEmptyState';
import { Users } from 'lucide-react';
import type { WikiTreeNode } from '@/types/wiki';

interface EntityAncestryHeroWidgetProps {
  blockId: string;
  campaignHandle: string;
  pageId: string;
  metadata: unknown;
  flatPages: WikiTreeNode[];
  isEditingPage: boolean;
  identityProjection: AncestryIdentityProjection | null;
  onMetadataSaved: (metadata: Record<string, unknown>) => void;
  focusField?: string | null;
}

export function EntityAncestryHeroWidget({
  blockId,
  campaignHandle,
  pageId,
  metadata,
  flatPages,
  isEditingPage,
  identityProjection,
  onMetadataSaved,
  focusField,
}: EntityAncestryHeroWidgetProps) {
  if (!isEditingPage && identityProjection) {
    return (
      <CodexEntityIdentityStrip
        projection={identityProjection}
        surfaceProfileKey="ancestry"
      />
    );
  }

  if (isEditingPage) {
    return (
      <AncestryMetadataEditor
        campaignHandle={campaignHandle}
        pageId={pageId}
        metadata={metadata}
        flatPages={flatPages}
        onSaved={onMetadataSaved}
        section="identity"
        bare
        focusField={focusField}
      />
    );
  }

  return (
    <BlockEmptyState
      icon={Users}
      title="Ancestry profile"
      description="Cultural identity and lineage details appear here."
    />
  );
}
