import type { ReactNode } from 'react';
import { GitBranch } from 'lucide-react';
import type { CampaignMapAsset } from '@/types/maps';
import type { WikiPageLayoutPayload, WikiPlayerEntry, WikiTreeNode } from '@/types/wiki';
import type { EntitySurfaceProfile } from '@/lib/entitySurfaceProfile';
import type { SurfaceProfileKey } from '@/lib/entitySurfaceProfile';
import type { CodexCognitiveMode } from '@/lib/codexWorkspaceUx';
import { SURFACE_SILENT_CLASS } from '@/lib/surfaceLayout';
import { EntityIdentityStrip } from '@/components/entity/EntityIdentityStrip';
import { InterpretiveLoreHeader } from '@/components/entity/lore/InterpretiveLoreHeader';
import { WikiPageIdentitySubtitle } from '@/components/wiki/WikiPageIdentitySubtitle';
import { EmbeddedMapSection } from '@/components/maps/EmbeddedMapSection';
import { OrganizationStructureTab } from '@/components/entity/OrganizationStructureTab';
import { FamilyLineageTab } from '@/components/entity/FamilyLineageTab';
import { EntityReadContextPanel } from '@/components/entity/EntityReadContextPanel';
import { PartyKnowledgeReadSection } from '@/components/entity/lore/PartyKnowledgeDiscoverySection';
import type { InterpretiveSummaryResponse } from '@/lib/loreKnowledgeApi';
import type { CharacterIdentityProjection } from '@/lib/characterIdentityProjection';
import type { OrganizationIdentityProjection } from '@/lib/organizationIdentityProjection';
import type { FamilyIdentityProjection } from '@/lib/familyIdentityProjection';
import type { BestiaryIdentityProjection } from '@/lib/bestiaryIdentityProjection';
import type { CodexIdentityProjection } from '@/lib/codexIdentityProjection';
import { useElevatedNarrativeView } from '@/hooks/useWikiCampaignPolicy';

export interface EntityWorkspaceSurfaceProps {
  campaignHandle: string;
  pageId: string;
  displayTitle: string;
  templateType: string;
  entitySurfaceProfile: EntitySurfaceProfile;
  entityDetailTab: 'lore' | 'structure';
  onEntityDetailTabChange: (tab: 'lore' | 'structure') => void;
  codexCognitiveMode: CodexCognitiveMode;
  hasHeroBlock: boolean;
  characterIdentityProjection: CharacterIdentityProjection | null;
  organizationIdentityProjection: OrganizationIdentityProjection | null;
  familyIdentityProjection: FamilyIdentityProjection | null;
  bestiaryIdentityProjection: BestiaryIdentityProjection | null;
  pass2IdentityProjection: CodexIdentityProjection | null;
  interpretiveSummary: InterpretiveSummaryResponse | null;
  professionSubtitle: string;
  knownForSubtitle: string;
  players: WikiPlayerEntry[];
  flatPages: WikiTreeNode[];
  isDMUser?: boolean;
  onEditFromStrip: (fieldKey: string) => void;
  headquartersId: string | null;
  seatLocationId: string | null;
  canTrackNarrativeThread: boolean;
  onTrackNarrativeThread: () => void;
  embeddedMap: CampaignMapAsset | null;
  embeddedCampaignMaps: CampaignMapAsset[];
  pageData: WikiPageLayoutPayload | null;
  readerFirstLayout: boolean;
  memberRole: string | undefined;
  allowPlayerChronologyManagement: boolean;
  hasEditorSlot: boolean;
  editorSlot: ReactNode;
  continuityPanel: ReactNode;
  loreSemanticPanel: ReactNode;
  wikiPageRenderer: ReactNode;
  loadingFallback?: ReactNode;
}

/**
 * Shared sectional rhythm for entity workspace pages:
 * header → primary narrative body → linked systems (via renderer) → lower supporting sections.
 */
export function EntityWorkspaceSurface({
  campaignHandle,
  pageId,
  displayTitle,
  templateType,
  entitySurfaceProfile,
  entityDetailTab,
  onEntityDetailTabChange,
  codexCognitiveMode,
  hasHeroBlock,
  characterIdentityProjection,
  organizationIdentityProjection,
  familyIdentityProjection,
  bestiaryIdentityProjection,
  pass2IdentityProjection,
  interpretiveSummary,
  professionSubtitle,
  knownForSubtitle,
  players,
  flatPages,
  isDMUser: isDMUserProp,
  onEditFromStrip,
  headquartersId,
  seatLocationId,
  canTrackNarrativeThread,
  onTrackNarrativeThread,
  embeddedMap,
  embeddedCampaignMaps,
  pageData,
  readerFirstLayout,
  memberRole,
  allowPlayerChronologyManagement,
  hasEditorSlot,
  editorSlot,
  continuityPanel,
  loreSemanticPanel,
  wikiPageRenderer,
  loadingFallback,
}: EntityWorkspaceSurfaceProps) {
  const isDMUser = useElevatedNarrativeView(isDMUserProp);
  const showEntityDetailTabs = Boolean(entitySurfaceProfile.structureTab);

  return (
    <>
      <header className="min-w-0 space-y-1 border-b border-focal-muted/15 pb-2">
        <EntityIdentityStrip
          surfaceKey={entitySurfaceProfile.key}
          campaignHandle={campaignHandle}
          displayTitleFallback={displayTitle}
          hasHeroBlock={hasHeroBlock}
          compact
          onEditField={onEditFromStrip}
          headquartersId={headquartersId}
          seatLocationId={seatLocationId}
          characterProjection={characterIdentityProjection}
          organizationProjection={organizationIdentityProjection}
          familyProjection={familyIdentityProjection}
          bestiaryProjection={bestiaryIdentityProjection}
          codexProjection={pass2IdentityProjection}
          narrativeStatus={pageData?.narrativeStatus ?? null}
        />
        <InterpretiveLoreHeader
          summary={interpretiveSummary}
          nameProjection={interpretiveSummary?.nameProjection ?? null}
        />
        <WikiPageIdentitySubtitle
          pageId={pageId}
          profileKey={entitySurfaceProfile.key}
          templateType={templateType}
          profession={professionSubtitle}
          knownFor={knownForSubtitle}
          players={players}
          flatPages={flatPages}
        />
        {canTrackNarrativeThread ? (
          <button
            type="button"
            onClick={onTrackNarrativeThread}
            className="region-depth-3 mt-2 inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium text-focal-foreground hover:bg-focal-elevated"
          >
            <GitBranch className="size-3.5" aria-hidden />
            Track narrative thread
          </button>
        ) : null}
      </header>

      {embeddedMap ? (
        <EmbeddedMapSection
          campaignHandle={campaignHandle}
          map={embeddedMap}
          canEdit={isDMUser}
          wikiPages={flatPages.map((page) => ({
            id: page.id,
            title: page.title,
          }))}
          campaignMaps={embeddedCampaignMaps}
        />
      ) : null}

      {showEntityDetailTabs ? (
        <div className="flex min-w-0 flex-wrap gap-1 border-b border-border pb-2">
          <button
            type="button"
            onClick={() => onEntityDetailTabChange('lore')}
            className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
              entityDetailTab === 'lore'
                ? 'bg-primary/15 text-primary'
                : 'text-muted hover:text-foreground'
            }`}
          >
            {entitySurfaceProfile.key === 'organization' ? 'Lore & Details' : 'Lore'}
          </button>
          <button
            type="button"
            onClick={() => onEntityDetailTabChange('structure')}
            className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
              entityDetailTab === 'structure'
                ? 'bg-primary/15 text-primary'
                : 'text-muted hover:text-foreground'
            }`}
          >
            {entitySurfaceProfile.key === 'organization' ||
            entitySurfaceProfile.structureTab === 'organization'
              ? 'Structure'
              : 'Lineage'}
          </button>
        </div>
      ) : null}

      <div
        className={`min-w-0 w-full ${
          codexCognitiveMode === 'writing' || codexCognitiveMode === 'reading'
            ? SURFACE_SILENT_CLASS
            : ''
        }`}
      >
        {pageData && entityDetailTab === 'structure' && entitySurfaceProfile.key === 'organization' ? (
          <OrganizationStructureTab
            campaignHandle={campaignHandle}
            orgPageId={pageId}
            orgMetadata={pageData.metadata}
            flatPages={flatPages}
          />
        ) : pageData && entityDetailTab === 'structure' && entitySurfaceProfile.key === 'family' ? (
          <FamilyLineageTab
            campaignHandle={campaignHandle}
            familyPageId={pageId}
            flatPages={flatPages}
          />
        ) : pageData ? (
          <>
            {readerFirstLayout && entityDetailTab === 'lore' ? (
              <EntityReadContextPanel
                campaignHandle={campaignHandle}
                pageId={pageId}
                surfaceProfileKey={entitySurfaceProfile.key}
                templateType={templateType}
                pageMetadata={pageData.metadata}
                flatPages={flatPages}
                memberRole={memberRole}
                allowPlayerChronologyManagement={allowPlayerChronologyManagement}
                onViewStructure={() => onEntityDetailTabChange('structure')}
              />
            ) : !readerFirstLayout ? (
              !isDMUser ? (
                <section className="mb-4 rounded-lg border border-border bg-surface/40 p-4">
                  <PartyKnowledgeReadSection
                    campaignHandle={campaignHandle}
                    pageId={pageId}
                  />
                </section>
              ) : null
            ) : null}
            {hasEditorSlot ? editorSlot : null}
            {loreSemanticPanel}
            {continuityPanel}
            {wikiPageRenderer}
          </>
        ) : (
          loadingFallback
        )}
      </div>
    </>
  );
}
