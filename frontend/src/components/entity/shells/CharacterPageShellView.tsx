import { CharacterHeroSurface } from './CharacterHeroSurface';
import { CharacterOverviewDashboard } from './CharacterOverviewDashboard';
import { EntityPageShellView } from './EntityPageShellView';
import type { EntityPageShellViewProps } from '@/lib/entityPageShells/types';
import type { WikiPageBlock } from '@/types/wiki';

const IMMATURE_PLACEHOLDERS = {
  timeline: {
    title: 'Timeline',
    description:
      'Arc milestones, appearance changes, and major events will surface here as chronology hooks mature.',
  },
  discovery: {
    title: 'Discovery',
    description:
      'Track what the party knows — revealed forms, aliases, and gated truths will live here.',
  },
  continuity: {
    title: 'Continuity',
    description:
      'Unresolved threads, contradictions, and orphaned references will be reviewed here.',
  },
};

function findHeroBlock(blocks: WikiPageBlock[]): WikiPageBlock | undefined {
  return blocks.find((b) => b.type === 'entity-hero');
}

export function CharacterPageShellView({
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
  characterIdentityProjection,
  discovery,
  flatPages,
  onJumpToTab,
  onBlocksChange,
  onMetadataSaved,
  inspectorFocusField,
  pageTags,
  allCampaignTags,
  onPageTagsChange,
  prosePrimaryOverview,
  ...shellProps
}: EntityPageShellViewProps & {
  onMetadataSaved: (metadata: Record<string, unknown>) => void;
  inspectorFocusField?: string | null;
  pageTags: import('@/types/wiki').WikiTagInput[];
  allCampaignTags: import('@/types/wiki').WikiTag[];
  onPageTagsChange: (tags: import('@/types/wiki').WikiTagInput[]) => void;
  prosePrimaryOverview?: boolean;
}) {
  const heroBlock = findHeroBlock(blocks);

  const metadataSaved = (next: Record<string, unknown>) => {
    onMetadataSaved(next);
  };

  return (
    <EntityPageShellView
      pageSubview={pageSubview}
      displayBlocks={shellProps.displayBlocks}
      wikiPageRenderer={shellProps.wikiPageRenderer}
      continuityPanel={shellProps.continuityPanel}
      hero={
        <CharacterHeroSurface
          campaignHandle={campaignHandle}
          pageId={pageId}
          templateType={templateType}
          isDMUser={isDMUser}
          isEditingPage={isEditingPage}
          pageVisibility={pageVisibility}
          discovery={discovery}
          onVisibilityChange={onVisibilityChange}
          characterProjection={characterIdentityProjection}
          metadata={pageData.metadata}
          flatPages={flatPages}
          blockId={heroBlock?.id ?? 'entity-hero'}
          onMetadataSaved={metadataSaved}
          focusField={
            pageSubview === 'overview' && inspectorFocusField !== 'character-field-name'
              ? inspectorFocusField
              : null
          }
        />
      }
      overview={
        <CharacterOverviewDashboard
          campaignHandle={campaignHandle}
          pageId={pageId}
          displayTitle={displayTitle}
          templateType={pageData.templateType ?? 'DEFAULT'}
          blocks={blocks}
          flatPages={flatPages}
          isDMUser={isDMUser}
          isEditingPage={isEditingPage}
          pageMetadata={pageData.metadata}
          characterProjection={characterIdentityProjection}
          discovery={discovery}
          pageTags={pageTags}
          allCampaignTags={allCampaignTags}
          onPageTagsChange={onPageTagsChange}
          onMetadataSaved={metadataSaved}
          onJumpToTab={onJumpToTab}
          onBlocksChange={onBlocksChange}
          prosePrimary={prosePrimaryOverview}
          inspectorFocusField={inspectorFocusField}
        />
      }
      immatureTabPlaceholders={IMMATURE_PLACEHOLDERS}
    />
  );
}
