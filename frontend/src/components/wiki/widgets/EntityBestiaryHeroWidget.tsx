import { BestiaryMetadataEditor } from '@/components/entity/BestiaryMetadataEditor';
import { BestiaryIdentityStrip } from '@/components/entity/BestiaryIdentityStrip';
import type { BestiaryIdentityProjection } from '@/lib/bestiaryIdentityProjection';
import { BlockEmptyState } from '@/components/wiki/BlockEmptyState';
import { Skull } from 'lucide-react';
import type { WikiTreeNode } from '@/types/wiki';

interface EntityBestiaryHeroWidgetProps {
  blockId: string;
  campaignHandle: string;
  pageId: string;
  metadata: unknown;
  flatPages: WikiTreeNode[];
  isEditingPage: boolean;
  identityProjection: BestiaryIdentityProjection | null;
  onMetadataSaved: (metadata: Record<string, unknown>) => void;
  focusField?: string | null;
}

export function EntityBestiaryHeroWidget({
  blockId,
  campaignHandle,
  pageId,
  metadata,
  flatPages,
  isEditingPage,
  identityProjection,
  onMetadataSaved,
  focusField,
}: EntityBestiaryHeroWidgetProps) {
  if (!isEditingPage && identityProjection) {
    return <BestiaryIdentityStrip projection={identityProjection} />;
  }

  if (isEditingPage) {
    return (
      <BestiaryMetadataEditor
        blockId={blockId}
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
      icon={Skull}
      title="Creature profile"
      description="Identity and ecology details appear here."
    />
  );
}
