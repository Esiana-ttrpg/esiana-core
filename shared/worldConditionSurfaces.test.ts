import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { deriveWorldConditionsAt } from './worldConditionSurfaces.js';
import {
  WORLD_ADVANCE_SCENARIOS,
  buildScenarioPageTitles,
} from './worldAdvanceScenarios.js';
import { effectToConditionDeriveRow } from './worldAdvancePreview.js';

describe('deriveWorldConditionsAt', () => {
  it('derives military pressure from escalating conflict', () => {
    const surfaces = deriveWorldConditionsAt({
      asOfEpochMinute: '1000',
      effects: [
        {
          id: 'e1',
          domain: 'conflict',
          type: 'conflict_front',
          regionPageId: 'loc-1',
          phase: 'escalating',
        },
      ],
      regionLabels: new Map([['loc-1', 'Frost March']]),
    });
    const military = surfaces.find(
      (s) => s.axis === 'military_pressure' && s.regionPageId === 'loc-1',
    );
    assert.ok(military);
    assert.equal(military!.level, 'rising');
  });

  for (const scenario of WORLD_ADVANCE_SCENARIOS) {
    it(`${scenario.key} derives at least one region surface`, () => {
      const regionLabels = buildScenarioPageTitles(scenario);
      const rows = scenario.effects.map((e) => effectToConditionDeriveRow(e));
      const surfaces = deriveWorldConditionsAt({
        asOfEpochMinute: '10080',
        effects: rows,
        regionLabels,
      });
      const regionScoped = surfaces.filter((s) => s.scopeKind === 'region');
      if (scenario.key === 'noble_alliance') {
        assert.equal(regionScoped.length, 0);
        return;
      }
      assert.ok(
        regionScoped.length > 0,
        `expected region surfaces for ${scenario.key}`,
      );
    });
  }
});
