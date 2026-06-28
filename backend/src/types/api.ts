import type { CampaignMemberRole } from './domain.js';
import type { CampaignCapability } from '../../../shared/campaignPolicy/capabilities.js';
import type { CampaignDiscoverabilityValue } from '../../../shared/campaignPolicy/discoverability.js';
import type { CampaignActor } from '../../../shared/campaignPolicy/policy.js';

export interface CampaignContext {
  campaignId: string;
  campaignHandle?: string;
  campaignOwnerUserId: string;
  discoverability: CampaignDiscoverabilityValue;
  allowPlayerChronologyManagement: boolean;
  /** Null when accessing a public campaign without membership. */
  role: CampaignMemberRole | null;
  chronologyContributor: boolean;
  partyId: string | null;
  isMember: boolean;
  isCampaignOwner: boolean;
  actor: CampaignActor;
  capabilities: ReadonlySet<CampaignCapability>;
  roleCapabilityOverrides: readonly {
    role: string;
    capability: string;
    effect: string;
  }[];
}

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
  metadata?: Record<string, unknown> | null;
  children: WikiTreeNode[];
  createdAt: string;
  updatedAt: string;
}

export interface CreateCampaignBody {
  name?: string;
  description?: string;
  discoverability?: CampaignDiscoverabilityValue;
  language?: string | null;
  gameSystem?: string | null;
  customGameSystemName?: string | null;
}

export interface UpdateCampaignBody {
  archived?: boolean;
  name?: string;
  description?: string;
  discoverability?: CampaignDiscoverabilityValue;
  language?: string | null;
  gameSystem?: string | null;
  customGameSystemName?: string | null;
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
  /** @deprecated Ignored on write — derived from campaignIntegrations at read time */
  externalTools?: string[];
  campaignIntegrations?: import('../../../shared/campaignIntegrations.js').CampaignIntegrations | null;
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
  allowPlayerChronologyManagement?: boolean;
  themePreset?: string;
  appearanceProfile?: Record<string, unknown> | null;
  recruitmentTagline?: string | null;
  recruitmentPremise?: string | null;
  recruitmentBeforeApplyNote?: string | null;
  scheduleTimezone?: string | null;
  campaignFormat?: string | null;
  experienceRequired?: string | null;
  ageRestriction?: string | null;
  levelRange?: string | null;
  tableStyleTags?: string[];
  /** @deprecated Prefer flat fields; still accepted for older clients */
  recruitmentSettings?: {
    type?: string | null;
    levelRange?: string | null;
    language?: string | null;
    experienceRequired?: string | null;
    ageRestriction?: string | null;
  } | null;
}
