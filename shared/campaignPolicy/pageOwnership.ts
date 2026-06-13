import { CampaignCapabilities } from './capabilities.js';
import { can, type CampaignActor } from './policy.js';

export const PageOwnerTypes = {
  STAFF: 'STAFF',
  USER: 'USER',
  PARTY: 'PARTY',
} as const;

export type PageOwnerType =
  (typeof PageOwnerTypes)[keyof typeof PageOwnerTypes];

export type PageOwnershipFields = {
  ownerType: PageOwnerType;
  ownerUserId?: string | null;
  ownerPartyId?: string | null;
};

export type PageEditBlock = {
  kind: 'ownership' | 'locked' | 'archived' | 'snapshot' | 'capability';
  ownership?: 'staff' | 'party' | 'user';
};

export type PageEditPayload = {
  canEdit: boolean;
  editBlock?: PageEditBlock;
};

export function memberPartyId(actor: CampaignActor): string | null {
  if (actor.kind !== 'member') return null;
  return actor.partyId ?? null;
}

export function canEditPage(
  actor: CampaignActor,
  page: PageOwnershipFields,
): boolean {
  if (can(actor, CampaignCapabilities.PAGE_EDIT_ANY)) return true;
  switch (page.ownerType) {
    case PageOwnerTypes.STAFF:
      return false;
    case PageOwnerTypes.USER:
      return (
        can(actor, CampaignCapabilities.PAGE_EDIT_OWNED) &&
        actor.kind === 'member' &&
        page.ownerUserId === actor.userId
      );
    case PageOwnerTypes.PARTY:
      return (
        can(actor, CampaignCapabilities.PAGE_EDIT_PARTY) &&
        actor.kind === 'member' &&
        page.ownerPartyId != null &&
        page.ownerPartyId === actor.partyId
      );
    default:
      return false;
  }
}

export function resolvePageEditBlock(
  actor: CampaignActor,
  page: PageOwnershipFields,
): PageEditPayload {
  if (canEditPage(actor, page)) {
    return { canEdit: true };
  }
  if (can(actor, CampaignCapabilities.PAGE_EDIT_ANY)) {
    return { canEdit: true };
  }
  switch (page.ownerType) {
    case PageOwnerTypes.STAFF:
      return {
        canEdit: false,
        editBlock: { kind: 'ownership', ownership: 'staff' },
      };
    case PageOwnerTypes.USER:
      return {
        canEdit: false,
        editBlock: { kind: 'ownership', ownership: 'user' },
      };
    case PageOwnerTypes.PARTY:
      return {
        canEdit: false,
        editBlock: { kind: 'ownership', ownership: 'party' },
      };
    default:
      return {
        canEdit: false,
        editBlock: { kind: 'capability' },
      };
  }
}
