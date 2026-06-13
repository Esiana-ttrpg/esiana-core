import type { CampaignCapability } from './capabilities.js';
import { CampaignCapabilities } from './capabilities.js';
import type { MembershipRole } from './membershipRoles.js';
import {
  roleCapabilitiesFor,
  type MemberCapabilityFlags,
} from './roleGrants.js';

export const CapabilityOverrideEffect = {
  GRANT: 'GRANT',
  REVOKE: 'REVOKE',
} as const;

export type CapabilityOverrideEffectValue =
  (typeof CapabilityOverrideEffect)[keyof typeof CapabilityOverrideEffect];

export type CampaignRoleCapabilityOverrideRow = {
  role: string;
  capability: string;
  effect: string;
};

/** Administrative caps — never overridable per campaign. */
export const NON_OVERRIDABLE_CAPABILITIES: ReadonlySet<CampaignCapability> =
  new Set([
    CampaignCapabilities.CAMPAIGN_DELETE,
    CampaignCapabilities.CAMPAIGN_TRANSFER_OWNERSHIP,
    CampaignCapabilities.CAMPAIGN_MANAGE_ROLES,
    CampaignCapabilities.CAMPAIGN_VISIBILITY_EDIT,
    CampaignCapabilities.BILLING_MANAGE,
  ]);

export function applyCampaignRoleOverrides(
  base: ReadonlySet<CampaignCapability>,
  overrides: readonly CampaignRoleCapabilityOverrideRow[],
  role: string,
): ReadonlySet<CampaignCapability> {
  const caps = new Set(base);
  for (const row of overrides) {
    if (row.role !== role) continue;
    const cap = row.capability as CampaignCapability;
    if (NON_OVERRIDABLE_CAPABILITIES.has(cap)) continue;
    if (row.effect === CapabilityOverrideEffect.GRANT) {
      caps.add(cap);
    } else if (row.effect === CapabilityOverrideEffect.REVOKE) {
      caps.delete(cap);
    }
  }
  return caps;
}

function defaultRoleCapability(
  role: MembershipRole,
  capability: CampaignCapability,
  flags: MemberCapabilityFlags,
): boolean {
  return roleCapabilitiesFor(role, flags).has(capability);
}

export function resolveRoleCapability(
  role: MembershipRole,
  capability: CampaignCapability,
  overrides: readonly CampaignRoleCapabilityOverrideRow[],
  flags: MemberCapabilityFlags = {},
): boolean {
  const base = roleCapabilitiesFor(role, flags);
  const effective = applyCampaignRoleOverrides(base, overrides, role);
  return effective.has(capability);
}

export function normalizeCapabilityOverrides(
  overrides: readonly CampaignRoleCapabilityOverrideRow[],
  flags: MemberCapabilityFlags,
  roles: readonly MembershipRole[],
  capabilities: readonly CampaignCapability[],
): CampaignRoleCapabilityOverrideRow[] {
  const normalized: CampaignRoleCapabilityOverrideRow[] = [];

  for (const row of overrides) {
    const role = row.role as MembershipRole;
    const capability = row.capability as CampaignCapability;
    if (!roles.includes(role) || !capabilities.includes(capability)) continue;
    if (NON_OVERRIDABLE_CAPABILITIES.has(capability)) continue;

    const isDefault = defaultRoleCapability(role, capability, flags);
    const isGrant = row.effect === CapabilityOverrideEffect.GRANT;
    const isRevoke = row.effect === CapabilityOverrideEffect.REVOKE;

    if (isGrant && isDefault) continue;
    if (isRevoke && !isDefault) continue;
    if (!isGrant && !isRevoke) continue;

    normalized.push(row);
  }

  return normalized;
}
