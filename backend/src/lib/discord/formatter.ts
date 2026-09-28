import { env } from '../../config/env.js';
import type { DomainEvent } from '../domainEvents/index.js';
import { CoreDomainEvents } from '../domainEvents/index.js';
import { prisma } from '../prisma.js';
import { webhookEventCatalog } from '../webhooks/catalog.js';

const formatterTypes = new Set<string>([
  CoreDomainEvents.WIKI_CREATED,
  CoreDomainEvents.CALENDAR_ADVANCED,
  CoreDomainEvents.TIMELINE_EVENT_CREATED,
  CoreDomainEvents.WORLD_ADVANCED,
]);
export const discordEventCatalog = webhookEventCatalog.filter((item) => formatterTypes.has(item.type));
export function isDiscordEventSupported(type: string): boolean { return formatterTypes.has(type); }
export function validatesDiscordSubscriptions(value: unknown): value is string[] {
  return Array.isArray(value) && value.length > 0 && value.every((type) => typeof type === 'string' && formatterTypes.has(type));
}

export type DiscordPayload = { username: string; content?: string; embeds: Array<{ title:string; description:string; url?:string; color:number; timestamp:string; footer:{text:string} }> };

export async function formatDiscordEvent(event: DomainEvent): Promise<DiscordPayload | null> {
  if (!event.campaignId || !isDiscordEventSupported(event.type)) return null;
  const campaign = await prisma.campaign.findUnique({ where: { id: event.campaignId }, select: { name: true, handle: true } });
  if (!campaign) return null;
  let resourceName: string | null = null;
  if (event.resourceType === 'wiki_page' && event.resourceId) resourceName = (await prisma.wikiPage.findFirst({ where: { id: event.resourceId, campaignId: event.campaignId }, select: { title: true } }))?.title ?? null;
  if (event.resourceType === 'timeline_event' && event.resourceId) resourceName = (await prisma.calendarEvent.findFirst({ where: { id: event.resourceId, calendar: { campaignId: event.campaignId } }, select: { title: true } }))?.title ?? null;
  const presentations: Record<string, { title:string; description:string }> = {
    [CoreDomainEvents.WIKI_CREATED]: { title: 'New campaign content', description: resourceName ? `**${resourceName}** was added to the campaign.` : 'A new campaign page was added.' },
    [CoreDomainEvents.CALENDAR_ADVANCED]: { title: 'Campaign time advanced', description: 'The campaign chronology moved forward.' },
    [CoreDomainEvents.TIMELINE_EVENT_CREATED]: { title: 'New chronology event', description: resourceName ? `**${resourceName}** was added to the timeline.` : 'A new event was added to the campaign timeline.' },
    [CoreDomainEvents.WORLD_ADVANCED]: { title: 'The world moved forward', description: 'Campaign world state has advanced.' },
  };
  const presentation = presentations[event.type];
  if (!presentation) return null;
  const campaignUrl = `${env.frontendOrigin.replace(/\/$/, '')}/campaigns/${encodeURIComponent(campaign.handle)}`;
  const resourceUrl = event.resourceType === 'wiki_page' && event.resourceId
    ? `${campaignUrl}/wiki/${encodeURIComponent(event.resourceId)}`
    : campaignUrl;
  return { username: 'Esiana', embeds: [{ ...presentation, url: resourceUrl, color: 0x7c3aed, timestamp: event.occurredAt, footer: { text: campaign.name } }] };
}

export function discordTestPayload(campaignName: string): DiscordPayload {
  return { username: 'Esiana', embeds: [{ title: 'Esiana connection test', description: `Discord announcements are connected for **${campaignName}**.`, color: 0x22c55e, timestamp: new Date().toISOString(), footer: { text: 'Esiana campaign integration' } }] };
}
