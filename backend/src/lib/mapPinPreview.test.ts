import assert from 'node:assert/strict';
import test from 'node:test';
import { buildMapPinPreviewPayload } from './mapPinPreview.js';
import { CampaignMemberRoles, WikiVisibility } from '../types/domain.js';

test('buildMapPinPreviewPayload supports nested map without host wiki page', () => {
  const payload = buildMapPinPreviewPayload(
    {
      id: 'pin-1',
      targetPageId: null,
      targetAssetId: 'map-2',
      targetPage: null,
      targetAsset: {
        id: 'map-2',
        type: 'map',
        displayName: 'City Detail',
        visibility: WikiVisibility.PARTY,
        interactiveMapPages: [],
      },
    },
    CampaignMemberRoles.GAMEMASTER,
  );

  assert.ok(payload);
  assert.equal(payload?.title, 'City Detail');
  assert.equal(payload?.targetAssetId, 'map-2');
});
