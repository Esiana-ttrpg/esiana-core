import { useMemo } from 'react';
import {
  buildCampaignActor,
  can as policyCan,
  hasElevatedNarrativeView,
  canManageWikiAsStaff,
  resolveActorCapabilities,
  type CampaignActor,
} from '../../../shared/campaignPolicy/policy';
import type { CampaignCapability } from '../../../shared/campaignPolicy/capabilities';
import {
  membershipRoleUiLabel,
  type MembershipRole,
} from '../../../shared/campaignPolicy/membershipRoles';
import {
  normalizeDiscoverability,
  type CampaignDiscoverabilityValue,
} from '../../../shared/campaignPolicy/discoverability';

export type CampaignPolicyInput = {
  userId?: string | null;
  role?: string | null;
  campaignOwnerUserId?: string;
  discoverability?: CampaignDiscoverabilityValue | string;
  allowPlayerChronologyManagement?: boolean;
  chronologyContributor?: boolean;
  partyId?: string | null;
  roleCapabilityOverrides?: readonly {
    role: string;
    capability: string;
    effect: string;
  }[];
  isCampaignOwner?: boolean;
};

export function useCampaignPolicy(input: CampaignPolicyInput | null | undefined) {
  return useMemo(() => {
    if (!input?.campaignOwnerUserId) {
      return {
        actor: null as CampaignActor | null,
        can: (_cap: CampaignCapability) => false,
        capabilities: new Set<CampaignCapability>(),
        isCampaignOwner: false,
        roleLabel: 'Guest',
      };
    }

    const actor = buildCampaignActor({
      kind: input.userId && input.role ? 'member' : 'anonymous',
      userId: input.userId,
      membershipRole: input.role,
      campaignOwnerUserId: input.campaignOwnerUserId,
      discoverability: normalizeDiscoverability(input.discoverability),
      allowPlayerChronologyManagement:
        input.allowPlayerChronologyManagement ?? false,
      chronologyContributor: input.chronologyContributor,
      partyId: input.partyId,
      roleCapabilityOverrides: input.roleCapabilityOverrides,
    });

    const isCampaignOwner =
      input.isCampaignOwner ??
      Boolean(input.userId && input.userId === input.campaignOwnerUserId);

    const roleLabel =
      input.role && actor.kind === 'member'
        ? membershipRoleUiLabel(actor.membershipRole as MembershipRole)
        : 'Guest';

    return {
      actor,
      can: (cap: CampaignCapability) => policyCan(actor, cap),
      capabilities: resolveActorCapabilities(actor),
      isCampaignOwner,
      roleLabel,
      hasElevatedView: hasElevatedNarrativeView(actor),
      canManageWiki: canManageWikiAsStaff(actor),
    };
  }, [input]);
}
