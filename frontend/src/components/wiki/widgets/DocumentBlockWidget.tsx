import { DocumentSectionEditor } from '@/components/entity/DocumentSectionEditor';
import type { WikiPageParentRef, WikiTag, WikiTagInput, WikiTreeNode } from '@/types/wiki';

interface DocumentBlockWidgetProps {
  campaignHandle: string;
  pageId: string;
  parentId: string | null;
  parentChain?: WikiPageParentRef | null;
  flatPages: WikiTreeNode[];
  templateType: string;
  pageVisibility: string;
  pageTags: WikiTagInput[];
  allCampaignTags: WikiTag[];
  onTemplateTypeChange: (templateType: string) => void;
  onVisibilityChange: (visibility: 'Public' | 'Party' | 'DM_Only') => void | Promise<void>;
  onParentChange: (next: {
    parentId: string | null;
    parent?: WikiPageParentRef | null;
  }) => void;
  onTreeRefresh: () => Promise<void>;
  onPageTagsChange: (tags: WikiTagInput[]) => void;
  isEditingPage: boolean;
}

export function DocumentBlockWidget(props: DocumentBlockWidgetProps) {
  if (!props.isEditingPage) {
    return (
      <p className="text-sm text-muted">
        Document settings (parent, tags, template) are available in edit mode.
      </p>
    );
  }

  return (
    <DocumentSectionEditor
      campaignHandle={props.campaignHandle}
      pageId={props.pageId}
      parentId={props.parentId}
      parentChain={props.parentChain}
      flatPages={props.flatPages}
      templateType={props.templateType}
      onTemplateTypeChange={props.onTemplateTypeChange}
      pageVisibility={props.pageVisibility}
      onVisibilityChange={props.onVisibilityChange}
      onParentChange={props.onParentChange}
      onTreeRefresh={props.onTreeRefresh}
      pageTags={props.pageTags}
      allCampaignTags={props.allCampaignTags}
      onPageTagsChange={props.onPageTagsChange}
      showTags={props.templateType !== 'QUEST'}
      tagsSaveHint="Save the page to persist tag changes."
    />
  );
}
