import type { BlocksUpdater } from '@/components/wiki/WikiPageRenderer';
import { WikiPageRenderer } from '@/components/wiki/WikiPageRenderer';
import type { BlockDisplayState } from '@/lib/blockDisplayState';
import type { EntityPageShell } from '@/lib/entityPageShells/types';
import { canDeleteBlock } from '@/lib/entityPageShells/systemBlocks';
import type { AppearanceCapabilities } from '@/lib/entitySurfaceProfile';
import type { SurfaceProfileKey } from '@/lib/entitySurfaceProfile';
import type { WorkspaceMode } from '@/lib/surfaceDensityProfile';
import type { CharacterIdentityProjection } from '@/lib/characterIdentityProjection';
import type { OrganizationIdentityProjection } from '@/lib/organizationIdentityProjection';
import type { FamilyIdentityProjection } from '@/lib/familyIdentityProjection';
import type { BestiaryIdentityProjection } from '@/lib/bestiaryIdentityProjection';
import type { AncestryIdentityProjection } from '@/lib/ancestryIdentityProjection';
import type { WikiPageBlock, WikiPageLayoutPayload, WikiTag, WikiTagInput, WikiTreeNode } from '@/types/wiki';

export interface WikiPageRendererSlotProps {
  blocks: WikiPageBlock[];
  templateType: string;
  isEditingPage: boolean;
  showGridLines: boolean;
  onShowGridLinesChange: (next: boolean) => void;
  onBlocksChange: (updater: BlocksUpdater) => void;
  blockDisplayState: BlockDisplayState;
  onBlockDisplayChange: (next: BlockDisplayState) => void;
  memberRole?: string;
  allowPlayerChronologyManagement: boolean;
  isDirty: boolean;
  isSaving: boolean;
  isEventLorePage: boolean;
  readerFirstLayout: boolean;
  pageMetadata: WikiPageLayoutPayload['metadata'];
  surfaceProfileKey: SurfaceProfileKey;
  appearanceCapabilities: AppearanceCapabilities;
  workspaceMode: WorkspaceMode;
  campaignHandle: string;
  pageId: string;
  flatPages: WikiTreeNode[];
  onMetadataSaved: (metadata: Record<string, unknown>) => void;
  inspectorFocusField?: string | null;
  characterIdentityProjection: CharacterIdentityProjection | null;
  organizationIdentityProjection: OrganizationIdentityProjection | null;
  familyIdentityProjection: FamilyIdentityProjection | null;
  bestiaryIdentityProjection?: BestiaryIdentityProjection | null;
  ancestryIdentityProjection?: AncestryIdentityProjection | null;
  headquartersId: string | null;
  seatLocationId: string | null;
  pageVisibility: string;
  pageTags: WikiTagInput[];
  allCampaignTags: WikiTag[];
  parentId: string | null;
  parentChain: WikiPageLayoutPayload['parent'];
  onVisibilityChange: (visibility: 'Public' | 'Party' | 'DM_Only') => void | Promise<void>;
  onParentChange: (next: {
    parentId: string | null;
    parent?: WikiPageLayoutPayload['parent'];
  }) => void;
  onTreeRefresh: () => Promise<void>;
  onPageTagsChange: (tags: WikiTagInput[]) => void;
  onJumpToContinuity?: (blockId: string) => void;
  entityPageShell: EntityPageShell;
}

export function WikiPageRendererSlot({
  entityPageShell,
  onJumpToContinuity,
  ...props
}: WikiPageRendererSlotProps) {
  return (
    <WikiPageRenderer
      blocks={props.blocks}
      templateType={props.templateType}
      isEditingPage={props.isEditingPage}
      isEditingLayout={props.isEditingPage}
      showGridLines={props.showGridLines}
      onShowGridLinesChange={props.onShowGridLinesChange}
      onBlocksChange={props.onBlocksChange}
      blockDisplayState={props.blockDisplayState}
      onBlockDisplayChange={props.onBlockDisplayChange}
      memberRole={props.memberRole}
      allowPlayerChronologyManagement={props.allowPlayerChronologyManagement}
      isDirty={props.isDirty}
      isSaving={props.isSaving}
      isEventLorePage={props.isEventLorePage}
      readerFirstLayout={props.readerFirstLayout}
      pageMetadata={props.pageMetadata}
      surfaceProfileKey={props.surfaceProfileKey}
      appearanceCapabilities={props.appearanceCapabilities}
      workspaceMode={props.workspaceMode}
      campaignHandle={props.campaignHandle}
      pageId={props.pageId}
      flatPages={props.flatPages}
      onMetadataSaved={props.onMetadataSaved}
      inspectorFocusField={props.inspectorFocusField}
      characterIdentityProjection={props.characterIdentityProjection}
      organizationIdentityProjection={props.organizationIdentityProjection}
      familyIdentityProjection={props.familyIdentityProjection}
      bestiaryIdentityProjection={props.bestiaryIdentityProjection}
      ancestryIdentityProjection={props.ancestryIdentityProjection}
      headquartersId={props.headquartersId}
      seatLocationId={props.seatLocationId}
      pageVisibility={props.pageVisibility}
      pageTags={props.pageTags}
      allCampaignTags={props.allCampaignTags}
      parentId={props.parentId}
      parentChain={props.parentChain}
      onVisibilityChange={props.onVisibilityChange}
      onParentChange={props.onParentChange}
      onTreeRefresh={props.onTreeRefresh}
      onPageTagsChange={props.onPageTagsChange}
      onJumpToContinuity={onJumpToContinuity}
      canDeleteBlock={(block) => canDeleteBlock(entityPageShell, block)}
    />
  );
}
