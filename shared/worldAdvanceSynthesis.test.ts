import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { synthesizeWorldAdvanceNarrative } from './worldAdvanceSynthesis.js';
import { WorldAdvanceProjectionDomains } from './worldAdvance.js';
import { deriveWorldConditionsAt } from './worldConditionSurfaces.js';

describe('synthesizeWorldAdvanceNarrative', () => {
  it('includes conflict escalation language for escalating fronts', () => {
    const pageTitles = new Map([['loc-1', 'Frost March']]);
    const effects = [
      {
        id: 'e1',
        domain: WorldAdvanceProjectionDomains.CONFLICT,
        type: 'conflict_front' as const,
        label: 'Border clash',
        phase: 'escalating' as const,
        regionPageIds: ['loc-1'],
      },
    ];
    const conditionSurfaces = deriveWorldConditionsAt({
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
      regionLabels: pageTitles,
    });
    const synthesis = synthesizeWorldAdvanceNarrative({
      asOfLabel: 'Winter 842',
      effects,
      conditionSurfaces,
      pageTitles,
      seasonLabel: 'Winter 842',
    });
    const text = [synthesis.headline, ...synthesis.paragraphs].join(' ').toLowerCase();
    assert.ok(text.includes('escalat'));
    assert.ok(text.includes('frost march'));
    assert.equal(synthesis.isProjection, true);
  });

  it('marks trade disruption without war language', () => {
    const pageTitles = new Map([['loc-2', 'River Corridor']]);
    const synthesis = synthesizeWorldAdvanceNarrative({
      asOfLabel: null,
      effects: [
        {
          id: 'e2',
          domain: WorldAdvanceProjectionDomains.ECONOMIC,
          type: 'economic_signal',
          targetKind: 'location',
          pageId: 'loc-2',
          signal: 'trade_disruption',
        },
      ],
      conditionSurfaces: [],
      pageTitles,
    });
    const text = synthesis.paragraphs.join(' ').toLowerCase();
    assert.ok(text.includes('trade disruption'));
    assert.ok(!text.includes('escalat'));
  });
});
