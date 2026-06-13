import { CampaignCapabilities } from '@shared/campaignPolicy/capabilities';
import {
  buildCampaignActor,
  can as policyCan,
  hasElevatedNarrativeView,
  type CampaignActor,
} from '@shared/campaignPolicy/policy';
import type { PageEditBlock } from '@shared/campaignPolicy/pageOwnership';
import {
  normalizeDiscoverability,
  type CampaignDiscoverabilityValue,
} from '@shared/campaignPolicy/discoverability';

export type CampaignAffordanceInput = {
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
};

export function buildCampaignAffordanceActor(
  input: CampaignAffordanceInput | null | undefined,
): CampaignActor | null {
  if (!input?.campaignOwnerUserId) return null;
  return buildCampaignActor({
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
}

/** Elevated narrative view (ghost mode, staff-only surfaces). Replaces `isDMUser` for read affordances. */
export function hasElevatedNarrativeAffordance(
  input: CampaignAffordanceInput | null | undefined,
): boolean {
  const actor = buildCampaignAffordanceActor(input);
  return actor ? hasElevatedNarrativeView(actor) : false;
}

export function canCreatePages(
  input: CampaignAffordanceInput | null | undefined,
): boolean {
  const actor = buildCampaignAffordanceActor(input);
  return actor ? policyCan(actor, CampaignCapabilities.PAGE_CREATE) : false;
}

export function editBlockNarrativeCopy(editBlock?: PageEditBlock): string | null {
  if (!editBlock) return null;
  if (editBlock.kind === 'ownership') {
    switch (editBlock.ownership) {
      case 'staff':
        return 'This page is maintained by Staff.';
      case 'user':
        return 'This page is maintained by its author.';
      case 'party':
        return 'This page is maintained by your party.';
      default:
        return 'You cannot edit this page.';
    }
  }
  if (editBlock.kind === 'archived') {
    return 'This page is archived.';
  }
  if (editBlock.kind === 'locked') {
    return 'This page is locked.';
  }
  return 'You cannot edit this page.';
}

export type { VisibilityTierLabel } from '@shared/visibilityTier';
export { resolveVisibilityTierLabel } from '@shared/visibilityTier';
