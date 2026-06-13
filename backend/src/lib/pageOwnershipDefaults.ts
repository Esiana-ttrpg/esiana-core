import { MembershipRoles } from '../../../shared/campaignPolicy/membershipRoles.js';
import { PageOwnerTypes, type PageOwnerType } from '../../../shared/campaignPolicy/pageOwnership.js';
import type { CampaignMemberRole } from '../types/domain.js';

export type ResolvedPageOwnership = {
  ownerType: PageOwnerType;
  ownerUserId: string | null;
  ownerPartyId: string | null;
  createdByUserId: string;
};

export function resolveDefaultPageOwnership(input: {
  creatorUserId: string;
  creatorRole: CampaignMemberRole | null;
  defaultPartyId: string | null;
  requestedOwnerType?: string | null;
  workspace?: string | null;
  templateType?: string | null;
}): ResolvedPageOwnership {
  const createdByUserId = input.creatorUserId;
  const isStaff =
    input.creatorRole === MembershipRoles.GAMEMASTER ||
    input.creatorRole === MembershipRoles.WRITER;

  if (
    input.requestedOwnerType === PageOwnerTypes.USER ||
    input.requestedOwnerType === PageOwnerTypes.PARTY ||
    input.requestedOwnerType === PageOwnerTypes.STAFF
  ) {
    const ownerType = input.requestedOwnerType;
    return {
      ownerType,
      ownerUserId: ownerType === PageOwnerTypes.USER ? createdByUserId : null,
      ownerPartyId:
        ownerType === PageOwnerTypes.PARTY ? input.defaultPartyId : null,
      createdByUserId,
    };
  }

  if (input.templateType === 'JOURNAL' || input.templateType === 'SESSION_NOTE') {
    return {
      ownerType: PageOwnerTypes.USER,
      ownerUserId: createdByUserId,
      ownerPartyId: null,
      createdByUserId,
    };
  }

  if (isStaff) {
    return {
      ownerType: PageOwnerTypes.STAFF,
      ownerUserId: null,
      ownerPartyId: null,
      createdByUserId,
    };
  }

  return {
    ownerType: PageOwnerTypes.USER,
    ownerUserId: createdByUserId,
    ownerPartyId: null,
    createdByUserId,
  };
}
