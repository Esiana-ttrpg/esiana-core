import type { CampaignMemberRole } from '../types/domain.js';
import { canManageChronology } from './acl.js';
import { prisma } from './prisma.js';
import { canViewWikiPage } from './wikiTree.js';
import type { DomainEvent } from './domainEvents/index.js';
import { canResolveWorldDevelopment } from './worldDevelopmentResolveService.js';

export interface CampaignEventSubscriber {
  campaignId: string;
  userId: string;
  role: CampaignMemberRole;
  allowPlayerChronologyManagement: boolean;
  chronologyContributor: boolean;
}

/**
 * Visibility boundary shared by realtime transports. Returning false suppresses
 * the event entirely; restricted-resource existence is never projected.
 */
export async function canReceiveCampaignEvent(
  subscriber: CampaignEventSubscriber,
  event: DomainEvent,
): Promise<boolean> {
  if (event.campaignId !== subscriber.campaignId) return false;
  if (event.source === 'plugin') return false;
  if (event.type.startsWith('development.')) {
    return canResolveWorldDevelopment(subscriber.role);
  }

  if (event.resourceType === 'wiki_page') {
    const page = event.resourceId
      ? await prisma.wikiPage.findFirst({
          where: { id: event.resourceId, campaignId: subscriber.campaignId },
          select: { visibility: true },
        })
      : null;
    const visibility = page?.visibility ?? readVisibility(event.payload);
    return visibility != null && canReceiveWikiVisibility(subscriber, visibility);
  }

  if (event.resourceType === 'character_field') {
    if (!event.resourceId) return false;
    const page = await prisma.wikiPage.findFirst({
      where: { id: event.resourceId, campaignId: subscriber.campaignId },
      select: { visibility: true },
    });
    return page != null && canReceiveWikiVisibility(subscriber, page.visibility);
  }

  if (event.resourceType === 'timeline_event') {
    if (!event.resourceId) return false;
    const timelineEvent = await prisma.calendarEvent.findFirst({
      where: {
        id: event.resourceId,
        calendar: { campaignId: subscriber.campaignId },
      },
      select: { visibility: true },
    });
    if (!timelineEvent) return false;
    return canReceiveTimelineVisibility(subscriber, timelineEvent.visibility);
  }

  return (
    event.resourceType === 'campaign' ||
    event.resourceType === 'campaign_time' ||
    event.resourceType === 'world_advance' ||
    event.resourceType === 'notebook_arc'
  );
}

export function canReceiveWikiVisibility(
  subscriber: CampaignEventSubscriber,
  visibility: string,
): boolean {
  return canViewWikiPage(visibility, subscriber.role);
}

export function canReceiveTimelineVisibility(
  subscriber: CampaignEventSubscriber,
  visibility: string,
): boolean {
  return (
    visibility !== 'DM_ONLY' ||
    canManageChronology(subscriber.role, subscriber.allowPlayerChronologyManagement)
  );
}

function readVisibility(payload: Record<string, unknown>): string | null {
  return typeof payload.visibility === 'string' ? payload.visibility : null;
}
