import type {
  UserCampaignDefaultsPrefs,
  UserTemplateResourceKind,
} from '@shared/userCampaignDefaults';

export interface UserTemplateResourceSummary {
  kind: UserTemplateResourceKind;
  label: string;
  routeSlug: string;
  markdown: string;
  updatedAt: string | null;
  hasContent: boolean;
}

export interface UserCampaignDefaultsBundle {
  prefs: UserCampaignDefaultsPrefs;
  gmStyleTags: string[];
  defaultPitch: string | null;
  updatedAt: string | null;
  templateResources: UserTemplateResourceSummary[];
}

export interface UserTemplateResourceDetail {
  kind: UserTemplateResourceKind;
  label: string;
  editorTitle: string;
  routeSlug: string;
  markdown: string;
  updatedAt: string | null;
  starterMarkdown: string;
}

export interface PatchUserCampaignDefaultsInput {
  prefs?: UserCampaignDefaultsPrefs;
  gmStyleTags?: string[];
  defaultPitch?: string;
}

export type { UserCampaignDefaultsPrefs, UserTemplateResourceKind };
