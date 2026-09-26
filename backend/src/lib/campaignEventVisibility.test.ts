import assert from 'node:assert/strict';
import test from 'node:test';
import {
  canReceiveCampaignEvent,
  canReceiveTimelineVisibility,
  canReceiveWikiVisibility,
  type CampaignEventSubscriber,
} from './campaignEventVisibility.js';

const participant: CampaignEventSubscriber = {
  campaignId: 'campaign-1',
  userId: 'user-1',
  role: 'PARTICIPANT',
  allowPlayerChronologyManagement: false,
  chronologyContributor: false,
};

test('restricted wiki and timeline events are hidden from ordinary members', () => {
  assert.equal(canReceiveWikiVisibility(participant, 'DM_Only'), false);
  assert.equal(canReceiveTimelineVisibility(participant, 'DM_ONLY'), false);
  assert.equal(canReceiveWikiVisibility(participant, 'Party'), true);
  assert.equal(canReceiveTimelineVisibility(participant, 'PARTY'), true);
});

test('elevated roles receive restricted resource events', () => {
  const writer = { ...participant, role: 'WRITER' as const };
  assert.equal(canReceiveWikiVisibility(writer, 'DM_Only'), true);
  assert.equal(canReceiveTimelineVisibility(writer, 'DM_ONLY'), true);
});

test('unknown and plugin event projections fail closed', async () => {
  const baseEvent = {
    campaignId: 'campaign-1',
    occurredAt: '2026-09-25T12:00:00.000Z',
    payload: {},
  };
  assert.equal(
    await canReceiveCampaignEvent(participant, {
      ...baseEvent,
      type: 'future.secret.changed',
      resourceType: 'future_secret',
      resourceId: 'secret-1',
      source: 'core',
    }),
    false,
  );
  assert.equal(
    await canReceiveCampaignEvent(participant, {
      ...baseEvent,
      type: 'plugin:secret:changed',
      source: 'plugin',
      sourceId: 'plugin',
    }),
    false,
  );
});
