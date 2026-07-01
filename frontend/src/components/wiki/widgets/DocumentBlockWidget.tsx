import { DocumentSectionEditor } from '@/components/entity/DocumentSectionEditor';
import type { WikiPageParentRef, WikiTag, WikiTagInput, WikiTreeNode } from '@/types/wiki';

interface DocumentBlockWidgetProps {
  campaignHandle: string;
  pageId: string;
  parentId: string | null;
  parentChain?: WikiPageParentRef | null;
  flatPages: WikiTreeNode[];
  pageVisibility: string;
  pageTags: WikiTagInput[];
  allCampaignTags: WikiTag[];
  pageMetadata?: unknown;
  pageTitle?: string;
  onVisibilityChange: (visibility: 'Public' | 'Party' | 'DM_Only') => void | Promise<void>;
  onParentChange: (next: {
    parentId: string | null;
    parent?: WikiPageParentRef | null;
  }) => void;
  onTreeRefresh: () => Promise<void>;
  onPageTagsChange: (tags: WikiTagInput[]) => void;
  isEditingPage: boolean;
  hideTags?: boolean;
}

export function DocumentBlockWidget(props: DocumentBlockWidgetProps) {
  if (!props.isEditingPage) {
    return (
      <p className="text-sm text-muted">
        Document settings (parent, visibility, tags) are available in edit mode.
      </p>
    );
  }

  return (
    <DocumentSectionEditor
      campaignHandle={props.campaignHandle}
      pageId={props.pageId}
      pageTitle={props.pageTitle}
      parentId={props.parentId}
      parentChain={props.parentChain}
      flatPages={props.flatPages}
      pageMetadata={props.pageMetadata}
      pageVisibility={props.pageVisibility}
      onVisibilityChange={props.onVisibilityChange}
      onParentChange={props.onParentChange}
      onTreeRefresh={props.onTreeRefresh}
      pageTags={props.pageTags}
      allCampaignTags={props.allCampaignTags}
      onPageTagsChange={props.onPageTagsChange}
      showTags={!props.hideTags}
      tagsSaveHint="Save the page to persist tag changes."
    />
  );
}
