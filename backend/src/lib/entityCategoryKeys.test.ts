import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  categoryTitleToEntityCategoryKey,
  entityCategoryIndexMatchValues,
  entityCategoryKeyToDisplayLabel,
  normalizeEntityCategoryKey,
} from './entityCategoryKeys.js';

describe('entityCategoryKeys', () => {
  it('maps folder titles to lowercase keys', () => {
    assert.equal(categoryTitleToEntityCategoryKey('Bestiary'), 'bestiary');
    assert.equal(categoryTitleToEntityCategoryKey('Rules/Resources'), 'rules-resources');
  });

  it('normalizes legacy title-case stored values', () => {
    assert.equal(normalizeEntityCategoryKey('Bestiary'), 'bestiary');
    assert.equal(normalizeEntityCategoryKey('Characters'), 'characters');
    assert.equal(normalizeEntityCategoryKey('rules-resources'), 'rules-resources');
  });

  it('maps keys back to display labels', () => {
    assert.equal(entityCategoryKeyToDisplayLabel('bestiary'), 'Bestiary');
    assert.equal(entityCategoryKeyToDisplayLabel('rules-resources'), 'Rules/Resources');
  });

  it('provides index match values for legacy and canonical stamps', () => {
    const values = entityCategoryIndexMatchValues('Bestiary');
    assert.ok(values.includes('bestiary'));
    assert.ok(values.includes('Bestiary'));
  });
});
