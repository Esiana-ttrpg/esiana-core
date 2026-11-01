import { CampaignCapabilities, type CampaignCapability } from './capabilities.js';
import {
  applyCampaignRoleOverrides,
  type CampaignRoleCapabilityOverrideRow,
} from './capabilityOverrides.js';
import { MembershipRoles } from './membershipRoles.js';
import { roleCapabilitiesFor } from './roleGrants.js';

/** Read capabilities anonymous actors may inherit from Observer. */
export const ANONYMOUS_READ_CAPABILITIES: ReadonlySet<CampaignCapability> =
  new Set([
    CampaignCapabilities.CAMPAIGN_VIEW,
    CampaignCapabilities.WIKI_VIEW_PARTY,
    CampaignCapabilities.ASSETS_VIEW,
  ]);

/** @deprecated Use publicAnonymousCapabilities() — Observer reads, not a separate profile. */
export const PUBLIC_ANONYMOUS_CAPABILITIES: readonly CampaignCapability[] = [
  CampaignCapabilities.CAMPAIGN_VIEW,
  CampaignCapabilities.WIKI_VIEW_PARTY,
  CampaignCapabilities.ASSETS_VIEW,
];

export function publicAnonymousCapabilities(
  overrides: readonly CampaignRoleCapabilityOverrideRow[] = [],
): ReadonlySet<CampaignCapability> {
  const observer = applyCampaignRoleOverrides(
    roleCapabilitiesFor(MembershipRoles.OBSERVER),
    overrides,
    MembershipRoles.OBSERVER,
  );
  return new Set(
    [...observer].filter((cap) => ANONYMOUS_READ_CAPABILITIES.has(cap)),
  );
}
