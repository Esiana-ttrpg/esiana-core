import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { normalizeWikiPageTemplateFields } from '../../../shared/wikiTemplateType.js';

/**
 * Regression for wiki create/update boundary: legacy entity templateType values
 * must never persist; entity identity belongs in metadata.entityCategory.
 */
describe('wiki create template normalization (API boundary)', () => {
  it('coerces CHARACTER to DEFAULT and stamps entityCategory', () => {
    const result = normalizeWikiPageTemplateFields({
      templateType: 'CHARACTER',
      metadata: { profession: 'Scout' },
    });
    assert.equal(result.templateType, 'DEFAULT');
    assert.equal(result.metadata.entityCategory, 'characters');
    assert.equal(result.metadata.profession, 'Scout');
  });

  it('preserves explicit entityCategory when legacy type is coerced', () => {
    const result = normalizeWikiPageTemplateFields({
      templateType: 'CHARACTER',
      metadata: { entityCategory: 'characters', profession: 'Scout' },
    });
    assert.equal(result.templateType, 'DEFAULT');
    assert.equal(result.metadata.entityCategory, 'characters');
  });

  it('accepts DEFAULT with entityCategory for character create payload', () => {
    const result = normalizeWikiPageTemplateFields({
      templateType: 'DEFAULT',
      metadata: { entityCategory: 'characters' },
    });
    assert.equal(result.templateType, 'DEFAULT');
    assert.equal(result.metadata.entityCategory, 'characters');
  });

  it('leaves structural template types unchanged', () => {
    const result = normalizeWikiPageTemplateFields({
      templateType: 'QUEST',
      metadata: { entityCategory: 'quests' },
    });
    assert.equal(result.templateType, 'QUEST');
    assert.equal(result.metadata.entityCategory, 'quests');
  });
});
