import { ThreadMetadataEditor } from '@/components/thread/ThreadMetadataEditor';
import type { WikiTreeNode } from '@/types/wiki';

interface EntityThreadPropertiesWidgetProps {
  campaignHandle: string;
  pageId: string;
  pageTitle: string;
  metadata: unknown;
  flatPages: WikiTreeNode[];
  isEditingPage: boolean;
  onMetadataSaved: (metadata: Record<string, unknown>) => void;
}

export function EntityThreadPropertiesWidget({
  campaignHandle,
  pageId,
  pageTitle,
  metadata,
  flatPages,
  isEditingPage,
  onMetadataSaved,
}: EntityThreadPropertiesWidgetProps) {
  if (!isEditingPage) {
    return (
      <p className="text-sm text-muted">
        Thread orchestration fields are available in edit mode.
      </p>
    );
  }

  return (
    <ThreadMetadataEditor
      campaignHandle={campaignHandle}
      pageId={pageId}
      pageTitle={pageTitle}
      metadata={metadata}
      flatPages={flatPages}
      onSaved={onMetadataSaved}
      bare
    />
  );
}
