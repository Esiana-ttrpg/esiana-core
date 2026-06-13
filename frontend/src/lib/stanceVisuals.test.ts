import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { ORG_RELATION_STANCES } from './entityRelationTypes.ts';
import { resolveStanceVisual } from './stanceVisuals.ts';

describe('stanceVisuals', () => {
  for (const stance of ORG_RELATION_STANCES) {
    it(`includes label and border for ${stance}`, () => {
      const spec = resolveStanceVisual(stance, 'MILITARY', 'PUBLIC');
      assert.ok(spec.label.length > 0);
      assert.ok(['solid', 'dashed', 'double'].includes(spec.borderStyle));
      assert.ok(spec.ariaLabel.length > 0);
      assert.ok(spec.categoryIcon);
    });
  }

  it('uses dashed border for secret hostile stance', () => {
    const spec = resolveStanceVisual('SECRET_HOSTILE', 'DIPLOMATIC', 'PUBLIC');
    assert.equal(spec.borderStyle, 'dashed');
    assert.match(spec.label, /secret/i);
  });

  it('uses double border for vassal stance', () => {
    const spec = resolveStanceVisual('VASSAL', 'DIPLOMATIC', 'PUBLIC');
    assert.equal(spec.borderStyle, 'double');
  });
});
