import { CampaignCapabilities, type CampaignCapability } from './capabilities.js';

/** Grants when actor.userId === campaign.campaignOwnerUserId */
export const CAMPAIGN_ADMIN_CAPABILITIES: readonly CampaignCapability[] = [
  CampaignCapabilities.CAMPAIGN_DELETE,
  CampaignCapabilities.CAMPAIGN_TRANSFER_OWNERSHIP,
  CampaignCapabilities.CAMPAIGN_MANAGE_ROLES,
  CampaignCapabilities.CAMPAIGN_VISIBILITY_EDIT,
  CampaignCapabilities.BILLING_MANAGE,
  CampaignCapabilities.CAMPAIGN_VIEW,
];

export function campaignAdminCapabilitiesFor(
  isCampaignOwner: boolean,
): ReadonlySet<CampaignCapability> {
  if (!isCampaignOwner) return new Set();
  return new Set(CAMPAIGN_ADMIN_CAPABILITIES);
}
