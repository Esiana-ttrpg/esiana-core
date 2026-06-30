import assert from 'node:assert/strict';
import { test } from 'node:test';
import { buildCategoryIndexWhereClause } from './wikiCategoryEntityIndex.js';
import { isReservedSystemWikiPage } from './wikiSystemPages.js';
import { ENTITY_CATEGORY_DISPLAY_BY_KEY } from './entityCategoryKeys.js';

test('recent entities category keys map to index where clauses', () => {
  for (const [key, title] of Object.entries(ENTITY_CATEGORY_DISPLAY_BY_KEY)) {
    const clause = buildCategoryIndexWhereClause(title);
    assert.ok(clause.OR && clause.OR.length > 0, `expected OR clause for ${key}`);
    assert.ok(
      clause.OR.some(
        (entry) =>
          'metadata' in entry &&
          typeof entry.metadata === 'object' &&
          entry.metadata !== null,
      ),
      `expected metadata filter for ${key}`,
    );
  }
});

test('recent entities feed excludes reserved system wiki pages', () => {
  const rows = [
    { title: 'Blackwater Keep', templateType: 'LOCATION', visibility: 'PARTY' },
    { title: 'Settings', templateType: 'PAGE', visibility: 'PARTY' },
    { title: 'Session 3', templateType: 'SESSION_NOTE', visibility: 'PARTY' },
  ];

  const visible = rows.filter(
    (row) => !isReservedSystemWikiPage({ title: row.title, templateType: row.templateType }),
  );
  assert.equal(visible.length, 1);
  assert.equal(visible[0]?.title, 'Blackwater Keep');
});
