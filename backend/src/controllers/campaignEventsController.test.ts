import assert from 'node:assert/strict';
import test from 'node:test';
import { campaignEventEnvelope } from './campaignEventsController.js';

test('campaignEventEnvelope strips wiki payloads while retaining routing fields', () => {
  const result = campaignEventEnvelope({
    type: 'wiki.page.updated',
    campaignId: 'campaign-1',
    actorId: 'user-1',
    resourceType: 'wiki_page',
    resourceId: 'secret-page',
    occurredAt: '2026-09-25T12:00:00.000Z',
    payload: { title: 'GM-only secret' },
    source: 'core',
  });

  assert.deepEqual(result.payload, {});
  assert.equal(result.resourceId, 'secret-page');
  assert.equal(result.type, 'wiki.page.updated');
});
