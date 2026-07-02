import { FamilyHeroSurface } from './FamilyHeroSurface';
import { FamilyOverviewDashboard } from './FamilyOverviewDashboard';
import { FamilyLineageTab } from '@/components/entity/FamilyLineageTab';
import { EntityReadContextPanel } from '@/components/entity/EntityReadContextPanel';
import { ImmatureTabPlaceholder } from './ImmatureTabPlaceholder';
import { entityWorkspaceReaderFirst } from '@/lib/entityWorkspaceSlots';
import type { EntityPageShellViewProps } from '@/lib/entityPageShells/types';
import type { FamilyIdentityProjection } from '@/lib/familyIdentityProjection';
import type { WikiPageBlock } from '@/types/wiki';
import { parseFamilyMetadata } from '@/lib/familyMetadata';

function findHeroBlock(blocks: WikiPageBlock[]): WikiPageBlock | undefined {
  return blocks.find((b) => b.type === 'entity-family-hero');
}

export function FamilyPageShellView({
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
  onBlocksChange,
  wikiPageRenderer,
  continuityPanel,
  onMetadataSaved,
  inspectorFocusField,
  familyIdentityProjection,
  isDMUser,
  memberRole,
  allowPlayerChronologyManagement,
}: EntityPageShellViewProps & {
  familyIdentityProjection: FamilyIdentityProjection | null;
  onMetadataSaved: (metadata: Record<string, unknown>) => void;
  inspectorFocusField?: string | null;
  memberRole?: string;
  allowPlayerChronologyManagement?: boolean;
}) {
  const heroBlock = findHeroBlock(blocks);
  const hasContentBlocks = displayBlocks.length > 0;
  const familyMeta = parseFamilyMetadata(pageData.metadata);
  const readerFirstLayout = !isDMUser && entityWorkspaceReaderFirst('family');

  function renderContentTab() {
    if (pageSubview === 'lineage') {
      return (
        <FamilyLineageTab
          campaignHandle={campaignHandle}
          familyPageId={pageId}
          flatPages={flatPages}
        />
      );
    }
    if (pageSubview === 'lore') {
      return hasContentBlocks ? (
        wikiPageRenderer
      ) : (
        <ImmatureTabPlaceholder
          title="Lore"
          description="House history, alliances, and scandal — the narrative prose for this family lives here."
        />
      );
    }
    if (pageSubview === 'continuity' && continuityPanel) {
      return (
        <>
          {continuityPanel}
          {hasContentBlocks ? wikiPageRenderer : null}
        </>
      );
    }
    if (pageSubview === 'discovery' && !hasContentBlocks) {
      return (
        <ImmatureTabPlaceholder
          title="Discovery"
          description="Track what the party knows about this house — revealed truths and gated lore will live here."
        />
      );
    }
    return wikiPageRenderer;
  }

  return (
    <div className="min-w-0">
      <FamilyHeroSurface
        campaignHandle={campaignHandle}
        pageId={pageId}
        isEditingPage={isEditingPage}
        showIdentityEditor={pageSubview === 'overview'}
        pageVisibility={pageVisibility}
        discovery={discovery}
        onVisibilityChange={onVisibilityChange}
        onEditField={onEditFromStrip}
        identityProjection={familyIdentityProjection}
        metadata={pageData.metadata}
        flatPages={flatPages}
        blockId={heroBlock?.id ?? 'entity-family-hero'}
        onMetadataSaved={onMetadataSaved}
        focusField={pageSubview === 'overview' ? inspectorFocusField : null}
        seatLocationId={familyMeta.seatLocationId}
      />

      {pageSubview === 'overview' ? (
        <>
          {readerFirstLayout ? (
            <EntityReadContextPanel
              campaignHandle={campaignHandle}
              pageId={pageId}
              surfaceProfileKey="family"
              templateType={templateType}
              pageMetadata={pageData.metadata}
              flatPages={flatPages}
              memberRole={memberRole}
              allowPlayerChronologyManagement={allowPlayerChronologyManagement ?? false}
              onViewStructure={() => onJumpToTab('lineage')}
            />
          ) : null}
          <FamilyOverviewDashboard
            campaignHandle={campaignHandle}
            pageId={pageId}
            templateType={templateType}
            blocks={blocks}
            flatPages={flatPages}
            pageMetadata={pageData.metadata}
            isEditingPage={isEditingPage}
            onJumpToTab={onJumpToTab}
            onBlocksChange={onBlocksChange}
          />
        </>
      ) : (
        renderContentTab()
      )}
    </div>
  );
}
