import type { CampaignContext } from '../types/api.js';
import {
  canCreateChronologyEra,
  canCreateChronologyEvent,
  canDeleteChronologyEvent,
  canEditChronologyEvent,
  canManageChronology,
  hasElevatedNarrativeView,
} from '../../../shared/campaignPolicy/policy.js';
import { canViewVisibilityFromCaps } from '../../../shared/campaignPolicy/resourceAccess.js';

export function chronologyCanManage(ctx: CampaignContext): boolean {
  return ctx.role !== 'OBSERVER' && canManageChronology(ctx.actor);
}

export function chronologyCanCreateEvent(ctx: CampaignContext): boolean {
  return ctx.isMember && canCreateChronologyEvent(ctx.actor);
}

export function chronologyCanCreateEra(ctx: CampaignContext): boolean {
  return ctx.isMember && canCreateChronologyEra(ctx.actor);
}

export function chronologyCanEditEvent(
  ctx: CampaignContext,
  createdByUserId?: string | null,
): boolean {
  return (
    ctx.role !== 'OBSERVER' &&
    canEditChronologyEvent(ctx.actor, createdByUserId)
  );
}

export function chronologyCanDeleteEvent(
  ctx: CampaignContext,
  createdByUserId?: string | null,
): boolean {
  return (
    ctx.role !== 'OBSERVER' &&
    canDeleteChronologyEvent(ctx.actor, createdByUserId)
  );
}

export function chronologyElevated(ctx: CampaignContext): boolean {
  return hasElevatedNarrativeView(ctx.actor);
}

export function chronologyCanView(ctx: CampaignContext, visibility: string): boolean {
  return canViewVisibilityFromCaps(ctx.capabilities, visibility);
}
