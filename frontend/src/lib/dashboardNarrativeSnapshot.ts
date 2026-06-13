export type NarrativeSnapshotFact = {
  label: string;
  value: string;
  href?: string | null;
  emptyPrompt?: string | null;
};

export type NarrativeSnapshotStoryBeat = {
  id: string;
  title: string;
  href: string;
  statusLabel?: string | null;
  roleLabel: string;
};

export type NarrativeSnapshotPartyMember = {
  id: string;
  title: string;
  href: string;
  tagline: string | null;
};

export type NarrativeSnapshotActivityItem = {
  id: string;
  title: string;
  href: string | null;
  updatedAt: string;
  reason?: string | null;
};

export type NarrativeSnapshotDeepSystems = {
  worldPressure?: {
    levelLabel: string;
    summaryLines: string[];
    href: string;
  };
  threadSummaries?: Array<{ id: string; title: string; href: string; statusLabel: string }>;
  continuityDigest?: Array<{ label: string; count: number; href?: string }>;
};

export type CampaignNarrativeSnapshot = {
  campaignState: {
    calendarDate: NarrativeSnapshotFact;
    nextSession: NarrativeSnapshotFact;
    partySummary: NarrativeSnapshotFact & { count: number };
    location: NarrativeSnapshotFact;
  };
  currentStory: {
    arcTitle: string | null;
    arcProse: string | null;
    activeQuest: NarrativeSnapshotStoryBeat | null;
    activeThread: NarrativeSnapshotStoryBeat | null;
    emptyPrompt?: string | null;
    adventureHref: string;
  };
  partyRoster: {
    members: NarrativeSnapshotPartyMember[];
    emptyPrompt?: string | null;
    href: string;
  };
  recentActivity: {
    items: NarrativeSnapshotActivityItem[];
    viewAllHref: string;
    emptyMessage: string;
  };
  deepSystems: NarrativeSnapshotDeepSystems | null;
};
