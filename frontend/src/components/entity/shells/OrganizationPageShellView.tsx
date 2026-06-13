import { OrganizationHeroSurface } from './OrganizationHeroSurface';
import { OrganizationOverviewDashboard } from './OrganizationOverviewDashboard';
import { OrganizationStructureTab } from './OrganizationStructureTab';
import { OrganizationPresenceTab } from './OrganizationPresenceTab';
import { OrganizationRelationsTab } from './OrganizationRelationsTab';
import { OrganizationPeopleTab } from './OrganizationPeopleTab';
import { ImmatureTabPlaceholder } from './ImmatureTabPlaceholder';
import type { EntityPageShellViewProps } from '@/lib/entityPageShells/types';
import type { OrganizationIdentityProjection } from '@/lib/organizationIdentityProjection';
import type { WikiPageBlock } from '@/types/wiki';

function findHeroBlock(blocks: WikiPageBlock[]): WikiPageBlock | undefined {
  return blocks.find((b) => b.type === 'entity-org-hero');
}

export function OrganizationPageShellView({
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
  continuityPanel,
  onMetadataSaved,
  inspectorFocusField,
  organizationIdentityProjection,
}: EntityPageShellViewProps & {
  organizationIdentityProjection: OrganizationIdentityProjection | null;
  onMetadataSaved: (metadata: Record<string, unknown>) => void;
  inspectorFocusField?: string | null;
}) {
  const heroBlock = findHeroBlock(blocks);
  const hasContentBlocks = displayBlocks.length > 0;

  const editorSection =
    inspectorFocusField === 'symbolPreset' ||
    inspectorFocusField === 'doctrineTint' ||
    inspectorFocusField === 'emblemAssetId'
      ? 'symbol'
      : inspectorFocusField === 'currentPressures'
        ? 'pressures'
        : inspectorFocusField === 'privateAgenda'
          ? 'duality'
          : 'identity';

  function renderTabContent() {
    switch (pageSubview) {
      case 'overview':
        return (
          <OrganizationOverviewDashboard
            campaignHandle={campaignHandle}
            pageId={pageId}
            flatPages={flatPages}
            pageMetadata={pageData.metadata}
            isEditingPage={isEditingPage}
            onJumpToTab={onJumpToTab}
            onMetadataSaved={onMetadataSaved}
          />
        );
      case 'structure':
        return (
          <OrganizationStructureTab
            campaignHandle={campaignHandle}
            orgPageId={pageId}
            flatPages={flatPages}
          />
        );
      case 'presence':
        return (
          <OrganizationPresenceTab
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
          <OrganizationRelationsTab
            campaignHandle={campaignHandle}
            pageId={pageId}
            pageMetadata={pageData.metadata}
            flatPages={flatPages}
            isEditingPage={isEditingPage}
            onMetadataSaved={onMetadataSaved}
            displayBlocks={displayBlocks}
            wikiPageRenderer={wikiPageRenderer}
          />
        );
      case 'people':
        return (
          <OrganizationPeopleTab
            campaignHandle={campaignHandle}
            pageId={pageId}
            flatPages={flatPages}
          />
        );
      case 'lore':
        return hasContentBlocks ? (
          wikiPageRenderer
        ) : (
          <ImmatureTabPlaceholder
            title="Lore"
            description="Historical prose and context — kept separate from operational surfaces."
          />
        );
      case 'continuity':
        return continuityPanel ? (
          <>
            {continuityPanel}
            {hasContentBlocks ? wikiPageRenderer : null}
          </>
        ) : (
          <ImmatureTabPlaceholder
            title="Continuity"
            description="Narrative debt — unresolved plots, dormant branches, missing successors."
          />
        );
      default:
        return wikiPageRenderer;
    }
  }

  return (
    <div className="min-w-0">
      <OrganizationHeroSurface
        campaignHandle={campaignHandle}
        pageId={pageId}
        isEditingPage={isEditingPage}
        showIdentityEditor={pageSubview === 'overview'}
        editorSection={editorSection}
        pageVisibility={pageVisibility}
        discovery={discovery}
        onVisibilityChange={onVisibilityChange}
        onEditField={onEditFromStrip}
        identityProjection={organizationIdentityProjection}
        metadata={pageData.metadata}
        flatPages={flatPages}
        blockId={heroBlock?.id ?? 'entity-org-hero'}
        onMetadataSaved={onMetadataSaved}
        focusField={pageSubview === 'overview' ? inspectorFocusField : null}
      />
      {renderTabContent()}
    </div>
  );
}
