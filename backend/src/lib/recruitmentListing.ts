import { sanitizeGmStyleTags } from './gmStyleTags.js';

import { coerceAssetReferenceUrl } from '../../../shared/assetReferenceValidation.js';

export function extractHeroImageUrl(dashboardConfig: unknown): string | null {
  if (!dashboardConfig || typeof dashboardConfig !== 'object') return null;
  const hero = (dashboardConfig as { hero?: { coverImageUrl?: unknown } }).hero;
  if (!hero || typeof hero !== 'object') return null;
  return coerceAssetReferenceUrl((hero as { coverImageUrl?: unknown }).coverImageUrl);
}

export function parseTableStyleTags(value: unknown): string[] {
  return sanitizeGmStyleTags(value);
}

export function buildRecruitmentSettingsPayload(campaign: {
  campaignFormat?: string | null;
  experienceRequired?: string | null;
  ageRestriction?: string | null;
  levelRange?: string | null;
  language?: string | null;
}) {
  return {
    type: campaign.campaignFormat ?? null,
    campaignFormat: campaign.campaignFormat ?? null,
    experienceRequired: campaign.experienceRequired ?? null,
    ageRestriction: campaign.ageRestriction ?? null,
    levelRange: campaign.levelRange ?? null,
    language: campaign.language ?? null,
  };
}
