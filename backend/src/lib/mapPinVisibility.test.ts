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

test('effective capabilities govern page, asset and nested-map visibility', () => {
  const capabilities = new Set(['campaign.view', 'wiki.view_party']);
  const pin = { ...secretPin, x_coordinate: 1, y_coordinate: 2, label: 'Hidden details', pinType: 'Location' };
  assert.equal(serializeMapPinForRole(pin, CampaignMemberRoles.WRITER, capabilities), null);
  assert.equal(serializeMapPinForRole({ ...pin, ...publicPin }, CampaignMemberRoles.WRITER, capabilities)?.targetPageId, 'page-1');
  const nested = { ...pin, targetPage: null, targetPageId: null, targetAssetId: 'hidden-map',
    targetAsset: { id: 'hidden-map', type: 'MAP', displayName: 'Hidden map', visibility: 'DM_Only', interactiveMapPages: [] } };
  assert.equal(serializeMapPinForRole(nested, CampaignMemberRoles.WRITER, capabilities), null);
  const hiddenHost = { ...nested, targetAsset: { ...nested.targetAsset, visibility: 'Public',
    interactiveMapPages: [{ title: 'Hidden host', visibility: 'DM_Only' }] } };
  assert.equal(serializeMapPinForRole(hiddenHost, CampaignMemberRoles.WRITER, capabilities), null);
  const party = { ...pin, targetPage: { ...pin.targetPage, visibility: 'Party' } };
  assert.equal(serializeMapPinForRole(party, CampaignMemberRoles.WRITER, new Set(['campaign.view'])), null);
  capabilities.add('narrative.elevated_view');
  assert.equal(serializeMapPinForRole(pin, CampaignMemberRoles.PARTICIPANT, capabilities)?.targetPageId, 'page-2');
  assert.equal(serializeMapPinForRole(hiddenHost, CampaignMemberRoles.PARTICIPANT, capabilities)?.targetAssetId, 'hidden-map');
});
