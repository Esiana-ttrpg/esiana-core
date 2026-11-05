import { CampaignCapabilities } from './capabilities.js';
import { can, type CampaignActor } from './policy.js';
import { canEditPage, PageOwnerTypes, type PageOwnershipFields } from './pageOwnership.js';
import { canViewVisibility } from './resourceAccess.js';

export type DowntimeResourceAccess = PageOwnershipFields & {
  visibility: string;
  deletedAt?: Date | null;
};

export function canCreateDowntimeResource(actor: CampaignActor): boolean {
  return actor.kind === 'member' && canViewVisibility(actor, 'PARTY') &&
    (can(actor, CampaignCapabilities.DOWNTIME_CREATE) || canManageDowntime(actor));
}

export function canManageDowntime(actor: CampaignActor): boolean {
  return actor.kind === 'member' && can(actor, CampaignCapabilities.DOWNTIME_MANAGE);
}

export function canViewDowntimeResource(actor: CampaignActor, resource: DowntimeResourceAccess): boolean {
  return resource.deletedAt == null && canViewVisibility(actor, resource.visibility);
}

/** Spaces, upgrades and progress inherit the linked canonical page's access. */
export function canEditDowntimeResource(actor: CampaignActor, resource: DowntimeResourceAccess): boolean {
  return actor.kind === 'member' && canViewDowntimeResource(actor, resource) &&
    (canManageDowntime(actor) || canEditPage(actor, resource));
}

/** Shared editing never implies deletion. Manage supplies Delete for any resource. */
export function canDeleteDowntimeResource(actor: CampaignActor, resource: DowntimeResourceAccess): boolean {
  return actor.kind === 'member' && canViewDowntimeResource(actor, resource) &&
    (canManageDowntime(actor) ||
      (resource.ownerType === PageOwnerTypes.USER && resource.ownerUserId === actor.userId &&
        can(actor, CampaignCapabilities.DOWNTIME_DELETE_OWNED)));
}

export const canEditDowntimePerson = canEditDowntimeResource;

export function canChangeDowntimeVisibility(actor: CampaignActor, current: string, next: unknown): boolean {
  if (next === undefined || next === current) return true;
  return typeof next === 'string' && actor.kind === 'member' &&
    can(actor, CampaignCapabilities.PAGE_VISIBILITY_EDIT) &&
    canViewVisibility(actor, current) && canViewVisibility(actor, next);
}
