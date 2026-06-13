import { ObjectiveMetadataEditor } from '@/components/objective/ObjectiveMetadataEditor';
import { parseObjectiveMetadata } from '@/lib/objectiveMetadata';
import type { WikiTreeNode } from '@/types/wiki';

interface EntityObjectivePropertiesWidgetProps {
  campaignHandle: string;
  pageId: string;
  pageTitle: string;
  metadata: unknown;
  flatPages: WikiTreeNode[];
  isEditingPage: boolean;
  onMetadataSaved: (metadata: Record<string, unknown>) => void;
}

export function EntityObjectivePropertiesWidget({
  campaignHandle,
  pageId,
  metadata,
  flatPages,
  isEditingPage,
  onMetadataSaved,
}: EntityObjectivePropertiesWidgetProps) {
  if (!isEditingPage) {
    const objective = parseObjectiveMetadata(metadata);
    const currentPage = flatPages.find((p) => p.id === pageId);
    const parentQuest = currentPage?.parentId
      ? flatPages.find((p) => p.id === currentPage.parentId)
      : undefined;
    return (
      <div className="space-y-1 text-sm">
        <div className="font-medium">{objective.objectiveStatus}</div>
        {parentQuest ? (
          <p className="text-xs text-muted-foreground">Quest: {parentQuest.title}</p>
        ) : null}
        {objective.summary ? <p className="text-muted">{objective.summary}</p> : null}
      </div>
    );
  }

  return (
    <ObjectiveMetadataEditor
      campaignHandle={campaignHandle}
      pageId={pageId}
      metadata={metadata}
      flatPages={flatPages}
      onSaved={onMetadataSaved}
      bare
    />
  );
}
