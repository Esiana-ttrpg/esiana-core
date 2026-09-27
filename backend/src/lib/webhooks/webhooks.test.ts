import assert from 'node:assert/strict';
import { createHmac } from 'node:crypto';
import test from 'node:test';
import { isWebhookEventEligible, validatesSubscriptions } from './catalog.js';
import { signWebhookPayload } from './delivery.js';

test('public catalog excludes session and unknown internal messages', () => {
  assert.equal(isWebhookEventEligible('wiki.page.updated'), true);
  assert.equal(isWebhookEventEligible('presence.join'), false);
  assert.equal(isWebhookEventEligible('cursor.move'), false);
  assert.equal(isWebhookEventEligible('internal.cache.invalidated'), false);
  assert.equal(validatesSubscriptions(['wiki.page.updated']), true);
  assert.equal(validatesSubscriptions(['presence.join']), false);
});

test('signature contract binds timestamp and exact request bytes', () => {
  const timestamp = 1_800_000_000;
  const body = '{"id":"evt_1"}';
  const expected = createHmac('sha256', 'secret').update(`${timestamp}.${body}`).digest('hex');
  assert.equal(signWebhookPayload('secret', timestamp, body), `t=${timestamp},v1=${expected}`);
  assert.notEqual(signWebhookPayload('secret', timestamp, body), signWebhookPayload('secret', timestamp + 1, body));
});
