import assert from 'node:assert/strict';
import test from 'node:test';
import { isReservedSystemWikiPage } from './wikiSystemPages.js';

test('lore feed excludes reserved system wiki pages', () => {
  for (const title of ['Settings', 'Tags', 'Recent Changes', 'Session Notes']) {
    assert.equal(
      isReservedSystemWikiPage({ title }),
      true,
      `expected ${title} to be treated as system page`,
    );
  }

  assert.equal(isReservedSystemWikiPage({ title: 'Blackwater Keep' }), false);
  assert.equal(
    isReservedSystemWikiPage({ title: 'Session 3', templateType: 'SESSION_NOTE' }),
    true,
  );
});
