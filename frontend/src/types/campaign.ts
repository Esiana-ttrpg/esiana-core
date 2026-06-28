import type { CampaignDiscoverabilityValue } from '@shared/campaignPolicy/discoverability';
import type { CampaignIntegrations } from '@shared/campaignIntegrations';
import type { CampaignMemberRole, UserRole } from './domain';
import type { SidebarConfig } from '@/lib/sidebarConfig';
import type { ThemeProfile } from '@/lib/theme';
import type { DashboardConfig } from '@/lib/dashboardConfig';

export type { CampaignDiscoverabilityValue };

export interface User {
  id: string;
  email: string;
  displayName?: string | null;
  avatarUrl?: string | null;
  username?: string;
  role: UserRole;
  passwordAuthEnabled?: boolean;
}

export interface CampaignSummary {
  id: string;
  handle: string;
  name: string;
  description: string | null;
  language?: string | null;
  discoverability: CampaignDiscoverabilityValue;
  createdAt: string;
  updatedAt: string;
  role: CampaignMemberRole | null;
  isMember: boolean;
  isCampaignOwner?: boolean;
  campaignOwnerUserId?: string;
  host?: {
    id: string;
    label: string;
    avatarUrl: string | null;
  } | null;
  gameSystemLabel?: string | null;
  scheduleFrequency?: string | null;
  scheduleDay?: string | null;
  scheduleTime?: string | null;
  currentSession?: number;
  recruitmentTagline?: string | null;
  appearanceProfile?: ThemeProfile | null;
  dashboardConfig?: DashboardConfig | null;
  heroImageUrl?: string | null;
  isLookingForGroup?: boolean;
  /** Hub prioritization fields (Phase 2+) */
  hubSignals?: import('./hub').HubCampaignSignals;
}

export interface CampaignDetail extends CampaignSummary {
  isLookingForGroup?: boolean;
  scheduleFrequency?: string | null;
  scheduleDay?: string | null;
  scheduleTime?: string | null;
  currentSession?: number;
  sessionDuration?: string | null;
  estimatedLength?: string | null;
  maxSeats?: number;
  maxPlayers?: number;
  genreThemes?: string[];
  genreThemeLabels?: string[];
  externalTools?: string[];
  campaignIntegrations?: CampaignIntegrations | null;
  safetyTools?: string | null;
  contentWarnings?: string | null;
  equipmentNeeded?: string | null;
  includeRules?: boolean;
  includeFAQ?: boolean;
  includeSessionZero?: boolean;
  includeHomebrew?: boolean;
  includeSafetyGuidelines?: boolean;
  includeCharacterCreation?: boolean;
  includeTableExpectations?: boolean;
  recruitmentTagline?: string | null;
  recruitmentPremise?: string | null;
  recruitmentBeforeApplyNote?: string | null;
  scheduleTimezone?: string | null;
  campaignFormat?: string | null;
  experienceRequired?: string | null;
  ageRestriction?: string | null;
  levelRange?: string | null;
  tableStyleTags?: string[];
  recruitmentSettings?: {
    type?: string | null;
    campaignFormat?: string | null;
    levelRange?: string | null;
    language?: string | null;
    experienceRequired?: string | null;
    ageRestriction?: string | null;
  } | null;
  sidebarConfig?: SidebarConfig;
  themePreset?: string;
  appearanceProfile?: ThemeProfile | null;
  allowPlayerChronologyManagement?: boolean;
  chronologyContributor?: boolean;
  partyId?: string | null;
}

export interface CreateCampaignInput {
  name: string;
  description?: string;
  discoverability?: CampaignDiscoverabilityValue;
}
