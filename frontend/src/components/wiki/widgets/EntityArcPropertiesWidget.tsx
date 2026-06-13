import { ArcMetadataEditor } from '@/components/arc/ArcMetadataEditor';
import { isArcMetadataPresent } from '@/lib/arcMetadata';
import type { WikiTreeNode } from '@/types/wiki';

interface EntityArcPropertiesWidgetProps {
  campaignHandle: string;
  pageId: string;
  metadata: unknown;
  flatPages: WikiTreeNode[];
  isEditingPage: boolean;
  onMetadataSaved: (metadata: Record<string, unknown>) => void;
}

export function EntityArcPropertiesWidget({
  campaignHandle,
  pageId,
  metadata,
  flatPages,
  isEditingPage,
  onMetadataSaved,
}: EntityArcPropertiesWidgetProps) {
  if (!isEditingPage && !isArcMetadataPresent(metadata)) {
    return (
      <p className="text-sm text-muted">
        Arc overlay fields are available in edit mode.
      </p>
    );
  }

  return (
    <ArcMetadataEditor
      campaignHandle={campaignHandle}
      pageId={pageId}
      metadata={metadata}
      flatPages={flatPages}
      onSaved={onMetadataSaved}
      bare
    />
  );
}
