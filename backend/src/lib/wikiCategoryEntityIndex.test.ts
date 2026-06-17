import assert from 'node:assert/strict';
import { afterEach, describe, it } from 'node:test';
import { buildCategoryIndexWhereClause } from './wikiCategoryEntityIndex.js';
import { prismaJsonPath } from './prismaJsonPath.js';

describe('buildCategoryIndexWhereClause', () => {
  const originalProvider = process.env.DATABASE_PROVIDER;

  afterEach(() => {
    if (originalProvider === undefined) {
      delete process.env.DATABASE_PROVIDER;
    } else {
      process.env.DATABASE_PROVIDER = originalProvider;
    }
  });

  it('uses provider-aware JSON path for entityCategory metadata filter', () => {
    process.env.DATABASE_PROVIDER = 'postgresql';
    const clause = buildCategoryIndexWhereClause('Characters');
    const metadataFilter = clause.OR?.[0]?.metadata as {
      path?: string | string[];
    };
    assert.deepEqual(
      metadataFilter?.path,
      prismaJsonPath('entityCategory'),
    );
    assert.deepEqual(metadataFilter?.path, ['entityCategory']);
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
