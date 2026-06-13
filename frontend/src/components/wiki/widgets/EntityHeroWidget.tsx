import { CharacterIdentityEditor } from '@/components/entity/CharacterIdentityEditor';
import { CharacterIdentityStrip } from '@/components/entity/CharacterIdentityStrip';
import type { CharacterIdentityProjection } from '@/lib/characterIdentityProjection';
import { BlockEmptyState } from '@/components/wiki/BlockEmptyState';
import { User } from 'lucide-react';
import type { WikiTreeNode } from '@/types/wiki';

interface EntityHeroWidgetProps {
  blockId: string;
  campaignHandle: string;
  pageId: string;
  metadata: unknown;
  flatPages: WikiTreeNode[];
  isEditingPage: boolean;
  identityProjection: CharacterIdentityProjection | null;
  onMetadataSaved: (metadata: Record<string, unknown>) => void;
  focusField?: string | null;
}

export function EntityHeroWidget({
  blockId,
  campaignHandle,
  pageId,
  metadata,
  flatPages,
  isEditingPage,
  identityProjection,
  onMetadataSaved,
  focusField,
}: EntityHeroWidgetProps) {
  const projection = identityProjection;

  const hasContent =
    Boolean(projection?.displayName?.trim()) ||
    Boolean(projection?.identityLine?.trim()) ||
    Boolean(projection?.portraitUrl);

  if (!isEditingPage) {
    if (!hasContent) {
      return (
        <BlockEmptyState
          compact
          title="No character overview yet"
          description="Overview appears when identity metadata is added."
        />
      );
    }
    return projection ? (
      <CharacterIdentityStrip
        projection={projection}
        campaignHandle={campaignHandle}
      />
    ) : null;
  }

  if (!hasContent && !focusField) {
    return (
      <BlockEmptyState
        icon={User}
        title="Character overview"
        description="Portrait, role, status, and affiliations live here."
        actionLabel="Start editing"
        onAction={() => {
          const el = document.getElementById('character-field-profession');
          el?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }}
      />
    );
  }

  return (
    <CharacterIdentityEditor
      blockId={blockId}
      campaignHandle={campaignHandle}
      pageId={pageId}
      metadata={metadata}
      flatPages={flatPages}
      onSaved={onMetadataSaved}
      focusField={focusField}
      section="identity"
      bare
    />
  );
}
