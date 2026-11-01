import type { CampaignContext } from '../types/api.js';
import { canManageChronology, hasElevatedNarrativeView } from '../../../shared/campaignPolicy/policy.js';
import { canViewVisibilityFromCaps } from '../../../shared/campaignPolicy/resourceAccess.js';

export function chronologyCanManage(ctx: CampaignContext): boolean {
  return ctx.role !== 'OBSERVER' && canManageChronology(ctx.actor);
}
export function chronologyElevated(ctx: CampaignContext): boolean {
  return hasElevatedNarrativeView(ctx.actor);
}
export function chronologyCanView(ctx: CampaignContext, visibility: string): boolean {
  return canViewVisibilityFromCaps(ctx.capabilities, visibility);
}
