import type { CampaignSummary } from './campaign';

export interface HubContinueCandidate {
  campaign: CampaignSummary;
  score: number;
  reason: string;
  ctaLabel: string;
  ctaHref: string;
  unreadCount?: number;
}

export interface HubPendingAction {
  type: string;
  label: string;
  href: string;
}

export interface HubArcIdentity {
  currentArc: string | null;
  tensionLine: string | null;
  continuityBullets: string[];
}

export interface HubMomentum {
  label: 'strong' | 'steady' | 'fading' | 'stalled';
  daysSinceLastSession: number | null;
}

export interface HubLastSessionSignal {
  title: string;
  playedAt: string | null;
  snippet: string | null;
  timelinePointId: string;
}

export type HubTableFilter = 'all' | 'managing' | 'joined' | 'public';

export interface HubRecentEditItem {
  campaignId: string;
  campaignName: string;
  campaignHandle: string;
  entityType: string;
  entityId: string;
  title: string;
  href: string;
  updatedAt: string;
}

export interface HubPartyPreviewMember {
  id: string;
  label: string;
  avatarUrl: string | null;
}

export interface HubQuickAction {
  label: string;
  href: string;
}

export interface HubCampaignSignals {
  lastActivityAt: string | null;
  unreadCount: number;
  nextSession: {
    title: string;
    plannedStartAt: string;
    timelinePointId: string;
  } | null;
  pendingActions: HubPendingAction[];
  continueScore: number;
  lastSession?: HubLastSessionSignal | null;
  momentum?: HubMomentum | null;
  attentionCounts?: {
    openThreads: number;
    unresolvedWikilinks: number;
    pendingDowntime: number;
    missingRecap: boolean;
  } | null;
  recentEdits?: HubRecentEditItem[];
  partyPreview?: HubPartyPreviewMember[];
  quickActions?: HubQuickAction[];
  arcIdentity?: HubArcIdentity | null;
  featuredOnHearth?: boolean;
}

export interface HubContinueEntityItem {
  campaignId: string;
  campaignName: string;
  campaignHandle: string;
  entityType: 'WIKI_PAGE' | 'SESSION';
  entityId: string;
  title: string;
  href: string;
  reason: string;
  updatedAt?: string;
  score: number;
}

export type HubAttentionSeverity = 'elevated' | 'soft' | 'whisper';

export type HubAttentionKind =
  | 'MISSING_RECAP'
  | 'STALE_SESSION'
  | 'RSVP'
  | 'JOIN_REQUEST'
  | 'OPEN_THREADS'
  | 'UNRESOLVED_WIKILINKS'
  | 'DOWNTIME_PENDING'
  | 'UNREAD'
  | 'HAVEN_ESCALATION';

export interface HubAttentionItem {
  id: string;
  campaignId: string;
  campaignName: string;
  campaignHandle: string;
  severity: HubAttentionSeverity;
  label: string;
  href: string;
  kind: HubAttentionKind;
  entityTitle?: string;
  dismissKey?: string;
}

export interface HubUpcomingChip {
  campaignId: string;
  campaignName: string;
  campaignHandle: string;
  title: string;
  plannedStartAt: string;
  href: string;
  needsRsvp: boolean;
}

export interface HubStats {
  managedCount: number;
  joinedCount: number;
  sessionsThisWeek: number;
  unreadNotifications: number;
}

export interface UserHubResponse {
  continue: HubContinueCandidate[];
  resumeHero: HubContinueCandidate[];
  continueFeed: HubContinueEntityItem[];
  campaigns: CampaignSummary[];
  pinnedCampaignIds: string[];
  attentionQueue: HubAttentionItem[];
  upcomingChips: HubUpcomingChip[];
  recentEdits: HubRecentEditItem[];
  stats: HubStats;
}

export type HubLibraryFilter = 'all' | 'active' | 'managing' | 'playing' | 'favorites';

export type ShelfDensityMode = 'cinematic' | 'shelf' | 'ledger' | 'auto';
