import type { ComponentType, ReactNode } from 'react';
import type { DiscoveryStateProjection } from '@shared/discoveryProjection';
import type { ContinuityIssue } from '@shared/continuityIssue';
import type { CharacterIdentityProjection } from '@/lib/characterIdentityProjection';
import type { SurfaceProfileKey } from '@/lib/entitySurfaceProfile';
import type {
  CodexRailSectionKey,
  PageContinuitySummary,
} from '@/lib/pageCodexDiagnostics';
import type { UnresolvedWikilinkRow } from '@/lib/wikiLoreGraph';
import type { PartyKnowledgeResponse } from '@/lib/loreKnowledgeApi';
import type { WikiPageBlock, WikiPageLayoutPayload, WikiTag, WikiTagInput, WikiTreeNode } from '@/types/wiki';

export type EntitySubviewId = string;

export type DashboardCardEditMode = 'inline' | 'jump-to-tab' | 'read-only';

export type SystemBlockRole = 'identity' | 'vitals' | 'biography';

export interface SystemBlockDef {
  type: WikiPageBlock['type'];
  role: SystemBlockRole;
  required: boolean;
  layoutHidden: true;
  deleteProtected: true;
  layoutGridGhost?: boolean;
  ghostLabel?: string;
}

export interface EntitySubviewDef {
  id: EntitySubviewId;
  label: string;
  /** Lower = higher nav priority (stays visible longer) */
  navPriority: number;
  collapseGroup?: 'primary' | 'secondary' | 'dm';
  dmOnly?: boolean;
}

export type { CodexRailSectionKey };

export interface EntityHeroProps {
  campaignHandle: string;
  pageId: string;
  isDMUser?: boolean;
  isEditingPage: boolean;
  pageVisibility: string;
  discovery?: DiscoveryStateProjection | null;
  onVisibilityChange?: (next: 'Public' | 'Party' | 'DM_Only') => void | Promise<void>;
  onEditField?: (fieldKey: string) => void;
  characterProjection?: CharacterIdentityProjection | null;
}

export interface EntityOverviewProps {
  campaignHandle: string;
  pageId: string;
  templateType: string;
  blocks: WikiPageBlock[];
  flatPages: WikiTreeNode[];
  isDMUser?: boolean;
  isEditingPage: boolean;
  pageMetadata?: unknown;
  characterProjection?: CharacterIdentityProjection | null;
  discovery?: DiscoveryStateProjection | null;
  onJumpToTab: (subviewId: EntitySubviewId, focus?: string) => void;
  onBlocksChange: (updater: (blocks: WikiPageBlock[]) => WikiPageBlock[]) => void;
}

export interface EntitySubviewNavProps {
  subviews: EntitySubviewDef[];
  activeSubview: EntitySubviewId;
  onSubviewChange: (id: EntitySubviewId) => void;
  isDMUser?: boolean;
}

export interface EntityPageShellViewProps {
  campaignHandle: string;
  pageId: string;
  displayTitle: string;
  templateType: string;
  pageData: WikiPageLayoutPayload;
  blocks: WikiPageBlock[];
  displayBlocks: WikiPageBlock[];
  pageSubview: EntitySubviewId;
  onSubviewChange: (id: EntitySubviewId) => void;
  isDMUser?: boolean;
  isEditingPage: boolean;
  showGridLines: boolean;
  pageVisibility: string;
  onVisibilityChange?: (next: 'Public' | 'Party' | 'DM_Only') => void | Promise<void>;
  characterIdentityProjection: CharacterIdentityProjection | null;
  discovery?: DiscoveryStateProjection | null;
  continuitySummary?: PageContinuitySummary | null;
  sharedIssues?: ContinuityIssue[];
  sharedUnresolved?: UnresolvedWikilinkRow[];
  diagnosticsLoading?: boolean;
  partyKnowledge?: PartyKnowledgeResponse | null;
  flatPages: WikiTreeNode[];
  onEditFromStrip: (fieldKey: string) => void;
  onJumpToTab: (subviewId: EntitySubviewId, focus?: string) => void;
  onBlocksChange: (updater: (blocks: WikiPageBlock[]) => WikiPageBlock[]) => void;
  onFocusBlock?: (blockType: string, field?: string) => void;
  wikiPageRenderer: ReactNode;
  loreSemanticPanel?: ReactNode;
  continuityPanel?: ReactNode;
  entityDetailTab?: 'lore' | 'structure';
  onEntityDetailTabChange?: (tab: 'lore' | 'structure') => void;
  /** Remaining EntityWorkspaceSurface props for generic shell */
  genericSurfaceProps?: Record<string, unknown>;
}

export interface EntityPageShell {
  key: SurfaceProfileKey;
  subviews: EntitySubviewDef[];
  systemBlocks: SystemBlockDef[];
  railSectionOrder: CodexRailSectionKey[];
  /** Sections to hide from rail for this shell */
  railSectionsHidden?: CodexRailSectionKey[];
  defaultRailOpen?: boolean;
  HeroSurface?: ComponentType<EntityHeroProps>;
  OverviewDashboard?: ComponentType<EntityOverviewProps>;
  filterBlocksForSubview: (
    blocks: WikiPageBlock[],
    subview: EntitySubviewId,
    isDMUser: boolean,
  ) => WikiPageBlock[];
  filterLayoutBlocks: (
    blocks: WikiPageBlock[],
    options: { showGridLines: boolean; subview: EntitySubviewId },
  ) => WikiPageBlock[];
  isValidSubview: (subview: EntitySubviewId, isDMUser: boolean) => boolean;
  getVisibleSubviews: (isDMUser: boolean) => EntitySubviewDef[];
  subviewForBlockType: (type: WikiPageBlock['type']) => EntitySubviewId;
  immatureTabPlaceholder?: (subview: EntitySubviewId) => ReactNode | null;
}

export interface PageSettingsDrawerProps {
  open: boolean;
  onClose: () => void;
  campaignHandle: string;
  pageId: string;
  parentId: string | null;
  parentChain?: WikiPageLayoutPayload['parent'];
  flatPages: WikiTreeNode[];
  templateType: string;
  onTemplateTypeChange: (templateType: string) => void;
  pageVisibility: string;
  onVisibilityChange: (visibility: 'Public' | 'Party' | 'DM_Only') => void | Promise<void>;
  onParentChange: (next: {
    parentId: string | null;
    parent?: WikiPageLayoutPayload['parent'];
  }) => void;
  onTreeRefresh: () => Promise<void>;
  pageTags: WikiTagInput[];
  allCampaignTags: WikiTag[];
  onPageTagsChange: (tags: WikiTagInput[]) => void;
}
