import type { PageNarrativeStatusProjection } from '@shared/pageNarrativeStatus';

export interface WikiTreeNode {
  id: string;
  campaignId: string;
  title: string;
  parentId: string | null;
  visibility: string;
  featuredImageId: string | null;
  templateType: string;
  workspace?: string | null;
  pathKey?: string | null;
  metadata?: CategoryMetadata | Record<string, unknown>;
  children: WikiTreeNode[];
  createdAt: string;
  updatedAt: string;
}

export interface WikiCampaignMeta {
  id: string;
  handle: string;
  name: string;
  updatedAt: string;
  role?: string;
  isMember?: boolean;
  isCampaignOwner?: boolean;
  campaignOwnerUserId?: string;
  discoverability?: import('@shared/campaignPolicy/discoverability').CampaignDiscoverabilityValue;
  allowPlayerChronologyManagement?: boolean;
  chronologyContributor?: boolean;
  partyId?: string | null;
  sidebarConfig?: import('@/lib/sidebarConfig').SidebarConfig;
  themePreset?: string;
  appearanceProfile?: import('@/lib/theme').ThemeProfile | null;
  sessionDuration?: string | null;
}

export interface WikiPlayerEntry {
  id: string;
  label: string;
  role: string;
  displayName?: string | null;
  playerContext?: string;
  identityPageId?: string | null;
}

export interface WikiTreePayload {
  tree: WikiTreeNode[];
  campaign: WikiCampaignMeta;
  players: WikiPlayerEntry[];
  playerSessionNotesFolderTitle: string;
}

export interface MetadataField {
  key: string;
  value: string;
}

export interface CategoryMetadata {
  fields: MetadataField[];
}

// Character-specific metadata
export interface CharacterMetadata {
  firstName?: string;
  lastName?: string;
  quickInfo?: MetadataField[]; // Denormalized index cache — synced from identity fields
  description?: string;
  dmSecrets?: DMSecretsData;
  // Typed identity fields (canonical) — see characterMetadata.ts
  profession?: string | null;
  title?: string | null;
  primaryAffiliationId?: string | null;
  ancestry?: string | null;
  currentLocationId?: string | null;
  status?: string | null;
  /** @deprecated Use appearance.gender — kept for legacy JSON reads */
  gender?: string | null;
  /** @deprecated Use appearance.pronouns — kept for legacy JSON reads */
  pronouns?: string | null;
  knownFor?: string | null;
  appearance?: Record<string, unknown>;
}

export interface DMSecretsData {
  wantsAndNeeds?: string;
  secretOrObstacle?: string;
  questRelation?: string; // Page ID or title of linked Quest
}

export interface WikiPageContent {
  dmCanon: string;
  partyDiscoveries: string;
  playerNotes: string;
  dmSecrets: string;
  metadata?: CategoryMetadata | CharacterMetadata;
}

export type WikiPageBlockType =
  | 'text-tiptap'
  | 'text-biography'
  | 'image-display'
  | 'stat-block'
  | 'wiki-infobox'
  | 'wiki-backlinks'
  | 'entity-hero'
  | 'entity-appearance'
  | 'entity-relationships'
  | 'entity-timeline'
  | 'entity-discovery'
  | 'entity-org-hero'
  | 'entity-family-hero'
  | 'entity-location-hero'
  | 'entity-bestiary-hero'
  | 'entity-ancestry-hero'
  | 'entity-document'
  | 'entity-thread-properties'
  | 'entity-scene-properties'
  | 'entity-objective-properties'
  | 'entity-arc-properties';

export type WikiBlockVisibility = 'Public' | 'Party' | 'DM_Only';

export interface WikiPageBlock {
  id: string;
  type: WikiPageBlockType;
  /** User-facing label for this widget box in the layout workspace. */
  title?: string;
  x: number;
  y: number;
  w: number;
  h: number;
  content: Record<string, unknown>;
  isPrivate: boolean;
  /**
   * Granular visibility for block-level ACL.
   * Back-compat: when absent, we derive DM-only from `isPrivate`.
   */
  visibility?: WikiBlockVisibility;
}

export interface WikiPageParentRef {
  id: string;
  title: string;
  parent?: WikiPageParentRef | null;
}

export interface WikiTag {
  id: string;
  name: string;
  label: string;
  icon?: string | null;
  color?: string | null;
  iconAssetUrl?: string | null;
}

export type WikiTagInput = {
  id?: string;
  name?: string;
  label?: string;
};

export type WikiTagAppearanceUpdate = {
  label?: string;
  icon?: string | null;
  color?: string | null;
};

export interface WikiPageLayoutPayload {
  id: string;
  title: string;
  workspace?: string | null;
  pathKey?: string | null;
  parentId: string | null;
  parent?: WikiPageParentRef | null;
  visibility: string;
  mapAssetId?: string | null;
  metadata?: CategoryMetadata | CharacterMetadata | SessionNoteMetadata;
  blocks: WikiPageBlock[];
  templateType: string;
  tags?: WikiTag[];
  createdAt?: string;
  updatedAt?: string;
  narrativeStatus?: PageNarrativeStatusProjection;
}

export interface WikiTagWithCount extends WikiTag {
  pageCount: number;
}

export interface TagsHubPageEntry {
  id: string;
  title: string;
  visibility: string;
  updatedAt: string;
  snippet: string;
}

export interface TagsHubPayload {
  tags: WikiTagWithCount[];
  selectedTagId: string | null;
  pages: TagsHubPageEntry[];
}

export interface SessionNoteMetadata {
  sessionNoteAuthorId?: string;
  locationPageId?: string;
  sessionGroupId?: string;
  timelinePointId?: string;
  fantasyEpochMinute?: string;
  isSessionAnchor?: boolean;
  isSessionAuthor?: boolean;
}

export interface SessionNotePerspectiveEntry {
  id: string;
  label: string;
  displayName?: string | null;
  playerContext?: string;
  identityPageId?: string | null;
  role: string;
  isDmRole?: boolean;
  masked?: boolean;
  hasNotes: boolean;
  pageId: string | null;
  markdown: string;
}

export interface SessionNotePerspectivesPayload {
  sessionGroupId?: string;
  timelinePointId?: string | null;
  roster: SessionNotePerspectiveEntry[];
}

export interface SessionAuthorColumn {
  userId: string;
  label: string;
  displayName?: string | null;
  playerContext?: string;
  identityPageId?: string | null;
  role: string;
  pageId: string | null;
  title: string;
  markdown: string;
  visibility: string;
  hasNotes: boolean;
  isDmRole: boolean;
  masked: boolean;
  createdAt: string;
  updatedAt: string;
  fantasyEpochMinute: string | null;
  sortKey: string;
}

export interface SessionEntityMention {
  pageId: string;
  title: string;
}

export interface CombinedSessionHeader {
  sessionGroupId: string;
  timelinePointId: string | null;
  anchorPageId: string | null;
  title: string;
  sequenceOrder: number | null;
  sessionCreatedAt: string;
  fantasyEpochMinute: string | null;
  fantasyDateLabel: string | null;
  locationPageId: string | null;
  locationTitle: string | null;
}

export interface AggregatedReferencesPayload {
  backlinks: WikiBacklink[];
  outlinks: WikiOutlink[];
  brokenOutlinks: WikiBrokenLink[];
}

export interface CombinedSessionNotesPayload {
  session: CombinedSessionHeader;
  columns: SessionAuthorColumn[];
  entitiesMentioned: SessionEntityMention[];
  referenceSourcePageIds: string[];
  references: AggregatedReferencesPayload;
}

export interface EnsureSessionAuthorNoteResult {
  created: boolean;
  page: WikiPageLayoutPayload;
}

export interface WikiBacklink {
  id: string;
  title: string;
  parentId: string | null;
  visibility: string;
  updatedAt: string;
  breadcrumbLabel?: string;
  href?: string;
  contextSnippet?: string | null;
}

export interface WikiOutlink {
  id: string;
  title: string;
  type: string;
  parentId: string | null;
  visibility: string;
  updatedAt: string;
  breadcrumbLabel?: string;
  href?: string;
}

export interface WikiBrokenLink {
  targetPageId: string;
  label?: string;
}

export interface WikiLinkIntegrityPayload {
  broken: WikiBrokenLink[];
  outboundCount: number;
}

export interface PageShortcut {
  pageId: string;
  title: string;
  sortOrder: number;
}

export interface SessionNotesNotebookPage {
  id: string;
  title: string;
  content: string;
  updatedAt: string;
  visibility: string;
  canEdit: boolean;
  canDelete: boolean;
  /** Present for timeline-backed sessions; use for `/notes/:timelinePointId` routing. */
  timelinePointId?: string;
  sequenceOrder?: number;
  fantasyEpochMinute?: string | null;
}

export interface SessionNotesNotebook {
  id: string;
  title: string;
  displayOrder: number;
  pages: SessionNotesNotebookPage[];
}

export interface SessionNotesIndexPayload {
  canManage: boolean;
  notebooks: SessionNotesNotebook[];
  uncategorized: SessionNotesNotebookPage[];
}

export interface InfoboxField {
  key: string;
  value: string;
}

export type WikiEditorTab = 'official' | 'player' | 'dm-secrets';

export const PLAYER_SESSION_NOTES_TITLE = 'Player Session Notes';

export type QuestStatus =
  | 'AVAILABLE'
  | 'ACTIVE'
  | 'COMPLETED'
  | 'FAILED'
  | 'ABANDONED';

export interface QuestDateParts {
  year: number | null;
  month: number | null;
  day: number | null;
}

export interface QuestMetadataFields {
  questStatus: QuestStatus;
  boardOrder: number | null;
  questType: string | null;
  questDate: QuestDateParts | null;
  questGiverId: string | null;
  factionId: string | null;
  rewardsText: string | null;
  dmRewardsText: string | null;
  ledgerReward: import('@shared/ledgerMetadata').QuestLedgerReward | null;
}

export interface QuestHubTagSummary {
  id: string;
  name: string;
  label: string;
  icon?: string | null;
  color?: string | null;
  iconAssetUrl?: string | null;
}

export interface QuestTaskProgress {
  completed: number;
  total: number;
  percent: number;
}

export interface QuestReferenceSummary {
  id: string;
  title: string;
  href: string;
}

export interface QuestHubNode {
  id: string;
  title: string;
  parentId: string | null;
  visibility: string;
  createdAt: string;
  updatedAt: string;
  snippet: string;
  quest: QuestMetadataFields;
  location: string | null;
  progressNote: string | null;
  tags: QuestHubTagSummary[];
  progress: QuestTaskProgress;
  recentActivity: WikiBacklink[];
  references: {
    questGiver?: QuestReferenceSummary | null;
    faction?: QuestReferenceSummary | null;
  };
  lifecycleState?: string;
  timePressure?: import('@shared/questTimeSimulation').QuestTimePressureBadge[];
  children: QuestHubNode[];
}

export interface QuestHubPayload {
  category: {
    id: string;
    title: string;
    parentId: string | null;
    visibility: string;
    updatedAt: string;
    systemCategoryKey: string | null;
  };
  previewAsPlayer: boolean;
  quests: QuestHubNode[];
}

export type ThreadKind =
  | 'mystery'
  | 'promise'
  | 'foreshadowing'
  | 'clue'
  | 'theory';

export type ThreadStatus = 'OPEN' | 'DORMANT' | 'RESOLVED' | 'ABANDONED';

export type ThreadNarrativeWeight = 'minor' | 'major' | 'critical';

export interface ThreadMetadataFields {
  threadMetadataVersion: string;
  threadKind: ThreadKind;
  threadStatus: ThreadStatus;
  narrativeWeight: ThreadNarrativeWeight;
  relatedPageIds: string[];
  introducedSessionId: string | null;
  lastAdvancedSessionId: string | null;
  resolvedSessionId: string | null;
  payoffPageId: string | null;
  playerSubmitted: boolean;
  sortOrder: number | null;
  emotionalResidueKind?:
    | 'grief'
    | 'revenge'
    | 'rivalry'
    | 'romance'
    | 'debt'
    | 'other'
    | null;
}

export interface ThreadHubNode {
  id: string;
  title: string;
  parentId: string | null;
  visibility: string;
  createdAt: string;
  updatedAt: string;
  snippet: string;
  thread: ThreadMetadataFields;
  lifecycleState?: string;
  metadataWarnings?: string[];
  threadSignals?: string[];
  references: {
    related: QuestReferenceSummary[];
    payoff?: QuestReferenceSummary | null;
  };
  children: ThreadHubNode[];
}

export interface ThreadHubPayload {
  category: {
    id: string;
    title: string;
    parentId: string | null;
    visibility: string;
    updatedAt: string;
    systemCategoryKey: string | null;
  };
  previewAsPlayer: boolean;
  threads: ThreadHubNode[];
}

export const EMPTY_WIKI_CONTENT: WikiPageContent = {
  dmCanon: '',
  partyDiscoveries: '',
  playerNotes: '',
  dmSecrets: '',
};
