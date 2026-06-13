export interface CampaignRecruitmentSettings {
  isLookingForGroup: boolean;
  isPublic: boolean;
  scheduleFrequency: string | null;
  scheduleDay: string | null;
  scheduleTime: string | null;
  currentSession: number;
  sessionDuration: string | null;
  estimatedLength: string | null;
  maxSeats: number;
}

export type ScheduleOverlapLabel = 'strong' | 'partial' | 'unknown';

export interface CampaignJoinRequestRow {
  id: string;
  message: string;
  status: 'PENDING' | 'ACCEPTED' | 'REJECTED';
  createdAt: string;
  scheduleOverlap?: ScheduleOverlapLabel;
  user: {
    id: string;
    label: string;
    email: string;
    avatarUrl?: string | null;
    pronouns?: string | null;
    timezone?: string | null;
    gmStyleTags?: string[];
    publicBioExcerpt?: string | null;
  };
}

export interface PublicTablePlayer {
  id: string;
  label: string;
  avatarUrl: string | null;
}

export interface PublicDirectoryRecruitment {
  scheduleFrequency: string | null;
  scheduleDay: string | null;
  scheduleTime: string | null;
  scheduleTimezone: string | null;
  currentSession: number;
  sessionDuration: string | null;
  estimatedLength: string | null;
  maxSeats: number;
  maxPlayers: number;
  filledSeats: number;
  seatFillRatio: number | null;
  isFull: boolean;
  acceptedMemberCount: number;
  acceptedJoinRequestCount: number;
  followerCount: number;
  genreThemes: string[];
  genreThemeLabels?: string[];
  externalTools: string[];
  safetyTools: string | null;
  contentWarnings: string | null;
  equipmentNeeded: string | null;
  includeRules: boolean;
  includeFAQ: boolean;
  includeSessionZero: boolean;
  includeHomebrew: boolean;
  includeSafetyGuidelines: boolean;
  includeCharacterCreation: boolean;
  includeTableExpectations: boolean;
  tablePlayers?: PublicTablePlayer[];
}

export interface PublicDirectoryHost {
  id: string;
  displayName: string | null;
  avatarUrl: string | null;
  username: string;
  label: string;
  publicBio: string | null;
  pronouns?: string | null;
}

export interface PublicDirectoryCampaign {
  id: string;
  name: string;
  handle: string;
  description?: string | null;
  recruitmentTagline?: string | null;
  recruitmentPremise?: string | null;
  recruitmentBeforeApplyNote?: string | null;
  heroImageUrl?: string | null;
  updatedAt?: string;
  tableStyleTags?: string[];
  tableStyleLabels?: string[];
  gameSystem?: string | null;
  customGameSystemName?: string | null;
  gameSystemLabel?: string | null;
  type?: string | null;
  levelRange?: string | null;
  language?: string | null;
  experienceRequired?: string | null;
  ageRestriction?: string | null;
  campaignFormat?: string | null;
  recruitmentSettings?: {
    type?: string | null;
    campaignFormat?: string | null;
    levelRange?: string | null;
    language?: string | null;
    experienceRequired?: string | null;
    ageRestriction?: string | null;
  } | null;
  createdAt: string;
  host: PublicDirectoryHost | null;
  recruitment: PublicDirectoryRecruitment;
}

export interface RecruitmentPagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface RecruitmentLobbyResponse {
  campaign: PublicDirectoryCampaign;
  documentation: {
    tableExpectations: string | null;
    rules: string | null;
    faq: string | null;
    sessionZero: string | null;
    homebrew: string | null;
    safetyGuidelines: string | null;
    characterCreation: string | null;
  };
}

export interface PublicUserHostedCampaign {
  id: string;
  name: string;
  handle: string;
  createdAt: string;
  isLookingForGroup: boolean;
}

export interface PublicUserProfile {
  id: string;
  displayName: string | null;
  avatarUrl: string | null;
  pronouns: string | null;
  username: string;
  label: string;
  publicBio: string | null;
  statusBlurb: string | null;
  bluesky: string | null;
  discord: string | null;
  github: string | null;
  reddit: string | null;
  mastodon: string | null;
  otherLink: string | null;
  gmStyleTags: string[];
  hostedCampaigns: PublicUserHostedCampaign[];
}
