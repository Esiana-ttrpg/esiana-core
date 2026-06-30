/**
 * Shared types for visibility-aware "recent from anywhere" feeds.
 */

export type RecentEntityType =
  | 'WIKI_PAGE'
  | 'QUEST'
  | 'SESSION'
  | 'CHARACTER'
  | 'CALENDAR_EVENT';

export type RecentEntityImportance =
  | 'PINNED'
  | 'SESSION_RELEVANT'
  | 'RESURFACED'
  | null;

export type RecentEntityVisibility = 'PUBLIC' | 'PARTY' | 'DM_ONLY' | null;

export interface RecentEntityFeedItem {
  entityType: RecentEntityType;
  entityId: string;
  title: string;
  href: string | null;
  updatedAt: string;
  summary?: string | null;
  visibility?: RecentEntityVisibility;
  icon?: string | null;
  contributors?: Array<{ userId: string; label: string }> | null;
  reason?: string | null;
  freshnessLabel?: string | null;
  importance?: RecentEntityImportance;
}

export interface RecentEntityFeedOptions {
  entityTypes?: RecentEntityType[];
  limit?: number;
  /** When true, reserved system/utility wiki pages are omitted (lore feeds). */
  excludeSystemWikiPages?: boolean;
}

export interface RecentEntityFeedResult {
  items: RecentEntityFeedItem[];
}
