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

test('preview excerpts use effective elevation rather than the raw viewer role', () => {
  const pin = { id: 'pin', targetPageId: 'page', targetAssetId: null, targetAsset: null,
    targetPage: { id: 'page', title: 'Town', visibility: 'Public', blocks: [
      { type: 'text-tiptap', visibility: 'DM_Only', content: { markdown: 'Secret headquarters' } },
      { type: 'text-tiptap', content: { markdown: 'Public square' } },
    ] } };
  const capabilities = new Set(['campaign.view', 'wiki.view_party']);
  const ordinary = buildMapPinPreviewPayload(pin, CampaignMemberRoles.WRITER, capabilities);
  assert.ok(ordinary);
  assert.match(ordinary.excerpt, /Public square/);
  assert.doesNotMatch(ordinary.excerpt, /Secret headquarters/);
  capabilities.add('narrative.elevated_view');
  assert.match(buildMapPinPreviewPayload(pin, CampaignMemberRoles.PARTICIPANT, capabilities)!.excerpt, /Secret headquarters/);
});
