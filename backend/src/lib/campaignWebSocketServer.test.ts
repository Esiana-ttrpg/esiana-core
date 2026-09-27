import assert from 'node:assert/strict';
import test from 'node:test';
import { validSessionMessage } from './campaignWebSocketServer.js';

test('session protocol admits only explicit versioned message types', () => {
  assert.equal(validSessionMessage({ version: 1, type: 'presence.join', data: {} }), true);
  assert.equal(validSessionMessage({ version: 1, type: 'webhook.deliver', data: {} }), false);
  assert.equal(validSessionMessage({ version: 2, type: 'presence.join', data: {} }), false);
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
