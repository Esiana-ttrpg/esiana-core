import { CampaignCapabilities, type CampaignCapability } from './capabilities.js';

/** Grants for campaign owner, and for Game Masters except transfer. */
export const CAMPAIGN_ADMIN_CAPABILITIES: readonly CampaignCapability[] = [
  CampaignCapabilities.SAFETY_MANAGE,
  CampaignCapabilities.CAMPAIGN_DELETE,
  CampaignCapabilities.CAMPAIGN_TRANSFER_OWNERSHIP,
  CampaignCapabilities.CAMPAIGN_MANAGE_ROLES,
  CampaignCapabilities.CAMPAIGN_VISIBILITY_EDIT,
  CampaignCapabilities.BILLING_MANAGE,
  CampaignCapabilities.CAMPAIGN_VIEW,
];

export const OWNER_ONLY_CAPABILITIES: ReadonlySet<CampaignCapability> = new Set([
  CampaignCapabilities.CAMPAIGN_TRANSFER_OWNERSHIP,
]);

export function campaignAdminCapabilitiesFor(
  isCampaignOwner: boolean,
  isGamemaster = false,
): ReadonlySet<CampaignCapability> {
  if (!isCampaignOwner && !isGamemaster) return new Set();
  const caps = new Set<CampaignCapability>(CAMPAIGN_ADMIN_CAPABILITIES);
  if (!isCampaignOwner) {
    for (const cap of OWNER_ONLY_CAPABILITIES) caps.delete(cap);
  }
  return caps;
}
