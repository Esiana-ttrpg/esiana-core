/** Core domain event type strings (open bus — plugins use `{pluginId}:entity:action`). */
export const CoreDomainEvents = {
  WIKI_CREATED: 'wiki.page.created',
  WIKI_UPDATED: 'wiki.page.updated',
  WIKI_DELETED: 'wiki.page.deleted',
  NOTEBOOK_ARC_CREATED: 'wiki.notebook-arc.created',
  NOTEBOOK_ARC_UPDATED: 'wiki.notebook-arc.updated',
  NOTEBOOK_ARC_DELETED: 'wiki.notebook-arc.deleted',
  CALENDAR_ADVANCED: 'campaign.time.advanced',
  WORLD_ADVANCED: 'campaign.world.advanced',
  CAMPAIGN_CREATED: 'campaign.created',
  TIMELINE_EVENT_CREATED: 'timeline.event.created',
  DEVELOPMENT_PROPOSED: 'development.proposed',
  DEVELOPMENT_APPLIED: 'development.applied',
  CHARACTER_FIELD_CREATED: 'character.field.created',
  CHARACTER_FIELD_UPDATED: 'character.field.updated',
  CHARACTER_FIELD_DELETED: 'character.field.deleted',
} as const;

export type CoreDomainEventType =
  (typeof CoreDomainEvents)[keyof typeof CoreDomainEvents];

export type DomainEventSource = 'core' | 'plugin';

export interface DomainEvent<TPayload = Record<string, unknown>> {
  type: string;
  campaignId?: string;
  actorId?: string;
  resourceType?: string;
  resourceId?: string;
  payload: TPayload;
  occurredAt: string;
  source: DomainEventSource;
  /** Plugin manifest id when source is `plugin`. */
  sourceId?: string;
}

export type DomainEventListener = (event: DomainEvent) => void | Promise<void>;

export interface DispatchDomainEventInput<TPayload = Record<string, unknown>> {
  type: string;
  campaignId?: string;
  actorId?: string;
  resourceType?: string;
  resourceId?: string;
  payload: TPayload;
  source?: DomainEventSource;
  sourceId?: string;
}
