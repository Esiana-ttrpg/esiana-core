import { campaignAdminCapabilitiesFor } from './campaignAdminGrants.js';
import { CampaignCapabilities, type CampaignCapability } from './capabilities.js';
import {
  allowsAnonymousCampaignView,
  normalizeDiscoverability,
  resolveDiscoverability,
  type CampaignDiscoverabilityValue,
} from './discoverability.js';
import {
  isMembershipRole,
  MembershipRoles,
  type MembershipRole,
} from './membershipRoles.js';
import { publicAnonymousCapabilities } from './publicProfile.js';
import {
  applyCampaignRoleOverrides,
  type CampaignRoleCapabilityOverrideRow,
} from './capabilityOverrides.js';
import {
  roleCapabilitiesFor,
  type MemberCapabilityFlags,
} from './roleGrants.js';

export {
  canEditPage,
  resolvePageEditBlock,
  PageOwnerTypes,
  type PageEditBlock,
  type PageEditPayload,
  type PageOwnerType,
  type PageOwnershipFields,
} from './pageOwnership.js';

export type CampaignPolicyContext = {
  campaignOwnerUserId: string;
  discoverability: CampaignDiscoverabilityValue;
  allowPlayerChronologyManagement: boolean;
  roleCapabilityOverrides?: readonly CampaignRoleCapabilityOverrideRow[];
};

export type CampaignActor =
  | {
      kind: 'anonymous';
      campaign: CampaignPolicyContext;
    }
  | {
      kind: 'member';
      userId: string;
      membershipRole: MembershipRole;
      isCampaignOwner: boolean;
      campaign: CampaignPolicyContext;
      memberFlags?: { chronologyContributor?: boolean };
      /** Default campaign party for PARTY-owned page edits (B0). */
      partyId?: string | null;
    };

function resolveMembershipRole(role: string | null | undefined): MembershipRole {
  if (role && isMembershipRole(role)) return role;
  return MembershipRoles.OBSERVER;
}

export function buildCampaignActor(input: {
  kind: 'anonymous' | 'member';
  userId?: string | null;
  membershipRole?: string | null;
  campaignOwnerUserId: string;
  discoverability: CampaignDiscoverabilityValue | string;
  allowPlayerChronologyManagement: boolean;
  chronologyContributor?: boolean;
  partyId?: string | null;
  roleCapabilityOverrides?: readonly CampaignRoleCapabilityOverrideRow[];
}): CampaignActor {
  const campaign: CampaignPolicyContext = {
    campaignOwnerUserId: input.campaignOwnerUserId,
    discoverability: normalizeDiscoverability(input.discoverability),
    allowPlayerChronologyManagement: input.allowPlayerChronologyManagement,
    roleCapabilityOverrides: input.roleCapabilityOverrides,
  };

  if (input.kind === 'anonymous' || !input.userId) {
    return { kind: 'anonymous', campaign };
  }

  return {
    kind: 'member',
    userId: input.userId,
    membershipRole: resolveMembershipRole(input.membershipRole),
    isCampaignOwner: input.userId === input.campaignOwnerUserId,
    campaign,
    memberFlags: { chronologyContributor: input.chronologyContributor },
    partyId: input.partyId ?? null,
  };
}

export function resolveActorCapabilities(
  actor: CampaignActor,
): ReadonlySet<CampaignCapability> {
  if (actor.kind === 'anonymous') {
    const discoverability = resolveDiscoverability(actor.campaign.discoverability);
    if (!allowsAnonymousCampaignView(discoverability)) {
      return new Set();
    }
    return publicAnonymousCapabilities();
  }

  const flags: MemberCapabilityFlags = {
    chronologyContributor: actor.memberFlags?.chronologyContributor,
    allowPlayerChronologyManagement:
      actor.campaign.allowPlayerChronologyManagement,
  };

  const roleCaps = roleCapabilitiesFor(actor.membershipRole, flags);
  const withOverrides = applyCampaignRoleOverrides(
    roleCaps,
    actor.campaign.roleCapabilityOverrides ?? [],
    actor.membershipRole,
  );
  const adminCaps = campaignAdminCapabilitiesFor(actor.isCampaignOwner);
  return new Set([...withOverrides, ...adminCaps]);
}

export function can(
  actor: CampaignActor,
  capability: CampaignCapability,
  _resource?: unknown,
): boolean {
  return resolveActorCapabilities(actor).has(capability);
}

export function actorDiscoverability(
  actor: CampaignActor,
): CampaignDiscoverabilityValue {
  return resolveDiscoverability(actor.campaign.discoverability);
}

export function canAccessCampaignContainer(actor: CampaignActor): boolean {
  if (actor.kind === 'member') return true;
  return can(actor, CampaignCapabilities.CAMPAIGN_VIEW);
}

export function hasElevatedNarrativeView(actor: CampaignActor): boolean {
  return can(actor, CampaignCapabilities.NARRATIVE_ELEVATED_VIEW);
}

export function canManageWikiAsStaff(actor: CampaignActor): boolean {
  return can(actor, CampaignCapabilities.PAGE_EDIT_ANY);
}

export function canManageChronology(actor: CampaignActor): boolean {
  return can(actor, CampaignCapabilities.CHRONOLOGY_EDIT);
}

export function canModifyCampaignSettings(actor: CampaignActor): boolean {
  return can(actor, CampaignCapabilities.CAMPAIGN_SETTINGS_EDIT);
}

export function canManageCampaignRoles(actor: CampaignActor): boolean {
  return can(actor, CampaignCapabilities.CAMPAIGN_MANAGE_ROLES);
}

export function isCampaignOwnerActor(actor: CampaignActor): boolean {
  return actor.kind === 'member' && actor.isCampaignOwner;
}
