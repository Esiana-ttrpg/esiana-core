import type {
  DomainEvent,
  DomainEventListener,
  DispatchDomainEventInput,
} from './types.js';

const listeners = new Map<string, Set<DomainEventListener>>();

function listenerKey(pattern: string): string {
  return pattern.trim();
}

export function subscribeToDomainEvent(
  pattern: string,
  listener: DomainEventListener,
): () => void {
  const key = listenerKey(pattern);
  let bucket = listeners.get(key);
  if (!bucket) {
    bucket = new Set();
    listeners.set(key, bucket);
  }
  bucket.add(listener);

  return () => {
    bucket?.delete(listener);
    if (bucket && bucket.size === 0) {
      listeners.delete(key);
    }
  };
}

function eventMatchesPattern(eventType: string, pattern: string): boolean {
  if (pattern === '*' || pattern === '**') return true;
  if (pattern.endsWith(':*')) {
    const prefix = pattern.slice(0, -1);
    return eventType.startsWith(prefix);
  }
  if (pattern.endsWith('*')) {
    return eventType.startsWith(pattern.slice(0, -1));
  }
  return eventType === pattern;
}

function matchingListeners(eventType: string): DomainEventListener[] {
  const matched: DomainEventListener[] = [];
  for (const [pattern, bucket] of listeners.entries()) {
    if (!eventMatchesPattern(eventType, pattern)) continue;
    matched.push(...bucket);
  }
  return matched;
}

async function fanOut(event: DomainEvent<Record<string, unknown>>): Promise<void> {
  const handlers = matchingListeners(event.type);
  if (handlers.length === 0) return;

  await Promise.allSettled(
    handlers.map(async (handler) => {
      try {
        await handler(event);
      } catch (error) {
        console.error('[domainEvents] listener failed', {
          type: event.type,
          error,
        });
      }
    }),
  );
}

/** Non-blocking domain event dispatch for core mutations. */
export function dispatchDomainEvent<TPayload = Record<string, unknown>>(
  input: DispatchDomainEventInput<TPayload>,
): void {
  const event: DomainEvent<TPayload> = {
    type: input.type,
    campaignId: input.campaignId,
    payload: input.payload,
    emittedAt: new Date().toISOString(),
    source: input.source ?? 'core',
    ...(input.sourceId ? { sourceId: input.sourceId } : {}),
  };

  setImmediate(() => {
    void fanOut(event as DomainEvent<Record<string, unknown>>);
  });
}

/** Plugin-originated events must use the plugin manifest id as namespace prefix. */
export function emitPluginDomainEvent(
  pluginId: string,
  type: string,
  payload: Record<string, unknown>,
  campaignId?: string,
): void {
  const normalizedPluginId = pluginId.trim();
  const normalizedType = type.trim();
  if (!normalizedPluginId || !normalizedType) {
    throw new Error('Plugin id and event type are required');
  }
  if (!normalizedType.startsWith(`${normalizedPluginId}:`)) {
    throw new Error(
      `Plugin event type must be namespaced as "${normalizedPluginId}:entity:action"`,
    );
  }

  dispatchDomainEvent({
    type: normalizedType,
    campaignId,
    payload,
    source: 'plugin',
    sourceId: normalizedPluginId,
  });
}

export function clearDomainEventListenersForTests(): void {
  listeners.clear();
}

export function getDomainEventListenerCount(pattern?: string): number {
  if (pattern) {
    return listeners.get(listenerKey(pattern))?.size ?? 0;
  }
  let total = 0;
  for (const bucket of listeners.values()) {
    total += bucket.size;
  }
  return total;
}
