/** Core domain event type strings (open bus — plugins use `{pluginId}:entity:action`). */
export const CoreDomainEvents = {
  WIKI_CREATED: 'core:wiki:created',
  WIKI_UPDATED: 'core:wiki:updated',
  WIKI_DELETED: 'core:wiki:deleted',
  NOTEBOOK_ARC_CREATED: 'core:notebook_arc:created',
  NOTEBOOK_ARC_UPDATED: 'core:notebook_arc:updated',
  NOTEBOOK_ARC_DELETED: 'core:notebook_arc:deleted',
  CALENDAR_ADVANCED: 'core:calendar:advanced',
  WORLD_ADVANCED: 'core:world:advanced',
  CAMPAIGN_CREATED: 'core:campaign:created',
} as const;

export type CoreDomainEventType =
  (typeof CoreDomainEvents)[keyof typeof CoreDomainEvents];

export type DomainEventSource = 'core' | 'plugin';

export interface DomainEvent<TPayload = Record<string, unknown>> {
  type: string;
  campaignId?: string;
  payload: TPayload;
  emittedAt: string;
  source: DomainEventSource;
  /** Plugin manifest id when source is `plugin`. */
  sourceId?: string;
}

export type DomainEventListener = (event: DomainEvent) => void | Promise<void>;

export interface DispatchDomainEventInput<TPayload = Record<string, unknown>> {
  type: string;
  campaignId?: string;
  payload: TPayload;
  source?: DomainEventSource;
  sourceId?: string;
}
