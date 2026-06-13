import assert from 'node:assert/strict';
import test from 'node:test';
import { createDefaultPresentEra } from './factionMomentumMetadata.js';
import { buildWorldPressureProjection } from './worldPressureProjection.js';
import {
  deriveWorldEventPromptCandidates,
  isEligibleAdvanceMagnitudeForPrompts,
  MOMENTUM_TO_TREND_DIRECTION,
} from './worldEventSuggestionMetadata.js';

test('isEligibleAdvanceMagnitudeForPrompts suppresses tiny and small advances', () => {
  assert.equal(isEligibleAdvanceMagnitudeForPrompts('tiny'), false);
  assert.equal(isEligibleAdvanceMagnitudeForPrompts('small'), false);
  assert.equal(isEligibleAdvanceMagnitudeForPrompts('medium'), true);
  assert.equal(isEligibleAdvanceMagnitudeForPrompts('large'), true);
  assert.equal(isEligibleAdvanceMagnitudeForPrompts('massive'), true);
});

test('deriveWorldEventPromptCandidates caps faction prompts and requires trend convergence for era', () => {
  const currentEra = createDefaultPresentEra();
  const projection = buildWorldPressureProjection({
    currentEra,
    factions: [
      {
        orgPageId: 'org-1',
        orgTitle: 'House A',
        trajectory: { eraId: currentEra.id, momentumState: 'rising', pressure: 60, gmNote: null },
        currentPressures: [],
        worldState: null,
        hostileRelationCount: 0,
        region: null,
      },
      {
        orgPageId: 'org-2',
        orgTitle: 'House B',
        trajectory: { eraId: currentEra.id, momentumState: 'expanding', pressure: 70, gmNote: null },
        currentPressures: [],
        worldState: null,
        hostileRelationCount: 1,
        region: null,
      },
      {
        orgPageId: 'org-3',
        orgTitle: 'House C',
        trajectory: { eraId: currentEra.id, momentumState: 'fragmenting', pressure: 50, gmNote: null },
        currentPressures: [],
        worldState: null,
        hostileRelationCount: 0,
        region: null,
      },
    ],
  });

  const drafts = deriveWorldEventPromptCandidates(projection, {
    advanceMagnitude: 'medium',
    nextEpochMinute: '100000',
  });

  const factionDrafts = drafts.filter((d) => d.kind === 'faction_pressure');
  const eraDrafts = drafts.filter((d) => d.kind === 'era_trend');

  assert.equal(factionDrafts.length, 2);
  assert.equal(eraDrafts.length, 1);
  assert.equal(eraDrafts[0]?.trendDirection, 'growth');
  assert.match(eraDrafts[0]?.idempotencyKey ?? '', /era-trend:.*:growth$/);
});

test('deriveWorldEventPromptCandidates returns empty for tiny advance', () => {
  const currentEra = createDefaultPresentEra();
  const projection = buildWorldPressureProjection({
    currentEra,
    factions: [
      {
        orgPageId: 'org-1',
        orgTitle: 'House A',
        trajectory: { eraId: currentEra.id, momentumState: 'desperate', pressure: 90, gmNote: null },
        currentPressures: [],
        worldState: null,
        hostileRelationCount: 0,
        region: null,
      },
    ],
  });

  const drafts = deriveWorldEventPromptCandidates(projection, {
    advanceMagnitude: 'tiny',
    nextEpochMinute: '100000',
  });
  assert.equal(drafts.length, 0);
});

test('MOMENTUM_TO_TREND_DIRECTION excludes stable from convergence', () => {
  assert.equal(MOMENTUM_TO_TREND_DIRECTION.stable, null);
});
