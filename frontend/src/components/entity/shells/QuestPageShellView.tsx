import { QuestHeroSurface } from './QuestHeroSurface';
import { QuestOverviewDashboard } from './QuestOverviewDashboard';
import { EntityPageShellView } from './EntityPageShellView';
import type { EntityPageShellViewProps } from '@/lib/entityPageShells/types';

const IMMATURE_PLACEHOLDERS = {
  continuity: {
    title: 'Continuity',
    description:
      'Unresolved threads, contradictions, and orphaned references will be reviewed here.',
  },
};

export function QuestPageShellView({
  campaignHandle,
  pageId,
  displayTitle,
  templateType,
  pageData,
  blocks,
  pageSubview,
  isEditingPage,
  isDMUser,
  pageVisibility,
  onVisibilityChange,
  discovery,
  flatPages,
  onBlocksChange,
  onMetadataSaved,
  pageTags,
  allCampaignTags,
  onPageTagsChange,
  prosePrimaryOverview,
  ...shellProps
}: EntityPageShellViewProps & {
  onMetadataSaved: (metadata: Record<string, unknown>) => void;
  pageTags: import('@/types/wiki').WikiTagInput[];
  allCampaignTags: import('@/types/wiki').WikiTag[];
  onPageTagsChange: (tags: import('@/types/wiki').WikiTagInput[]) => void;
  prosePrimaryOverview?: boolean;
}) {
  return (
    <EntityPageShellView
      pageSubview={pageSubview}
      displayBlocks={shellProps.displayBlocks}
      wikiPageRenderer={shellProps.wikiPageRenderer}
      continuityPanel={shellProps.continuityPanel}
      hero={
        <QuestHeroSurface
          pageVisibility={pageVisibility}
          discovery={discovery}
          isEditingPage={isEditingPage}
          onVisibilityChange={onVisibilityChange}
        />
      }
      overview={
        <QuestOverviewDashboard
          campaignHandle={campaignHandle}
          pageId={pageId}
          displayTitle={displayTitle}
          templateType={pageData.templateType ?? templateType}
          blocks={blocks}
          flatPages={flatPages}
          isDMUser={isDMUser}
          isEditingPage={isEditingPage}
          pageMetadata={pageData.metadata}
          discovery={discovery}
          pageTags={pageTags}
          allCampaignTags={allCampaignTags}
          onPageTagsChange={onPageTagsChange}
          onMetadataSaved={onMetadataSaved}
          onJumpToTab={() => {}}
          onBlocksChange={onBlocksChange}
          prosePrimary={prosePrimaryOverview}
          pageVisibility={pageVisibility}
          onVisibilityChange={onVisibilityChange}
        />
      }
      immatureTabPlaceholders={IMMATURE_PLACEHOLDERS}
    />
  );
}
