import { CharacterHeroSurface } from './CharacterHeroSurface';
import { CharacterOverviewDashboard } from './CharacterOverviewDashboard';
import { ImmatureTabPlaceholder } from './ImmatureTabPlaceholder';
import type { EntityPageShellViewProps } from '@/lib/entityPageShells/types';
import type { WikiPageBlock } from '@/types/wiki';

const IMMATURE_PLACEHOLDERS: Record<
  string,
  { title: string; description: string }
> = {
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
  pageData,
  blocks,
  displayBlocks,
  pageSubview,
  isEditingPage,
  pageVisibility,
  onVisibilityChange,
  characterIdentityProjection,
  discovery,
  flatPages,
  onEditFromStrip,
  onJumpToTab,
  onBlocksChange,
  wikiPageRenderer,
  continuityPanel,
  onMetadataSaved,
  inspectorFocusField,
}: EntityPageShellViewProps & {
  onMetadataSaved: (metadata: Record<string, unknown>) => void;
  inspectorFocusField?: string | null;
}) {
  const heroBlock = findHeroBlock(blocks);
  const immature = IMMATURE_PLACEHOLDERS[pageSubview];
  const hasContentBlocks = displayBlocks.length > 0;

  function renderContentTab() {
    if (pageSubview === 'continuity' && continuityPanel) {
      return (
        <>
          {continuityPanel}
          {hasContentBlocks ? wikiPageRenderer : null}
        </>
      );
    }
    if (immature && !hasContentBlocks) {
      return (
        <ImmatureTabPlaceholder
          title={immature.title}
          description={immature.description}
        />
      );
    }
    return wikiPageRenderer;
  }

  return (
    <div className="min-w-0">
      <CharacterHeroSurface
        campaignHandle={campaignHandle}
        pageId={pageId}
        isEditingPage={isEditingPage}
        showIdentityEditor={pageSubview === 'overview'}
        pageVisibility={pageVisibility}
        discovery={discovery}
        onVisibilityChange={onVisibilityChange}
        onEditField={onEditFromStrip}
        characterProjection={characterIdentityProjection}
        metadata={pageData.metadata}
        flatPages={flatPages}
        blockId={heroBlock?.id ?? 'entity-hero'}
        onMetadataSaved={onMetadataSaved}
        focusField={pageSubview === 'overview' ? inspectorFocusField : null}
      />

      {pageSubview === 'overview' ? (
        <CharacterOverviewDashboard
          campaignHandle={campaignHandle}
          pageId={pageId}
          templateType={pageData.templateType ?? 'DEFAULT'}
          blocks={blocks}
          flatPages={flatPages}
          isEditingPage={isEditingPage}
          pageMetadata={pageData.metadata}
          characterProjection={characterIdentityProjection}
          discovery={discovery}
          onJumpToTab={onJumpToTab}
          onBlocksChange={onBlocksChange}
        />
      ) : (
        renderContentTab()
      )}
    </div>
  );
}
