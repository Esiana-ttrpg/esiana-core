import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  isLegacyEntityTemplateType,
  isStructuralTemplateType,
  legacyTemplateTypeToEntityCategory,
  normalizePersistedTemplateType,
  normalizeWikiPageTemplateFields,
} from './wikiTemplateType.ts';
import { resolveCanonicalEntityCategory } from './resolveCanonicalEntityCategory.ts';

describe('wikiTemplateType', () => {
  it('identifies legacy entity template types', () => {
    assert.equal(isLegacyEntityTemplateType('CHARACTER'), true);
    assert.equal(isLegacyEntityTemplateType('location'), true);
    assert.equal(isLegacyEntityTemplateType('QUEST'), false);
    assert.equal(isLegacyEntityTemplateType('DEFAULT'), false);
  });

  it('normalizes legacy entity types to DEFAULT', () => {
    assert.equal(normalizePersistedTemplateType('CHARACTER'), 'DEFAULT');
    assert.equal(normalizePersistedTemplateType('QUEST'), 'QUEST');
    assert.equal(normalizePersistedTemplateType('SESSION_NOTE'), 'SESSION_NOTE');
    assert.equal(normalizePersistedTemplateType(undefined), 'DEFAULT');
  });

  it('maps legacy template types to entity categories', () => {
    assert.equal(legacyTemplateTypeToEntityCategory('CHARACTER'), 'characters');
    assert.equal(legacyTemplateTypeToEntityCategory('ORGANIZATION'), 'organizations');
  });

  it('stamps entityCategory when coercing legacy template on write', () => {
    const result = normalizeWikiPageTemplateFields({
      templateType: 'CHARACTER',
      metadata: {},
    });
    assert.equal(result.templateType, 'DEFAULT');
    assert.equal(result.metadata.entityCategory, 'characters');
  });

  it('preserves existing entityCategory when coercing', () => {
    const result = normalizeWikiPageTemplateFields({
      templateType: 'LOCATION',
      metadata: { entityCategory: 'locations' },
    });
    assert.equal(result.templateType, 'DEFAULT');
    assert.equal(result.metadata.entityCategory, 'locations');
  });

  it('passes through structural template types', () => {
    assert.equal(isStructuralTemplateType('DOWNTIME_HAVEN'), true);
    const result = normalizeWikiPageTemplateFields({
      templateType: 'QUEST',
      metadata: { questStatus: 'ACTIVE' },
    });
    assert.equal(result.templateType, 'QUEST');
  });
});

describe('resolveCanonicalEntityCategory', () => {
  const flatPages = [
    { id: 'chars', title: 'Characters', parentId: null, templateType: 'DEFAULT' },
    { id: 'c1', title: 'Aldric', parentId: 'chars', templateType: 'DEFAULT', metadata: {} },
  ];

  it('reads entityCategory from metadata', () => {
    assert.equal(
      resolveCanonicalEntityCategory(
        {
          id: 'x',
          title: 'X',
          parentId: null,
          templateType: 'DEFAULT',
          metadata: { entityCategory: 'characters' },
        },
        flatPages,
      ),
      'characters',
    );
  });

  it('infers category from tree placement', () => {
    assert.equal(
      resolveCanonicalEntityCategory(
        {
          id: 'c1',
          title: 'Aldric',
          parentId: 'chars',
          templateType: 'DEFAULT',
          metadata: {},
        },
        flatPages,
      ),
      'characters',
    );
  });

  it('does not use legacy templateType', () => {
    assert.equal(
      resolveCanonicalEntityCategory(
        {
          id: 'orphan',
          title: 'Orphan',
          parentId: null,
          templateType: 'CHARACTER',
          metadata: {},
        },
        [],
      ),
      null,
    );
  });
});
