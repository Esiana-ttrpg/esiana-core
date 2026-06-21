import type { CampaignMemberRole } from '@/types/domain';
import type { ThemeProfile } from '@/lib/theme';

export interface UserSocialLinks {
  bluesky: string | null;
  discord: string | null;
  github: string | null;
  reddit: string | null;
  mastodon: string | null;
  otherLink: string | null;
}

export interface UserProfileCampaign {
  id: string;
  name: string;
  handle: string;
  role: CampaignMemberRole;
  joinedAt: string;
  isArchived?: boolean;
}

export interface UserProfile extends UserSocialLinks {
  id: string;
  email: string;
  displayName: string | null;
  avatarUrl: string | null;
  pronouns: string | null;
  publicBio: string | null;
  defaultPitch: string | null;
  statusBlurb: string | null;
  username: string;
  createdAt: string;
  campaigns: UserProfileCampaign[];
  appearanceProfile?: ThemeProfile | null;
  allowCampaignSystemOverride?: boolean;
  timezone?: string | null;
  effectiveTimezone?: string;
  uiLocale?: string | null;
}

export interface UserProfileUpdateInput extends Partial<UserSocialLinks> {
  displayName?: string;
  avatarUrl?: string | null;
  pronouns?: string;
  email?: string;
  publicBio?: string;
  defaultPitch?: string;
  statusBlurb?: string;
  appearanceProfile?: ThemeProfile | null;
  allowCampaignSystemOverride?: boolean;
  timezone?: string | null;
  uiLocale?: string | null;
}
