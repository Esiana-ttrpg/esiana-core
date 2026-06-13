import { memo } from 'react';
import type { WikiPageBlock, WikiTreeNode } from '@/types/wiki';
import type { CharacterIdentityProjection } from '@/lib/characterIdentityProjection';
import type { OrganizationIdentityProjection } from '@/lib/organizationIdentityProjection';
import type { FamilyIdentityProjection } from '@/lib/familyIdentityProjection';
import type { BestiaryIdentityProjection } from '@/lib/bestiaryIdentityProjection';
import type { WorkspaceMode } from '@/lib/surfaceDensityProfile';
import type { BlockDisplayState } from '@/lib/blockDisplayState';
import type { AppearanceCapabilities } from '@/lib/entitySurfaceProfile';
import type { SurfaceProfileKey } from '@/lib/entitySurfaceProfile';
import { CodexBlockChrome } from './CodexBlockChrome';
import type { BlockActionHandlers } from '@/lib/blockCapabilities';
import { isSemanticBlockType } from '@/lib/blockCapabilities';
import { ImageDisplayWidget } from './widgets/ImageDisplayWidget';
import { StatBlockWidget } from './widgets/StatBlockWidget';
import { TiptapWidget } from './widgets/TiptapWidget';
import { InfoboxWidget } from './widgets/InfoboxWidget';
import { ReferencesWidget } from './widgets/ReferencesWidget';
import { EntityHeroWidget } from './widgets/EntityHeroWidget';
import { EntityBiographyWidget } from './widgets/EntityBiographyWidget';
import { EntityRelationshipsWidget } from './widgets/EntityRelationshipsWidget';
import { EntityTimelineWidget } from './widgets/EntityTimelineWidget';
import { EntityDiscoveryWidget } from './widgets/EntityDiscoveryWidget';
import { EntityAppearanceWidget } from './widgets/EntityAppearanceWidget';
import { EntityOrgHeroWidget } from './widgets/EntityOrgHeroWidget';
import { EntityFamilyHeroWidget } from './widgets/EntityFamilyHeroWidget';
import { EntityLocationHeroWidget } from './widgets/EntityLocationHeroWidget';
import { EntityBestiaryHeroWidget } from './widgets/EntityBestiaryHeroWidget';
import { EntityAncestryHeroWidget } from './widgets/EntityAncestryHeroWidget';
import type { AncestryIdentityProjection } from '@/lib/ancestryIdentityProjection';
import { DocumentBlockWidget } from './widgets/DocumentBlockWidget';
import { EntityThreadPropertiesWidget } from './widgets/EntityThreadPropertiesWidget';
import { EntityScenePropertiesWidget } from './widgets/EntityScenePropertiesWidget';
import { EntityObjectivePropertiesWidget } from './widgets/EntityObjectivePropertiesWidget';
import { EntityArcPropertiesWidget } from './widgets/EntityArcPropertiesWidget';
import { getBlockDisplayTitle } from '@/utils/wikiWidgets';
export interface WidgetRegistryContext {
  campaignHandle: string;
  pageId: string;
  templateType: string;
  flatPages: WikiTreeNode[];
  pageMetadata?: unknown;
  surfaceProfileKey?: SurfaceProfileKey | null;
  appearanceCapabilities?: AppearanceCapabilities;
  isEditingPage: boolean;
  showLayoutChrome: boolean;
  workspaceMode: WorkspaceMode;
  memberRole?: string;
  allowPlayerChronologyManagement?: boolean;
  onMetadataSaved: (metadata: Record<string, unknown>) => void;
  onTemplateTypeChange?: (templateType: string) => void;
  onVisibilityChange?: (visibility: 'Public' | 'Party' | 'DM_Only') => void | Promise<void>;
  onParentChange?: (next: {
    parentId: string | null;
    parent?: import('@/types/wiki').WikiPageParentRef | null;
  }) => void;
  onTreeRefresh?: () => Promise<void>;
  onPageTagsChange?: (tags: import('@/types/wiki').WikiTagInput[]) => void;
  pageVisibility?: string;
  pageTags?: import('@/types/wiki').WikiTagInput[];
  allCampaignTags?: import('@/types/wiki').WikiTag[];
  parentId?: string | null;
  parentChain?: import('@/types/wiki').WikiPageParentRef | null;
  headquartersId?: string | null;
  seatLocationId?: string | null;
  focusField?: string | null;
  characterIdentityProjection?: CharacterIdentityProjection | null;
  organizationIdentityProjection?: OrganizationIdentityProjection | null;
  familyIdentityProjection?: FamilyIdentityProjection | null;
  bestiaryIdentityProjection?: BestiaryIdentityProjection | null;
  ancestryIdentityProjection?: AncestryIdentityProjection | null;
  onHeightChange?: (blockId: string, heightPx: number) => void;
  blockDisplayState?: BlockDisplayState;
  blockActionHandlers?: BlockActionHandlers;
}

interface WidgetRegistryProps extends WidgetRegistryContext {
  block: WikiPageBlock;
  onChange: (newContent: Record<string, unknown>) => void;
  onInteractionStart?: () => void;
  onInteractionEnd?: () => void;
}

function WidgetRegistryInner({
  block,
  onChange,
  onInteractionStart,
  onInteractionEnd,
  ...ctx
}: WidgetRegistryProps) {
  const interaction = { onInteractionStart, onInteractionEnd };
  const title = getBlockDisplayTitle(block);
  const useChrome = isSemanticBlockType(block.type);

  const wrap = (body: React.ReactNode) => {
    if (!useChrome) return body;
    return (
      <CodexBlockChrome
        blockId={block.id}
        blockType={block.type}
        title={title}
        workspaceMode={ctx.workspaceMode}
        isEditingPage={ctx.isEditingPage}
        showLayoutChrome={ctx.showLayoutChrome}
        displayScale={
          ctx.blockDisplayState?.activeBlockId === block.id
            ? ctx.blockDisplayState.scale
            : 'compact'
        }
        blockActionHandlers={ctx.blockActionHandlers}
        onHeightChange={ctx.onHeightChange}
      >
        {body}
      </CodexBlockChrome>
    );
  };

  switch (block.type) {
    case 'text-tiptap':
      return wrap(
        <TiptapWidget
          content={block.content}
          onChange={onChange}
          isEditingLayout={ctx.isEditingPage}
          {...interaction}
        />,
      );
    case 'text-biography':
      return wrap(
        <EntityBiographyWidget
          content={block.content}
          onChange={onChange}
          isEditingPage={ctx.isEditingPage}
          {...interaction}
        />,
      );
    case 'entity-hero':
      return wrap(
        <EntityHeroWidget
          blockId={block.id}
          campaignHandle={ctx.campaignHandle}
          pageId={ctx.pageId}
          metadata={ctx.pageMetadata}
          flatPages={ctx.flatPages}
          isEditingPage={ctx.isEditingPage}
          identityProjection={ctx.characterIdentityProjection ?? null}
          onMetadataSaved={ctx.onMetadataSaved}
          focusField={ctx.focusField}
        />,
      );
    case 'entity-org-hero':
      return wrap(
        <EntityOrgHeroWidget
          blockId={block.id}
          campaignHandle={ctx.campaignHandle}
          pageId={ctx.pageId}
          metadata={ctx.pageMetadata}
          flatPages={ctx.flatPages}
          headquartersId={ctx.headquartersId}
          isEditingPage={ctx.isEditingPage}
          identityProjection={ctx.organizationIdentityProjection ?? null}
          onMetadataSaved={ctx.onMetadataSaved}
        />,
      );
    case 'entity-family-hero':
      return wrap(
        <EntityFamilyHeroWidget
          blockId={block.id}
          campaignHandle={ctx.campaignHandle}
          pageId={ctx.pageId}
          metadata={ctx.pageMetadata}
          flatPages={ctx.flatPages}
          seatLocationId={ctx.seatLocationId}
          isEditingPage={ctx.isEditingPage}
          identityProjection={ctx.familyIdentityProjection ?? null}
          onMetadataSaved={ctx.onMetadataSaved}
        />,
      );
    case 'entity-location-hero':
      return wrap(
        <EntityLocationHeroWidget
          blockId={block.id}
          campaignHandle={ctx.campaignHandle}
          pageId={ctx.pageId}
          metadata={ctx.pageMetadata}
          flatPages={ctx.flatPages}
          isEditingPage={ctx.isEditingPage}
          onMetadataSaved={ctx.onMetadataSaved}
        />,
      );
    case 'entity-bestiary-hero':
      return wrap(
        <EntityBestiaryHeroWidget
          blockId={block.id}
          campaignHandle={ctx.campaignHandle}
          pageId={ctx.pageId}
          metadata={ctx.pageMetadata}
          flatPages={ctx.flatPages}
          isEditingPage={ctx.isEditingPage}
          identityProjection={ctx.bestiaryIdentityProjection ?? null}
          onMetadataSaved={ctx.onMetadataSaved}
          focusField={ctx.focusField}
        />,
      );
    case 'entity-ancestry-hero':
      return wrap(
        <EntityAncestryHeroWidget
          blockId={block.id}
          campaignHandle={ctx.campaignHandle}
          pageId={ctx.pageId}
          metadata={ctx.pageMetadata}
          flatPages={ctx.flatPages}
          isEditingPage={ctx.isEditingPage}
          identityProjection={ctx.ancestryIdentityProjection ?? null}
          onMetadataSaved={ctx.onMetadataSaved}
          focusField={ctx.focusField}
        />,
      );
    case 'entity-relationships':
      return wrap(
        <EntityRelationshipsWidget
          blockId={block.id}
          campaignHandle={ctx.campaignHandle}
          pageId={ctx.pageId}
          templateType={ctx.templateType}
          metadata={ctx.pageMetadata}
          flatPages={ctx.flatPages}
          isEditingPage={ctx.isEditingPage}
          onMetadataSaved={ctx.onMetadataSaved}
        />,
      );
    case 'entity-timeline':
      return wrap(
        <EntityTimelineWidget
          blockId={block.id}
          campaignHandle={ctx.campaignHandle}
          pageId={ctx.pageId}
          templateType={ctx.templateType}
          metadata={ctx.pageMetadata}
          flatPages={ctx.flatPages}
          isEditingPage={ctx.isEditingPage}
          onMetadataSaved={ctx.onMetadataSaved}
        />,
      );
    case 'entity-appearance':
      return wrap(
        <EntityAppearanceWidget
          blockId={block.id}
          campaignHandle={ctx.campaignHandle}
          pageId={ctx.pageId}
          metadata={ctx.pageMetadata}
          surfaceProfileKey={ctx.surfaceProfileKey ?? 'default'}
          appearanceCapabilities={
            ctx.appearanceCapabilities ?? {
              forms: false,
              details: false,
              discoveryVariants: false,
            }
          }
          isEditingPage={ctx.isEditingPage}
          onMetadataSaved={ctx.onMetadataSaved}
          focusField={ctx.focusField}
        />,
      );
    case 'entity-discovery':
      return wrap(
        <EntityDiscoveryWidget
          campaignHandle={ctx.campaignHandle}
          pageId={ctx.pageId}
          flatPages={ctx.flatPages}
          memberRole={ctx.memberRole}
          allowPlayerChronologyManagement={ctx.allowPlayerChronologyManagement}
        />,
      );
    case 'entity-thread-properties':
      return wrap(
        <EntityThreadPropertiesWidget
          campaignHandle={ctx.campaignHandle}
          pageId={ctx.pageId}
          pageTitle={
            ctx.flatPages.find((page) => page.id === ctx.pageId)?.title ?? 'Thread'
          }
          metadata={ctx.pageMetadata}
          flatPages={ctx.flatPages}
          isEditingPage={ctx.isEditingPage}
          onMetadataSaved={ctx.onMetadataSaved}
        />,
      );
    case 'entity-scene-properties':
      return wrap(
        <EntityScenePropertiesWidget
          campaignHandle={ctx.campaignHandle}
          pageId={ctx.pageId}
          pageTitle={
            ctx.flatPages.find((page) => page.id === ctx.pageId)?.title ?? 'Scene'
          }
          metadata={ctx.pageMetadata}
          flatPages={ctx.flatPages}
          isEditingPage={ctx.isEditingPage}
          onMetadataSaved={ctx.onMetadataSaved}
        />,
      );
    case 'entity-objective-properties':
      return wrap(
        <EntityObjectivePropertiesWidget
          campaignHandle={ctx.campaignHandle}
          pageId={ctx.pageId}
          pageTitle={
            ctx.flatPages.find((page) => page.id === ctx.pageId)?.title ?? 'Objective'
          }
          metadata={ctx.pageMetadata}
          flatPages={ctx.flatPages}
          isEditingPage={ctx.isEditingPage}
          onMetadataSaved={ctx.onMetadataSaved}
        />,
      );
    case 'entity-arc-properties':
      return wrap(
        <EntityArcPropertiesWidget
          campaignHandle={ctx.campaignHandle}
          pageId={ctx.pageId}
          metadata={ctx.pageMetadata}
          flatPages={ctx.flatPages}
          isEditingPage={ctx.isEditingPage}
          onMetadataSaved={ctx.onMetadataSaved}
        />,
      );
    case 'entity-document':
      return wrap(
        <DocumentBlockWidget
          campaignHandle={ctx.campaignHandle}
          pageId={ctx.pageId}
          parentId={ctx.parentId ?? null}
          parentChain={ctx.parentChain}
          flatPages={ctx.flatPages}
          templateType={ctx.templateType}
          pageVisibility={ctx.pageVisibility ?? 'Party'}
          pageTags={ctx.pageTags ?? []}
          allCampaignTags={ctx.allCampaignTags ?? []}
          onTemplateTypeChange={ctx.onTemplateTypeChange ?? (() => {})}
          onVisibilityChange={ctx.onVisibilityChange ?? (async () => {})}
          onParentChange={ctx.onParentChange ?? (() => {})}
          onTreeRefresh={ctx.onTreeRefresh ?? (async () => {})}
          onPageTagsChange={ctx.onPageTagsChange ?? (() => {})}
          isEditingPage={ctx.isEditingPage}
        />,
      );
    case 'image-display':
      return (
        <ImageDisplayWidget
          campaignHandle={ctx.campaignHandle}
          content={block.content}
          onChange={onChange}
          isEditingLayout={ctx.isEditingPage}
          {...interaction}
        />
      );
    case 'stat-block':
      return (
        <StatBlockWidget
          content={block.content}
          onChange={onChange}
          isEditingLayout={ctx.isEditingPage}
          {...interaction}
        />
      );
    case 'wiki-infobox':
      return (
        <InfoboxWidget
          content={block.content}
          onChange={onChange}
          isEditingLayout={ctx.isEditingPage}
          templateType={ctx.templateType}
          pageMetadata={ctx.pageMetadata}
          surfaceProfileKey={ctx.surfaceProfileKey}
          {...interaction}
        />
      );
    case 'wiki-backlinks':
      return (
        <ReferencesWidget
          content={block.content}
          onChange={onChange}
          isEditingLayout={ctx.isEditingPage}
        />
      );
    default:
      return (
        <div className="rounded-lg border border-red-600 bg-red-950/20 p-4 text-sm text-red-200">
          Unsupported widget type: {block.type}
        </div>
      );
  }
}

export const WidgetRegistry = memo(WidgetRegistryInner, (prev, next) => {
  return (
    prev.block.id === next.block.id &&
    prev.block.type === next.block.type &&
    prev.block.content === next.block.content &&
    prev.isEditingPage === next.isEditingPage &&
    prev.showLayoutChrome === next.showLayoutChrome &&
    prev.pageMetadata === next.pageMetadata &&
    prev.workspaceMode === next.workspaceMode &&
    prev.characterIdentityProjection === next.characterIdentityProjection &&
    prev.focusField === next.focusField
  );
});
