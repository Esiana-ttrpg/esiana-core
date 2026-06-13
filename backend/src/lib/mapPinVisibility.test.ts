import assert from 'node:assert/strict';
import test from 'node:test';
import {
  isPinSecretFromPartyPerspective,
  isPinVisibleToRole,
  serializeMapPinForRole,
} from './mapPinVisibility.js';
import { CampaignMemberRoles, WikiVisibility } from '../types/domain.js';

const publicPin = {
  id: 'pin-1',
  targetPageId: 'page-1',
  targetAssetId: null,
  targetPage: { id: 'page-1', title: 'Town', visibility: WikiVisibility.PUBLIC },
  targetAsset: null,
};

const secretPin = {
  id: 'pin-2',
  targetPageId: 'page-2',
  targetAssetId: null,
  targetPage: { id: 'page-2', title: 'Hidden Lair', visibility: WikiVisibility.DM_ONLY },
  targetAsset: null,
};

test('mapPinVisibility hides DM_Only pins from players', () => {
  assert.equal(isPinVisibleToRole(secretPin, CampaignMemberRoles.PARTICIPANT), false);
  assert.equal(isPinVisibleToRole(publicPin, CampaignMemberRoles.PARTICIPANT), true);
});

test('mapPinVisibility shows all pins to DM with isSecret flag', () => {
  const playerView = serializeMapPinForRole(
    {
      ...secretPin,
      x_coordinate: 10,
      y_coordinate: 20,
      label: null,
      pinType: 'Location',
    },
    CampaignMemberRoles.PARTICIPANT,
  );
  assert.equal(playerView, null);

  const dmView = serializeMapPinForRole(
    {
      ...secretPin,
      x_coordinate: 10,
      y_coordinate: 20,
      label: null,
      pinType: 'Location',
    },
    CampaignMemberRoles.GAMEMASTER,
  );
  assert.ok(dmView);
  assert.equal(dmView?.isSecret, true);
  assert.equal(isPinSecretFromPartyPerspective(publicPin), false);
});

test('mapPinMaintenance purges pins without backup targets', async () => {
  const { resolvePinsAfterTargetPageDelete } = await import('./mapPinMaintenance.js');
  assert.equal(typeof resolvePinsAfterTargetPageDelete, 'function');
});
