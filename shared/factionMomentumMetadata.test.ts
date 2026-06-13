import assert from 'node:assert/strict';
import test from 'node:test';
import {
  createDefaultCampaignMomentumState,
  createDefaultPresentEra,
  organizationWorldStateToMomentum,
  resolveCampaignEraAtEpoch,
  resolveFactionTrajectoryForEra,
} from './factionMomentumMetadata.js';

test('organizationWorldStateToMomentum maps legacy world state labels', () => {
  assert.equal(organizationWorldStateToMomentum('rising'), 'rising');
  assert.equal(organizationWorldStateToMomentum('reforming'), 'resurgent');
  assert.equal(organizationWorldStateToMomentum('schismatic'), 'fragmenting');
  assert.equal(organizationWorldStateToMomentum(null), null);
});

test('resolveFactionTrajectoryForEra prefers explicit era trajectory', () => {
  const era = createDefaultPresentEra();
  const explicit = resolveFactionTrajectoryForEra({
    eraTrajectories: [{ eraId: era.id, momentumState: 'stable', pressure: null, gmNote: null }],
    eraId: era.id,
    worldState: 'rising',
  });
  assert.equal(explicit?.momentumState, 'stable');
});

test('resolveCampaignEraAtEpoch falls back to current era when no bounds match', () => {
  const state = createDefaultCampaignMomentumState();
  const era = resolveCampaignEraAtEpoch(state, '5000');
  assert.equal(era.id, createDefaultPresentEra().id);
});

test('resolveCampaignEraAtEpoch picks era by epoch bounds', () => {
  const present = createDefaultPresentEra();
  const ashWinter = {
    id: 'era-ash',
    name: 'Ash Winter',
    sortOrder: 1,
    isCurrent: false,
    epochStartMinute: '1000',
    epochEndMinute: '5000',
    narrativeNote: null,
  };
  const state = {
    ...createDefaultCampaignMomentumState(),
    eras: [
      { ...present, isCurrent: false, epochEndMinute: '999' },
      ashWinter,
    ],
  };

  const resolved = resolveCampaignEraAtEpoch(state, '2500');
  assert.equal(resolved.id, 'era-ash');
  assert.equal(resolved.name, 'Ash Winter');
});

test('resolveCampaignEraAtEpoch prefers narrowest overlapping era', () => {
  const wide = {
    id: 'era-wide',
    name: 'Wide',
    sortOrder: 0,
    isCurrent: false,
    epochStartMinute: '0',
    epochEndMinute: '10000',
    narrativeNote: null,
  };
  const narrow = {
    id: 'era-narrow',
    name: 'Narrow',
    sortOrder: 1,
    isCurrent: true,
    epochStartMinute: '2000',
    epochEndMinute: '3000',
    narrativeNote: null,
  };
  const state = {
    ...createDefaultCampaignMomentumState(),
    eras: [wide, narrow],
  };

  const resolved = resolveCampaignEraAtEpoch(state, '2500');
  assert.equal(resolved.id, 'era-narrow');
});
