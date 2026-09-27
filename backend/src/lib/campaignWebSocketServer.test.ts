import assert from 'node:assert/strict';
import test from 'node:test';
import { consumeSessionMessageBudget, validSessionMessage } from './campaignWebSocketServer.js';

test('session protocol admits only explicit versioned message types', () => {
  assert.equal(validSessionMessage({ version: 1, type: 'presence.join', data: {} }), true);
  assert.equal(validSessionMessage({ version: 1, type: 'webhook.deliver', data: {} }), false);
  assert.equal(validSessionMessage({ version: 2, type: 'presence.join', data: {} }), false);
});

test('session message budget rejects floods and refills after its window', () => {
  const budget = { remaining: 2, resetsAt: 100 };
  assert.equal(consumeSessionMessageBudget(budget, 50), true);
  assert.equal(consumeSessionMessageBudget(budget, 60), true);
  assert.equal(consumeSessionMessageBudget(budget, 70), false);
  assert.equal(consumeSessionMessageBudget(budget, 100), true);
});

test('resource interactions require a wiki page and bounded shapes', () => {
  assert.equal(validSessionMessage({
    version: 1,
    type: 'cursor.move',
    resource: { type: 'wiki_page', id: 'page-1' },
    data: { x: 12, y: 24 },
  }), true);
  assert.equal(validSessionMessage({ version: 1, type: 'cursor.move', data: { x: 12, y: 24 } }), false);
  assert.equal(validSessionMessage({ version: 1, type: 'editing.typing', resource: { type: 'wiki_page', id: 'page-1' }, data: { active: 'yes' } }), false);
  assert.equal(validSessionMessage({ version: 1, type: 'presence.update', data: { status: 'x'.repeat(81) } }), false);
});
