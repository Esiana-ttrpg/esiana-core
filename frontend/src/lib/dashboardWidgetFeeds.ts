export type RecentEntitiesFeedItem = {
  id: string;
  title: string;
  subtitle: string | null;
  href: string;
  timestamp: string;
  categoryKey: string | null;
  templateType: string;
};

export type RecentEntitiesFeedResult = {
  items: RecentEntitiesFeedItem[];
};

export type DashboardWorldEventRow = {
  id: string;
  label: string;
  type: string;
  typeLabel: string;
  href: string | null;
  timestamp: string;
  epochMinute: string;
  importanceRank: number;
};

export type DashboardWorldEventsFeedResult = {
  items: DashboardWorldEventRow[];
};

export type FactionConflictRelatedEvent = {
  id: string;
  title: string;
  href: string | null;
  timestamp: string;
};

export type FactionConflictRow = {
  id: string;
  factionA: { pageId: string; title: string; href: string };
  factionB: { pageId: string; title: string; href: string };
  mutual: boolean;
  relatedEvents: FactionConflictRelatedEvent[];
};

export type FactionConflictFeedResult = {
  pairs: FactionConflictRow[];
};
