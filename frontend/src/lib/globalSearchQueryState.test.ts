import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  applyChipRemoval,
  applyTabSelection,
  deriveEffectiveSearchState,
} from './globalSearchQueryState.js';

describe('globalSearchQueryState', () => {
  it('derives chips only for structured filters', () => {
    const state = deriveEffectiveSearchState(
      'Besaid type:character from:Allison',
      null,
    );
    assert.equal(state.chips.length, 2);
    assert.ok(state.chips.some((c) => c.kind === 'type'));
    assert.ok(state.chips.some((c) => c.kind === 'from'));
    assert.equal(state.typeFromQuery, true);
    assert.equal(state.effectiveType, 'character');
    assert.equal(state.requestParams.type, null);
  });

  it('uses UI tab when query has no type operators', () => {
    const state = deriveEffectiveSearchState('Besaid', 'character');
    assert.equal(state.effectiveType, 'character');
    assert.equal(state.requestParams.type, 'character');
    assert.equal(state.typeFromQuery, false);
    assert.equal(state.chips.length, 0);
  });

  it('multi-type query shows All tab with chips', () => {
    const state = deriveEffectiveSearchState(
      'type:character type:location Besaid',
      null,
    );
    assert.equal(state.effectiveType, null);
    assert.ok(state.chips.length >= 2);
  });

  it('removes a chip while preserving free text', () => {
    const { draft } = applyChipRemoval(
      'Besaid type:character from:Allison',
      { kind: 'from', value: 'Allison', label: 'From Allison' },
      null,
    );
    assert.equal(draft, 'Besaid type:character');
  });

  it('tab click with type operators rewrites query text', () => {
    const { draft, uiType } = applyTabSelection(
      'Besaid type:location',
      'character',
    );
    assert.match(draft, /type:character/);
    assert.doesNotMatch(draft, /type:location/);
    assert.equal(uiType, 'character');
  });

  it('tab click without type operators keeps draft unchanged', () => {
    const { draft, uiType } = applyTabSelection('Besaid', 'character');
    assert.equal(draft, 'Besaid');
    assert.equal(uiType, 'character');
  });

  it('All tab clears type operators from query', () => {
    const { draft } = applyTabSelection('Besaid type:character', null);
    assert.equal(draft, 'Besaid');
  });

  it('restores structured recent query into effective state', () => {
    const recent = 'type:character Besaid';
    const state = deriveEffectiveSearchState(recent, null);
    assert.equal(state.effectiveType, 'character');
    assert.ok(state.chips.some((c) => c.kind === 'type'));
    assert.deepEqual(state.parsed.terms, ['besaid']);
  });

  it('contradictory tab is resolved by rewriting query', () => {
    // UI was Characters but user typed type:location — applying location tab
    // (or re-deriving) must not leave Characters selected against location.
    const state = deriveEffectiveSearchState('Besaid type:location', 'character');
    assert.equal(state.effectiveType, 'location');
    assert.equal(state.requestParams.type, null);
  });
});
