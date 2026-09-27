import assert from 'node:assert/strict';
import test from 'node:test';
import {
  clearDomainEventListenersForTests,
  dispatchDomainEvent,
  emitPluginDomainEvent,
  subscribeToDomainEvent,
} from './dispatcher.js';
import { CoreDomainEvents } from './types.js';

test('dispatchDomainEvent creates the canonical envelope and matches patterns', async () => {
  clearDomainEventListenersForTests();
  const received: string[] = [];
  let occurredAt = '';

  subscribeToDomainEvent(CoreDomainEvents.WIKI_UPDATED, (event) => {
    received.push(event.type);
    occurredAt = event.occurredAt;
  });
  subscribeToDomainEvent('wiki.*', (event) => {
    received.push(`prefix:${event.type}`);
  });

  dispatchDomainEvent({
    type: CoreDomainEvents.WIKI_UPDATED,
    campaignId: 'camp-1',
    actorId: 'user-1',
    resourceType: 'wiki_page',
    resourceId: 'page-1',
    payload: { id: 'page-1' },
  });

  await new Promise((resolve) => setImmediate(resolve));
  assert.ok(received.includes(CoreDomainEvents.WIKI_UPDATED));
  assert.ok(received.some((entry) => entry.startsWith('prefix:')));
  assert.ok(Number.isFinite(Date.parse(occurredAt)));
  clearDomainEventListenersForTests();
});

test('emitPluginDomainEvent enforces plugin namespace prefix', () => {
  assert.throws(() => {
    emitPluginDomainEvent('example-plugin', 'core:wiki:updated', {});
  }, /namespaced/);

  assert.doesNotThrow(() => {
    emitPluginDomainEvent('example-plugin', 'example-plugin:ping:received', {
      ok: true,
    });
  });
});
