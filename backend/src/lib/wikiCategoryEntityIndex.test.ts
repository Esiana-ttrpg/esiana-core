import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { buildCategoryIndexWhereClause } from './wikiCategoryEntityIndex.js';

describe('buildCategoryIndexWhereClause', () => {
  it('uses string path for SQLite-compatible JSON filter', () => {
    const clause = buildCategoryIndexWhereClause('Characters');
    const metadataFilter = clause.OR?.[0]?.metadata as {
      path?: string | string[];
    };
    assert.equal(metadataFilter?.path, 'entityCategory');
    assert.notEqual(typeof metadataFilter?.path, 'object');
  });

  it('includes templateType fallback for Characters', () => {
    const clause = buildCategoryIndexWhereClause('Characters');
    assert.ok((clause.OR?.length ?? 0) >= 2);
    assert.ok(
      clause.OR?.some(
        (entry) => 'templateType' in entry && entry.templateType === 'CHARACTER',
      ),
    );
  });

  it('includes direct children of the category folder', () => {
    const clause = buildCategoryIndexWhereClause('Bestiary', 'bestiary-folder-id');
    assert.ok((clause.OR?.length ?? 0) >= 2);
    assert.deepEqual(
      clause.OR?.find((entry) => 'parentId' in entry),
      { parentId: 'bestiary-folder-id' },
    );
  });
});
