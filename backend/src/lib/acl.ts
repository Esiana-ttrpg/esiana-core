import type { CampaignCapability } from '../../../shared/campaignPolicy/capabilities.js';
import type { CampaignRoleCapabilityOverrideRow } from '../../../shared/campaignPolicy/capabilityOverrides.js';
import type { CampaignDiscoverabilityValue } from '../../../shared/campaignPolicy/discoverability.js';
import {
  buildCampaignActor,
  can,
  canAccessCampaignContainer,
  canManageChronology as policyCanManageChronology,
  canManageWikiAsStaff,
  canModifyCampaignSettings,
  canManageCampaignRoles,
  hasElevatedNarrativeView,
  type CampaignActor,
} from '../../../shared/campaignPolicy/policy.js';
import {
  isMembershipRole,
  isElevatedMembershipRole,
  type MembershipRole,
} from '../../../shared/campaignPolicy/membershipRoles.js';
import {
  CampaignMemberRoles,
  type CampaignMemberRole,
} from '../types/domain.js';

export { isMembershipRole as isCampaignMemberRole };

export function normalizeCampaignMemberRole(
  value: string | null | undefined,
): CampaignMemberRole | null {
  if (!value) return null;
  if (isMembershipRole(value)) return value;
  return null;
}

export type CampaignAclContext = {
  userId: string | null;
  membershipRole: CampaignMemberRole | null;
  campaignOwnerUserId: string;
  discoverability: CampaignDiscoverabilityValue | string;
  allowPlayerChronologyManagement: boolean;
  chronologyContributor?: boolean;
  partyId?: string | null;
  roleCapabilityOverrides?: readonly CampaignRoleCapabilityOverrideRow[];
};

export function buildActorFromAclContext(ctx: CampaignAclContext): CampaignActor {
  if (!ctx.userId || !ctx.membershipRole) {
    return buildCampaignActor({
      kind: 'anonymous',
      campaignOwnerUserId: ctx.campaignOwnerUserId,
      discoverability: ctx.discoverability,
      allowPlayerChronologyManagement: ctx.allowPlayerChronologyManagement,
    });
  }
  return buildCampaignActor({
    kind: 'member',
    userId: ctx.userId,
    membershipRole: ctx.membershipRole,
    campaignOwnerUserId: ctx.campaignOwnerUserId,
    discoverability: ctx.discoverability,
    allowPlayerChronologyManagement: ctx.allowPlayerChronologyManagement,
    chronologyContributor: ctx.chronologyContributor,
    partyId: ctx.partyId,
    roleCapabilityOverrides: ctx.roleCapabilityOverrides,
  });
}

export function canActor(
  actor: CampaignActor,
  capability: CampaignCapability,
): boolean {
  return can(actor, capability);
}

/** Replaces inline `canManageNotebooks(role)` — staff page authority. */
export function canManageNotebooksFromActor(actor: CampaignActor): boolean {
  return canManageWikiAsStaff(actor);
}

export function canManageNotebooksFromContext(ctx: CampaignAclContext): boolean {
  return canManageNotebooksFromActor(buildActorFromAclContext(ctx));
}

export { hasElevatedNarrativeView };

export function canModifyCampaign(actor: CampaignActor): boolean {
  return canModifyCampaignSettings(actor);
}

/** Gamemaster narrative/table settings (legacy call sites passing role only). */
export function canModifyCampaignAsGamemaster(
  role: CampaignMemberRole | null,
): boolean {
  return role === CampaignMemberRoles.GAMEMASTER;
}

export function canManageChronology(
  role: CampaignMemberRole | null,
  allowPlayerChronologyManagement: boolean,
  chronologyContributor = false,
  acl?: CampaignAclContext,
): boolean {
  if (acl?.userId && role) {
    return policyCanManageChronology(
      buildActorFromAclContext({
        ...acl,
        membershipRole: role,
        allowPlayerChronologyManagement,
        chronologyContributor,
      }),
    );
  }
  if (role === CampaignMemberRoles.GAMEMASTER || role === CampaignMemberRoles.WRITER) {
    return true;
  }
  if (
    role === CampaignMemberRoles.PARTICIPANT &&
    allowPlayerChronologyManagement
  ) {
    return true;
  }
  return false;
}

export function hasCampaignMembership(
  role: CampaignMemberRole | null,
): boolean {
  return role !== null;
}

export function canAccessCampaign(
  role: CampaignMemberRole | null,
  discoverability: CampaignDiscoverabilityValue | string,
  campaignOwnerUserId: string,
  userId?: string | null,
): boolean {
  const actor = buildCampaignActor({
    kind: role && userId ? 'member' : 'anonymous',
    userId: userId ?? undefined,
    membershipRole: role,
    campaignOwnerUserId,
    discoverability,
    allowPlayerChronologyManagement: false,
  });
  return canAccessCampaignContainer(actor);
}

export function isCampaignOwner(
  userId: string | null | undefined,
  campaignOwnerUserId: string,
): boolean {
  return Boolean(userId && userId === campaignOwnerUserId);
}

export function canManageCampaignMembership(actor: CampaignActor): boolean {
  return canManageCampaignRoles(actor);
}

export { isElevatedMembershipRole as isElevatedCampaignRole };
