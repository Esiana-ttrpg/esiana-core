import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  WORLD_ADVANCE_SCENARIOS,
  WORLD_ADVANCE_SCENARIO_KEYS,
} from './worldAdvanceScenarios.js';
import { validateScenarioPreview, buildScenarioPreview } from './worldAdvanceValidationAssert.js';
import { explainConditionSurface } from './explainWorldConditions.js';
import { resolveScenarioEffects } from './resolveWorldAdvanceScenario.js';

describe('worldAdvanceScenarios', () => {
  for (const key of WORLD_ADVANCE_SCENARIO_KEYS) {
    it(`${key} passes Tier 1 validation`, () => {
      const scenario = WORLD_ADVANCE_SCENARIOS.find((s) => s.key === key)!;
      const { passed, violations } = validateScenarioPreview(scenario);
      if (!passed) {
        assert.fail(
          `${key} violations:\n${violations.map((v) => `  [${v.kind}] ${v.rule}: ${v.detail}`).join('\n')}`,
        );
      }
    });
  }

  it('resolveScenarioEffects substitutes mapped page IDs', () => {
    const scenario = WORLD_ADVANCE_SCENARIOS[0]!;
    const resolved = resolveScenarioEffects(scenario, {
      regionFrostMarch: 'real-frost-id',
      orgHouseValen: 'real-valen-id',
      orgRivalHouse: 'real-rival-id',
      regionPeacefulShire: 'real-shire-id',
    });
    assert.ok(
      resolved.effects.some(
        (e) =>
          e.type === 'conflict_front' &&
          e.regionPageIds?.includes('real-frost-id'),
      ),
    );
  });

  it('explainConditionSurface links reasons to contributing effects', () => {
    const scenario = WORLD_ADVANCE_SCENARIOS.find((s) => s.key === 'refugee_crisis')!;
    const preview = buildScenarioPreview(scenario);
    const unstable = preview.conditionSurfaces.find(
      (s) => s.axis === 'region_stability' && s.scopeKind === 'region',
    );
    if (unstable) {
      const explained = explainConditionSurface(unstable, {
        effects: scenario.effects,
        narrativeSynthesis: preview.narrativeSynthesis,
      });
      assert.ok(explained.reasons.length > 0);
      for (const reason of explained.reasons) {
        for (const id of reason.effectIds) {
          assert.ok(
            unstable.contributingEffectIds.includes(id),
            `orphan effect ${id}`,
          );
        }
      }
    }
    const migration = preview.conditionSurfaces.find((s) => s.axis === 'migration_pressure');
    assert.ok(migration);
    const explainedMigration = explainConditionSurface(migration!, {
      effects: scenario.effects,
      narrativeSynthesis: preview.narrativeSynthesis,
    });
    assert.ok(explainedMigration.reasons.length > 0);
  });

  it('war_escalation explainability has non-empty reasons for military pressure', () => {
    const scenario = WORLD_ADVANCE_SCENARIOS.find((s) => s.key === 'war_escalation')!;
    const preview = buildScenarioPreview(scenario);
    const military = preview.conditionSurfaces.find((s) => s.axis === 'military_pressure');
    assert.ok(military);
    const explained = explainConditionSurface(military!, {
      effects: scenario.effects,
      narrativeSynthesis: preview.narrativeSynthesis,
    });
    assert.ok(explained.reasons.length > 0);
    assert.ok(
      explained.reasons.every((r) =>
        r.effectIds.every((id) => military!.contributingEffectIds.includes(id)),
      ),
    );
  });
});
