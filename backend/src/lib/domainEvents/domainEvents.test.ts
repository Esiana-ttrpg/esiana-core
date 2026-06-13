import assert from 'node:assert/strict';
import test from 'node:test';
import {
  clearDomainEventListenersForTests,
  dispatchDomainEvent,
  emitPluginDomainEvent,
  subscribeToDomainEvent,
} from './dispatcher.js';
import { CoreDomainEvents } from './types.js';

test('dispatchDomainEvent fan-out matches exact and prefix patterns', async () => {
  clearDomainEventListenersForTests();
  const received: string[] = [];

  subscribeToDomainEvent('core:wiki:updated', (event) => {
    received.push(event.type);
  });
  subscribeToDomainEvent('core:*', (event) => {
    received.push(`prefix:${event.type}`);
  });

  dispatchDomainEvent({
    type: CoreDomainEvents.WIKI_UPDATED,
    campaignId: 'camp-1',
    payload: { id: 'page-1' },
  });

  await new Promise((resolve) => setImmediate(resolve));
  assert.ok(received.includes(CoreDomainEvents.WIKI_UPDATED));
  assert.ok(received.some((entry) => entry.startsWith('prefix:')));
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
