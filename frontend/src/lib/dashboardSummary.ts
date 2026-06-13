/**
 * Campaign home summary payload from GET /dashboard.
 */

import type { DashboardSchedule } from './dashboardConfig';

export type RecentEntityType =
  | 'WIKI_PAGE'
  | 'QUEST'
  | 'SESSION'
  | 'CHARACTER'
  | 'CALENDAR_EVENT';

export interface RecentEntityFeedItem {
  entityType: RecentEntityType;
  entityId: string;
  title: string;
  href: string | null;
  updatedAt: string;
  summary?: string | null;
  visibility?: 'PUBLIC' | 'PARTY' | 'DM_ONLY' | null;
  icon?: string | null;
  reason?: string | null;
  freshnessLabel?: string | null;
  importance?: 'PINNED' | 'SESSION_RELEVANT' | 'RESURFACED' | null;
}

export interface DashboardSessionSummary {
  timelinePointId: string;
  title: string;
  plannedStartAt: string | null;
  sequenceOrder: number | null;
}

export interface DashboardLastSessionSummary extends DashboardSessionSummary {
  playedAt: string | null;
  snippet: string | null;
}

export interface DashboardChronometerSummary {
  masterCalendarId: string | null;
  label: string | null;
  season: string | null;
  moonPhase: string | null;
  upcomingEvents: Array<{ id: string; title: string; startAt: string }>;
}

export interface BulletinActivityItem {
  id: string;
  line: string;
  href: string | null;
  createdAt: string;
}

export interface EnsembleMemberSummary {
  userId: string;
  playerLabel: string;
  identityPageId: string | null;
}

export interface ContinueWhereYouLeftOffItem {
  entityType: 'WIKI_PAGE' | 'SESSION';
  entityId: string;
  title: string;
  href: string;
  reason: string;
  updatedAt?: string;
}

export interface DashboardSummary {
  statusStrip: {
    cadenceLabel: string | null;
    sessionLabel: string | null;
    worldTimeLabel: string | null;
    partyLabel: string | null;
    recruitmentLabel: string | null;
  };
  schedule: DashboardSchedule & { timezone: string | null };
  nextSession: DashboardSessionSummary | null;
  lastSession: DashboardLastSessionSummary | null;
  chronometer: DashboardChronometerSummary | null;
  recent: { items: RecentEntityFeedItem[] };
  campaignPulse: {
    lorePagesUpdatedWeek: number;
    nextSessionInDays: number | null;
    lines: string[];
  };
  party: { members: EnsembleMemberSummary[] };
  bulletin: {
    announcementsMarkdown: string | null;
    activity: BulletinActivityItem[];
  };
  personal: {
    shortcuts: Array<{ pageId: string; title: string; sortOrder: number }>;
    pinned: Array<{ id: string; title: string; href: string; freshnessLabel?: string | null }>;
    recentlyTouched: Array<{ id: string; title: string; updatedAt: string }>;
    continueWhereYouLeftOff: ContinueWhereYouLeftOffItem[];
  } | null;
  dmOverlay?: {
    openUnresolvedCount: number;
    recentPlayerEditsCount: number;
  };
  worldPressurePreview?: {
    eraName: string;
    paused: boolean;
    projectedByNextSession: { daysUntil: number; bullets: string[] } | null;
    risingTensions: Array<{ orgPageId: string; orgTitle: string; momentumLabel: string }>;
    eraTrends: string[];
    nearFutureBullets: string[];
  } | null;
}
