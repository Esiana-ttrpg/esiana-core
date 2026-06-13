import { EntityAppearanceEditor, entityAppearanceSupportsEditing } from '@/components/entity/EntityAppearanceEditor';
import { EntityAppearanceReadView } from '@/components/entity/EntityAppearanceReadView';
import { BlockEmptyState } from '@/components/wiki/BlockEmptyState';
import type { AppearanceCapabilities } from '@/lib/entitySurfaceProfile';
import {
  hasEntityAppearanceContent,
  projectAppearanceDetails,
  projectAppearanceForms,
  projectEntityAppearance,
} from '@/lib/entityAppearanceProjection';
import type { SurfaceProfileKey } from '@/lib/entitySurfaceProfile';

interface EntityAppearanceWidgetProps {
  blockId: string;
  campaignHandle: string;
  pageId: string;
  metadata: unknown;
  surfaceProfileKey: SurfaceProfileKey;
  appearanceCapabilities: AppearanceCapabilities;
  isEditingPage: boolean;
  onMetadataSaved: (metadata: Record<string, unknown>) => void;
  focusField?: string | null;
  featuredImageUrl?: string | null;
}

export function EntityAppearanceWidget({
  blockId,
  campaignHandle,
  pageId,
  metadata,
  surfaceProfileKey,
  appearanceCapabilities,
  isEditingPage,
  onMetadataSaved,
  focusField,
  featuredImageUrl,
}: EntityAppearanceWidgetProps) {
  const appearance = projectEntityAppearance(
    metadata,
    surfaceProfileKey,
    featuredImageUrl,
  );
  const forms = projectAppearanceForms(metadata, surfaceProfileKey);
  const details = projectAppearanceDetails(metadata, surfaceProfileKey);
  const hasContent = hasEntityAppearanceContent(appearance, forms, details);
  const canEdit = entityAppearanceSupportsEditing(surfaceProfileKey);

  if (!canEdit && !hasContent) {
    return (
      <BlockEmptyState
        compact
        title="No appearance yet"
        description="Appearance is not configured for this entity type."
      />
    );
  }

  if (!isEditingPage) {
    if (!hasContent) {
      return (
        <BlockEmptyState
          compact
          title="No appearance yet"
          description="Summary, tags, and an optional portrait can describe how this entity presents in the world."
        />
      );
    }
    return (
      <EntityAppearanceReadView
        appearance={appearance}
        forms={forms}
        details={details}
        appearanceCapabilities={appearanceCapabilities}
      />
    );
  }

  if (!canEdit) {
    return hasContent ? (
      <EntityAppearanceReadView
        appearance={appearance}
        forms={forms}
        details={details}
        appearanceCapabilities={appearanceCapabilities}
      />
    ) : (
      <BlockEmptyState
        compact
        title="No appearance yet"
        description="Appearance is not configured for this entity type."
      />
    );
  }

  return (
    <EntityAppearanceEditor
      blockId={blockId}
      campaignHandle={campaignHandle}
      pageId={pageId}
      metadata={metadata}
      surfaceProfileKey={surfaceProfileKey}
      appearanceCapabilities={appearanceCapabilities}
      onSaved={onMetadataSaved}
      focusField={focusField}
      bare
    />
  );
}
