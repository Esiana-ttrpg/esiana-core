import { CoreDomainEvents } from '../domainEvents/index.js';

export const WEBHOOK_CONTRACT_VERSION = 1 as const;
export const webhookEventCatalog = [
  { type: CoreDomainEvents.WIKI_CREATED, category: 'wiki', label: 'Wiki page created' },
  { type: CoreDomainEvents.WIKI_UPDATED, category: 'wiki', label: 'Wiki page updated' },
  { type: CoreDomainEvents.WIKI_DELETED, category: 'wiki', label: 'Wiki page deleted' },
  { type: CoreDomainEvents.CHARACTER_FIELD_CREATED, category: 'characters', label: 'Character field created' },
  { type: CoreDomainEvents.CHARACTER_FIELD_UPDATED, category: 'characters', label: 'Character field updated' },
  { type: CoreDomainEvents.CHARACTER_FIELD_DELETED, category: 'characters', label: 'Character field deleted' },
  { type: CoreDomainEvents.CALENDAR_ADVANCED, category: 'chronology', label: 'Campaign time advanced' },
  { type: CoreDomainEvents.TIMELINE_EVENT_CREATED, category: 'chronology', label: 'Timeline event created' },
  { type: CoreDomainEvents.WORLD_ADVANCED, category: 'chronology', label: 'World advanced' },
] as const;

const eligible = new Set<string>(webhookEventCatalog.map((event) => event.type));
export function isWebhookEventEligible(type: string): boolean { return eligible.has(type); }
export function validatesSubscriptions(value: unknown): value is string[] {
  return Array.isArray(value) && value.length > 0 && value.every((item) => item === '*' || (typeof item === 'string' && eligible.has(item)));
}
