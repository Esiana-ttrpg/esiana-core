import { AncestryHeroSurface } from './AncestryHeroSurface';
import { AncestryOverviewDashboard } from './AncestryOverviewDashboard';
import { AncestryLineagesTab } from './AncestryLineagesTab';
import { AncestrySocietiesTab } from './AncestrySocietiesTab';
import { AncestryPresenceTab } from './AncestryPresenceTab';
import { AncestryRelationsTab } from './AncestryRelationsTab';
import { AncestryCharactersTab } from './AncestryCharactersTab';
import type { EntityPageShellViewProps } from '@/lib/entityPageShells/types';
import type { AncestryIdentityProjection } from '@/lib/ancestryIdentityProjection';
import type { WikiPageBlock } from '@/types/wiki';

function findHeroBlock(blocks: WikiPageBlock[]): WikiPageBlock | undefined {
  return blocks.find((b) => b.type === 'entity-ancestry-hero');
}

export function AncestryPageShellView({
  campaignHandle,
  pageId,
  pageData,
  blocks,
  displayBlocks,
  pageSubview,
  templateType,
  isEditingPage,
  pageVisibility,
  onVisibilityChange,
  discovery,
  flatPages,
  onEditFromStrip,
  onJumpToTab,
  wikiPageRenderer,
  onMetadataSaved,
  inspectorFocusField,
  ancestryIdentityProjection,
}: EntityPageShellViewProps & {
  ancestryIdentityProjection: AncestryIdentityProjection | null;
  onMetadataSaved: (metadata: Record<string, unknown>) => void;
  inspectorFocusField?: string | null;
}) {
  const heroBlock = findHeroBlock(blocks);

  function renderTabContent() {
    switch (pageSubview) {
      case 'overview':
        return (
          <AncestryOverviewDashboard
            campaignHandle={campaignHandle}
            pageId={pageId}
            blocks={blocks}
            flatPages={flatPages}
            pageMetadata={pageData.metadata}
            isEditingPage={isEditingPage}
            onJumpToTab={onJumpToTab}
          />
        );
      case 'lineages':
        return (
          <AncestryLineagesTab
            campaignHandle={campaignHandle}
            pageId={pageId}
            flatPages={flatPages}
            pageMetadata={pageData.metadata}
          />
        );
      case 'societies':
        return (
          <AncestrySocietiesTab
            campaignHandle={campaignHandle}
            pageId={pageId}
            flatPages={flatPages}
            pageMetadata={pageData.metadata}
            isEditingPage={isEditingPage}
            onMetadataSaved={onMetadataSaved}
          />
        );
      case 'presence':
        return (
          <AncestryPresenceTab
            campaignHandle={campaignHandle}
            pageId={pageId}
            flatPages={flatPages}
            pageMetadata={pageData.metadata}
            isEditingPage={isEditingPage}
            onMetadataSaved={onMetadataSaved}
          />
        );
      case 'relations':
        return (
          <AncestryRelationsTab
            campaignHandle={campaignHandle}
            pageId={pageId}
            templateType={templateType}
            pageMetadata={pageData.metadata}
            flatPages={flatPages}
            isEditingPage={isEditingPage}
            onMetadataSaved={onMetadataSaved}
            displayBlocks={displayBlocks}
            wikiPageRenderer={wikiPageRenderer}
          />
        );
      case 'characters':
        return (
          <AncestryCharactersTab
            campaignHandle={campaignHandle}
            pageId={pageId}
            flatPages={flatPages}
          />
        );
      default:
        return wikiPageRenderer;
    }
  }

  return (
    <div className="min-w-0">
      <AncestryHeroSurface
        campaignHandle={campaignHandle}
        pageId={pageId}
        isEditingPage={isEditingPage}
        showIdentityEditor={pageSubview === 'overview'}
        pageVisibility={pageVisibility}
        discovery={discovery}
        onVisibilityChange={onVisibilityChange}
        onEditField={onEditFromStrip}
        identityProjection={ancestryIdentityProjection}
        metadata={pageData.metadata}
        flatPages={flatPages}
        blockId={heroBlock?.id ?? 'entity-ancestry-hero'}
        onMetadataSaved={onMetadataSaved}
        focusField={pageSubview === 'overview' ? inspectorFocusField : null}
      />

      {renderTabContent()}
    </div>
  );
}
