import assert from 'node:assert/strict';
import test from 'node:test';
import {
  createDefaultCampaignMomentumState,
  createDefaultPresentEra,
  resolveCampaignEraAtEpoch,
  resolveFactionTrajectoryForEra,
} from '../../../shared/factionMomentumMetadata.js';
import { buildWorldPressureProjection } from '../../../shared/worldPressureProjection.js';
import { buildWorldPressurePreviewFromProjection } from './worldPressureProjectionService.js';

test('resolveFactionTrajectoryForEra falls back to organization world state', () => {
  const currentEra = createDefaultPresentEra();
  const trajectory = resolveFactionTrajectoryForEra({
    eraTrajectories: [],
    eraId: currentEra.id,
    worldState: 'reforming',
  });
  assert.equal(trajectory?.momentumState, 'resurgent');

  const projection = buildWorldPressureProjection({
    currentEra,
    factions: [
      {
        orgPageId: 'org-1',
        orgTitle: 'Kingdom Hearts',
        trajectory,
        currentPressures: [],
        worldState: 'reforming',
        hostileRelationCount: 0,
        region: null,
      },
    ],
  });

  assert.equal(projection.risingTensions.length, 1);
  assert.equal(projection.risingTensions[0]?.momentumState, 'resurgent');
});

test('buildWorldPressureProjection surfaces rising tensions from trajectories', () => {
  const currentEra = createDefaultPresentEra();
  const projection = buildWorldPressureProjection({
    currentEra,
    factions: [
      {
        orgPageId: 'org-1',
        orgTitle: 'Iron Choir',
        trajectory: {
          eraId: currentEra.id,
          momentumState: 'expanding',
          pressure: 70,
          gmNote: null,
        },
        currentPressures: ['Eastern recruitment surging'],
        worldState: 'rising',
        hostileRelationCount: 1,
        region: 'Greyhaven',
      },
      {
        orgPageId: 'org-2',
        orgTitle: 'Greyhaven Council',
        trajectory: {
          eraId: currentEra.id,
          momentumState: 'fragmenting',
          pressure: null,
          gmNote: null,
        },
        currentPressures: [],
        worldState: null,
        hostileRelationCount: 0,
        region: null,
      },
    ],
    daysUntilNextSession: 14,
  });

  assert.equal(projection.currentEra.name, 'Present');
  assert.ok(projection.risingTensions.length >= 2);
  assert.equal(projection.risingTensions[0]?.orgTitle, 'Iron Choir');
  assert.ok(projection.eraTrends.length > 0);
  assert.ok(projection.nearFutureBullets.length > 0);
  assert.equal(projection.projectedByNextSession?.daysUntil, 14);
});

test('buildWorldPressurePreviewFromProjection prefers projectedByNextSession bullets', () => {
  const currentEra = createDefaultPresentEra();
  const projection = buildWorldPressureProjection({
    currentEra,
    factions: [
      {
        orgPageId: 'org-1',
        orgTitle: 'Iron Choir',
        trajectory: {
          eraId: currentEra.id,
          momentumState: 'expanding',
          pressure: null,
          gmNote: null,
        },
        currentPressures: [],
        worldState: null,
        hostileRelationCount: 0,
        region: 'Greyhaven',
      },
    ],
    daysUntilNextSession: 7,
  });

  const preview = buildWorldPressurePreviewFromProjection(projection);
  assert.ok(preview);
  assert.equal(preview.paused, false);
  assert.ok(preview.projectedByNextSession);
  assert.equal(preview.projectedByNextSession?.daysUntil, 7);
  assert.ok(preview.projectedByNextSession!.bullets.length > 0);
  assert.match(preview.projectedByNextSession!.bullets[0] ?? '', /Iron Choir/);
  assert.equal(preview.risingTensions[0]?.orgTitle, 'Iron Choir');
});

test('buildWorldPressurePreviewFromProjection falls back to nearFutureBullets without session', () => {
  const currentEra = createDefaultPresentEra();
  const projection = buildWorldPressureProjection({
    currentEra,
    factions: [
      {
        orgPageId: 'org-1',
        orgTitle: 'Iron Choir',
        trajectory: {
          eraId: currentEra.id,
          momentumState: 'expanding',
          pressure: null,
          gmNote: null,
        },
        currentPressures: [],
        worldState: null,
        hostileRelationCount: 0,
        region: null,
      },
    ],
  });

  const preview = buildWorldPressurePreviewFromProjection(projection);
  assert.ok(preview);
  assert.equal(preview.projectedByNextSession, null);
  assert.ok(preview.nearFutureBullets.length > 0);
});

test('resolveCampaignEraAtEpoch selects bounded era for preview projection era id', () => {
  const present = createDefaultPresentEra();
  const future = {
    id: 'era-future',
    name: 'Future Age',
    sortOrder: 1,
    isCurrent: false,
    epochStartMinute: '8000',
    epochEndMinute: '12000',
    narrativeNote: null,
  };
  const state = {
    ...createDefaultCampaignMomentumState(),
    eras: [{ ...present, epochEndMinute: '7999' }, future],
  };
  const era = resolveCampaignEraAtEpoch(state, '9000');
  assert.equal(era.id, 'era-future');
});

test('buildWorldPressurePreviewFromProjection returns paused preview without tensions', () => {
  const currentEra = createDefaultPresentEra();
  const projection = buildWorldPressureProjection({
    currentEra,
    factions: [
      {
        orgPageId: 'org-1',
        orgTitle: 'Iron Choir',
        trajectory: {
          eraId: currentEra.id,
          momentumState: 'expanding',
          pressure: null,
          gmNote: null,
        },
        currentPressures: [],
        worldState: null,
        hostileRelationCount: 0,
        region: null,
      },
    ],
    daysUntilNextSession: 3,
  });

  const preview = buildWorldPressurePreviewFromProjection(projection, { paused: true });
  assert.ok(preview);
  assert.equal(preview.paused, true);
  assert.equal(preview.projectedByNextSession, null);
  assert.equal(preview.risingTensions.length, 0);
  assert.equal(preview.nearFutureBullets.length, 0);
});

test('parseCampaignMomentumState enforces single current era', async () => {
  const { parseCampaignMomentumState } = await import(
    '../../../shared/factionMomentumMetadata.js'
  );
  const state = parseCampaignMomentumState({
    eras: [
      { id: 'a', name: 'Past', sortOrder: 0, isCurrent: true },
      { id: 'b', name: 'Present', sortOrder: 1, isCurrent: true },
    ],
  });
  const current = state.eras.filter((e) => e.isCurrent);
  assert.equal(current.length, 1);
  assert.equal(current[0]?.id, 'a');
});

test('createDefaultCampaignMomentumState includes Present era', () => {
  const state = createDefaultCampaignMomentumState();
  assert.equal(state.eras.length, 1);
  assert.equal(state.eras[0]?.name, 'Present');
  assert.equal(state.eras[0]?.isCurrent, true);
});

test('buildDowntimeSimulationSnapshot includes worldPressure rising tensions', async () => {
  const { buildDowntimeSimulationSnapshot } = await import('./buildDowntimePresentation.js');
  const currentEra = createDefaultPresentEra();
  const projection = buildWorldPressureProjection({
    currentEra,
    factions: [
      {
        orgPageId: 'org-1',
        orgTitle: 'Iron Choir',
        trajectory: {
          eraId: currentEra.id,
          momentumState: 'expanding',
          pressure: null,
          gmNote: null,
        },
        currentPressures: [],
        worldState: null,
        hostileRelationCount: 0,
        region: null,
      },
    ],
  });

  const snapshot = buildDowntimeSimulationSnapshot({
    campaignHandle: 'test',
    currentEpochMinute: 5000n,
    chronometer: null,
    sinceEpochMinute: 4000n,
    currentDowntimePeriod: null,
    overlayEntries: [],
    creativeDrift: null,
    latestWorldAdvanceHeadline: null,
    worldPressure: projection,
  });

  assert.ok(snapshot.worldPressure?.risingTensions.length);
  assert.match(snapshot.factionPressureHint ?? '', /Iron Choir/);
  assert.ok(snapshot.pulse.bullets.some((b) => b.includes('Iron Choir')));
});
