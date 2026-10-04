import assert from 'node:assert/strict';
import test from 'node:test';
import {
  createDefaultCampaignMomentumState,
  createDefaultPresentEra,
  createEraTrajectory,
  createFactionEraTrajectory,
  DEFAULT_TRAJECTORY_MOMENTUM_STATE,
  normalizeEraTrajectory,
  normalizeEraTrajectories,
  normalizeFactionEraTrajectory,
  organizationWorldStateToMomentum,
  resolveCampaignEraAtEpoch,
  resolveExplicitTrajectoryForEra,
  resolveFactionTrajectoryForEra,
  type CampaignEra,
} from './factionMomentumMetadata.js';

test('organizationWorldStateToMomentum maps legacy world state labels', () => {
  assert.equal(organizationWorldStateToMomentum('rising'), 'rising');
  assert.equal(organizationWorldStateToMomentum('reforming'), 'resurgent');
  assert.equal(organizationWorldStateToMomentum('schismatic'), 'fragmenting');
  assert.equal(organizationWorldStateToMomentum('constructor'), null);
  assert.equal(organizationWorldStateToMomentum('__proto__'), null);
  assert.equal(organizationWorldStateToMomentum(null), null);
});

test('createFactionEraTrajectory defaults momentum to stable engine default', () => {
  const row = createFactionEraTrajectory({ eraId: 'era-1', direction: 'Militarizing' });
  assert.equal(row.momentumState, DEFAULT_TRAJECTORY_MOMENTUM_STATE);
  assert.equal(row.momentumState, 'stable');
  assert.equal(row.direction, 'Militarizing');
  assert.equal(row.byEraId, null);
  assert.equal(row.outcome, null);
});

test('createEraTrajectory has planning fields only', () => {
  const row = createEraTrajectory({
    eraId: 'era-1',
    direction: 'Rising influence',
    outcome: 'Takes the throne',
  });
  assert.equal(row.direction, 'Rising influence');
  assert.equal(row.outcome, 'Takes the throne');
  assert.equal(row.byEraId, null);
  assert.equal(row.gmNote, null);
  assert.equal('momentumState' in row, false);
});

test('normalizeFactionEraTrajectory round-trips hybrid planning fields', () => {
  const normalized = normalizeFactionEraTrajectory({
    eraId: 'era-1',
    byEraId: 'era-3',
    direction: 'Declining',
    outcome: 'Severe famine',
    momentumState: 'declining',
    pressure: 40,
    gmNote: 'Watch the harvest',
  });
  assert.deepEqual(normalized, {
    eraId: 'era-1',
    byEraId: 'era-3',
    direction: 'Declining',
    outcome: 'Severe famine',
    momentumState: 'declining',
    pressure: 40,
    gmNote: 'Watch the harvest',
  });
});

test('normalizeEraTrajectory round-trips character/location planning fields', () => {
  const normalized = normalizeEraTrajectory({
    eraId: 'era-1',
    byEraId: 'era-2',
    direction: 'Rising influence',
    outcome: 'Takes the throne',
    gmNote: 'Court intrigue',
    momentumState: 'rising',
    pressure: 99,
  });
  assert.deepEqual(normalized, {
    eraId: 'era-1',
    byEraId: 'era-2',
    direction: 'Rising influence',
    outcome: 'Takes the throne',
    gmNote: 'Court intrigue',
  });
  assert.equal(normalizeEraTrajectories([normalized, { eraId: 'era-1' }]).length, 1);
});

test('resolveFactionTrajectoryForEra prefers explicit era trajectory', () => {
  const era = createDefaultPresentEra();
  const explicit = resolveFactionTrajectoryForEra({
    eraTrajectories: [
      createFactionEraTrajectory({ eraId: era.id, momentumState: 'stable' }),
    ],
    eraId: era.id,
    worldState: 'rising',
    eras: [era],
  });
  assert.equal(explicit?.momentumState, 'stable');
});

const eraI: CampaignEra = {
  id: 'era-i',
  name: 'Era I',
  sortOrder: 0,
  isCurrent: true,
  epochStartMinute: null,
  epochEndMinute: null,
  narrativeNote: null,
};
const eraII: CampaignEra = {
  id: 'era-ii',
  name: 'Era II',
  sortOrder: 1,
  isCurrent: false,
  epochStartMinute: null,
  epochEndMinute: null,
  narrativeNote: null,
};
const eraIII: CampaignEra = {
  id: 'era-iii',
  name: 'Era III',
  sortOrder: 2,
  isCurrent: false,
  epochStartMinute: null,
  epochEndMinute: null,
  narrativeNote: null,
};
const eraIV: CampaignEra = {
  id: 'era-iv',
  name: 'Era IV',
  sortOrder: 3,
  isCurrent: false,
  epochStartMinute: null,
  epochEndMinute: null,
  narrativeNote: null,
};
const eras = [eraI, eraII, eraIII, eraIV];

test('resolveExplicitTrajectoryForEra works for planning-only trajectories', () => {
  const trajectory = createEraTrajectory({
    eraId: eraI.id,
    byEraId: eraIII.id,
    direction: 'Declining',
    outcome: 'Severe famine',
  });
  assert.equal(
    resolveExplicitTrajectoryForEra({
      eraTrajectories: [trajectory],
      eraId: eraII.id,
      eras,
    })?.direction,
    'Declining',
  );
  assert.equal(
    resolveExplicitTrajectoryForEra({
      eraTrajectories: [trajectory],
      eraId: eraIV.id,
      eras,
    }),
    null,
  );
});

test('resolveExplicitTrajectoryForEra returns nothing without explicit rows', () => {
  assert.equal(
    resolveExplicitTrajectoryForEra({
      eraTrajectories: [],
      eraId: eraI.id,
      eras,
    }),
    null,
  );
});

test('resolveFactionTrajectoryForEra: From=I By=null matches Era I and later', () => {
  const trajectory = createFactionEraTrajectory({
    eraId: eraI.id,
    byEraId: null,
    direction: 'Militarizing',
    momentumState: 'expanding',
  });
  for (const era of eras) {
    const resolved = resolveFactionTrajectoryForEra({
      eraTrajectories: [trajectory],
      eraId: era.id,
      worldState: null,
      eras,
    });
    assert.equal(resolved?.direction, 'Militarizing', `expected match for ${era.name}`);
  }
});

test('resolveFactionTrajectoryForEra: From=I By=III matches I–III inclusive, not after', () => {
  const trajectory = createFactionEraTrajectory({
    eraId: eraI.id,
    byEraId: eraIII.id,
    direction: 'Rising influence',
    momentumState: 'rising',
  });
  assert.equal(
    resolveFactionTrajectoryForEra({
      eraTrajectories: [trajectory],
      eraId: eraI.id,
      worldState: null,
      eras,
    })?.direction,
    'Rising influence',
  );
  assert.equal(
    resolveFactionTrajectoryForEra({
      eraTrajectories: [trajectory],
      eraId: eraIII.id,
      worldState: null,
      eras,
    })?.direction,
    'Rising influence',
  );
  assert.equal(
    resolveFactionTrajectoryForEra({
      eraTrajectories: [trajectory],
      eraId: eraIV.id,
      worldState: null,
      eras,
    }),
    null,
  );
});

test('resolveFactionTrajectoryForEra: before From does not match', () => {
  const trajectory = createFactionEraTrajectory({
    eraId: eraII.id,
    byEraId: null,
    direction: 'Collapsing',
    momentumState: 'declining',
  });
  assert.equal(
    resolveFactionTrajectoryForEra({
      eraTrajectories: [trajectory],
      eraId: eraI.id,
      worldState: null,
      eras,
    }),
    null,
  );
  assert.equal(
    resolveFactionTrajectoryForEra({
      eraTrajectories: [trajectory],
      eraId: eraII.id,
      worldState: null,
      eras,
    })?.direction,
    'Collapsing',
  );
});

test('resolveFactionTrajectoryForEra falls back to worldState when no explicit match', () => {
  const resolved = resolveFactionTrajectoryForEra({
    eraTrajectories: [],
    eraId: eraI.id,
    worldState: 'rising',
    eras,
  });
  assert.equal(resolved?.momentumState, 'rising');
  assert.equal(resolved?.direction, null);
  assert.equal(resolved?.outcome, null);
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
