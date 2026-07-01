import { QuestMetadataEditor } from '@/components/quest/QuestMetadataEditor';
import { parseQuestMetadata } from '@/lib/questMetadata';
import type { WikiTag, WikiTagInput, WikiTreeNode } from '@/types/wiki';

interface EntityQuestPropertiesWidgetProps {
  campaignHandle: string;
  pageId: string;
  pageTitle: string;
  metadata: unknown;
  flatPages: WikiTreeNode[];
  pageTags: WikiTagInput[];
  allCampaignTags: WikiTag[];
  isEditingPage: boolean;
  onMetadataSaved: (metadata: Record<string, unknown>) => void;
  onPageTagsChange: (tags: WikiTagInput[]) => void;
}

export function EntityQuestPropertiesWidget({
  campaignHandle,
  pageId,
  pageTitle,
  metadata,
  flatPages,
  pageTags,
  allCampaignTags,
  isEditingPage,
  onMetadataSaved,
  onPageTagsChange,
}: EntityQuestPropertiesWidgetProps) {
  if (!isEditingPage) {
    const quest = parseQuestMetadata(metadata);
    return (
      <div className="space-y-1 text-sm text-muted">
        <p>
          <span className="text-foreground">{quest.questType?.trim() || 'Quest'}</span>
          {' · '}
          {quest.questStatus.replace('_', ' ')}
        </p>
        <p className="text-xs">Quest fields are available in edit mode.</p>
      </div>
    );
  }

  return (
    <QuestMetadataEditor
      campaignHandle={campaignHandle}
      pageId={pageId}
      pageTitle={pageTitle}
      metadata={metadata}
      flatPages={flatPages}
      pageTags={pageTags}
      allCampaignTags={allCampaignTags}
      onPageTagsChange={onPageTagsChange}
      onSaved={onMetadataSaved}
      bare
    />
  );
}
