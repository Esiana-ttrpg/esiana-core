import assert from 'node:assert/strict';
import test from 'node:test';
import { discordEventCatalog, discordTestPayload, isDiscordEventSupported, validatesDiscordSubscriptions } from './formatter.js';
import { isWebhookEventEligible } from '../webhooks/catalog.js';

test('Discord catalog is an explicit human-facing subset of public events', () => {
  assert.ok(discordEventCatalog.length > 0);
  assert.ok(discordEventCatalog.every((event) => isWebhookEventEligible(event.type)));
  assert.equal(isDiscordEventSupported('wiki.page.created'), true);
  assert.equal(isDiscordEventSupported('wiki.page.updated'), false);
  assert.equal(isDiscordEventSupported('presence.join'), false);
  assert.equal(isDiscordEventSupported('cursor.move'), false);
  assert.equal(validatesDiscordSubscriptions(['wiki.page.created']), true);
  assert.equal(validatesDiscordSubscriptions(['editing.typing']), false);
});

test('Discord test payload is recognizable and contains no credential fields', () => {
  const payload = discordTestPayload('The Lantern Archive');
  assert.match(JSON.stringify(payload), /Esiana connection test/);
  assert.match(JSON.stringify(payload), /The Lantern Archive/);
  assert.doesNotMatch(JSON.stringify(payload), /webhookUrl|secret|token/i);
});
