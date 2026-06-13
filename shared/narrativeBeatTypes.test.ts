import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { SCENE_BEAT_TYPES } from './sceneMetadata.js';
import {
  BEATS_BY_DRAMATIC_GROUP,
  NARRATIVE_BEAT_DRAMATIC_GROUP,
  NARRATIVE_BEAT_HINTS,
  NARRATIVE_BEAT_LABELS,
  formatNarrativeBeatLabel,
  narrativeBeatDramaticGroup,
  normalizeSceneBeatTypeFilter,
} from './narrativeBeatTypes.js';

describe('narrativeBeatTypes catalog', () => {
  it('covers every SCENE_BEAT_TYPES entry', () => {
    for (const beat of SCENE_BEAT_TYPES) {
      assert.ok(NARRATIVE_BEAT_LABELS[beat], `missing label for ${beat}`);
      assert.ok(NARRATIVE_BEAT_HINTS[beat], `missing hint for ${beat}`);
      assert.ok(NARRATIVE_BEAT_DRAMATIC_GROUP[beat], `missing group for ${beat}`);
    }
  });

  it('assigns each beat to exactly one dramatic group partition', () => {
    const assigned = new Set<string>();
    for (const group of Object.keys(BEATS_BY_DRAMATIC_GROUP) as Array<
      keyof typeof BEATS_BY_DRAMATIC_GROUP
    >) {
      for (const beat of BEATS_BY_DRAMATIC_GROUP[group]) {
        assert.equal(NARRATIVE_BEAT_DRAMATIC_GROUP[beat], group);
        assert.ok(!assigned.has(beat), `duplicate assignment for ${beat}`);
        assigned.add(beat);
      }
    }
    assert.equal(assigned.size, SCENE_BEAT_TYPES.length);
  });

  it('formats labels', () => {
    assert.equal(formatNarrativeBeatLabel('reveal'), 'Reveal');
    assert.equal(narrativeBeatDramaticGroup('loss'), 'escalation');
  });

  it('normalizes beat filter arrays', () => {
    assert.deepEqual(normalizeSceneBeatTypeFilter(['Reveal', 'invalid', 'choice']), [
      'reveal',
      'choice',
    ]);
  });
});
