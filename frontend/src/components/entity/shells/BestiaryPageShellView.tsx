import { CreatureHeroSurface } from './CreatureHeroSurface';
import { CreatureIntelStrip } from './CreatureIntelStrip';
import { CreatureOverviewDashboard } from './CreatureOverviewDashboard';
import { ImmatureTabPlaceholder } from './ImmatureTabPlaceholder';
import type { EntityPageShellViewProps } from '@/lib/entityPageShells/types';
import type {
  BestiaryIdentityProjection,
  BestiaryIntelProjection,
} from '@/lib/bestiaryIdentityProjection';
import type { WikiPageBlock } from '@/types/wiki';

const IMMATURE_PLACEHOLDERS: Record<
  string,
  { title: string; description: string }
> = {
  encounters: {
    title: 'Encounters',
    description:
      'Where and how the party has met this creature will be recorded here.',
  },
  combat: {
    title: 'Combat',
    description:
      'Tactics, attack patterns, and observed behavior — not raw stat dumps.',
  },
  lore: {
    title: 'Lore',
    description: 'Myths, expedition records, and hunter journals will accumulate here.',
  },
  discovery: {
    title: 'Discovery',
    description: 'Track what the party knows — revealed forms and gated truths.',
  },
  continuity: {
    title: 'Continuity',
    description: 'Unresolved sightings, contradictions, and orphaned references.',
  },
};

function findHeroBlock(blocks: WikiPageBlock[]): WikiPageBlock | undefined {
  return blocks.find((b) => b.type === 'entity-bestiary-hero');
}

export function BestiaryPageShellView({
  campaignHandle,
  pageId,
  pageData,
  blocks,
  displayBlocks,
  pageSubview,
  isEditingPage,
  pageVisibility,
  onVisibilityChange,
  bestiaryIdentityProjection,
  bestiaryIntelProjection,
  discovery,
  flatPages,
  onEditFromStrip,
  onJumpToTab,
  wikiPageRenderer,
  continuityPanel,
  onMetadataSaved,
  inspectorFocusField,
}: EntityPageShellViewProps & {
  bestiaryIdentityProjection: BestiaryIdentityProjection | null;
  bestiaryIntelProjection: BestiaryIntelProjection;
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
      <CreatureHeroSurface
        campaignHandle={campaignHandle}
        pageId={pageId}
        isEditingPage={isEditingPage}
        showIdentityEditor={pageSubview === 'overview'}
        pageVisibility={pageVisibility}
        discovery={discovery}
        onVisibilityChange={onVisibilityChange}
        onEditField={onEditFromStrip}
        identityProjection={bestiaryIdentityProjection}
        intelProjection={bestiaryIntelProjection}
        metadata={pageData.metadata}
        flatPages={flatPages}
        blockId={heroBlock?.id ?? 'entity-bestiary-hero'}
        onMetadataSaved={onMetadataSaved}
        focusField={pageSubview === 'overview' ? inspectorFocusField : null}
      />

      {pageSubview === 'overview' && !isEditingPage ? (
        <CreatureIntelStrip intel={bestiaryIntelProjection} />
      ) : null}

      {pageSubview === 'overview' ? (
        <CreatureOverviewDashboard
          campaignHandle={campaignHandle}
          pageId={pageId}
          blocks={blocks}
          flatPages={flatPages}
          pageMetadata={pageData.metadata}
          intel={bestiaryIntelProjection}
          discovery={discovery}
          isEditingPage={isEditingPage}
          onJumpToTab={onJumpToTab}
        />
      ) : (
        renderContentTab()
      )}
    </div>
  );
}
