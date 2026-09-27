import assert from 'node:assert/strict';
import test from 'node:test';
import {
  isReservedSystemWikiPage,
  newestVisibleCampaignPages,
} from './wikiSystemPages.js';

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

test('system metadata excludes workshop internals without treating underscore as a convention', () => {
  assert.equal(
    isReservedSystemWikiPage({
      title: '_Workshop Drafts',
      metadata: { workshopDraftsRoot: true, hidden: true },
    }),
    true,
  );
  assert.equal(
    isReservedSystemWikiPage({
      title: '_Private but legitimate lore',
      metadata: {},
    }),
    false,
  );
});

test('recent page selection excludes system pages and deduplicates by page identity', () => {
  const rows = [
    { id: 'settings', title: 'Settings', templateType: 'DEFAULT' },
    { id: 'maul', title: 'Darth Maul', templateType: 'CHARACTER' },
    { id: 'maul', title: 'Darth Maul', templateType: 'CHARACTER' },
    { id: 'other-maul', title: 'Darth Maul', templateType: 'DEFAULT' },
    { id: 'foxes', title: 'Midnight Foxes Kintargo', templateType: 'DEFAULT' },
    { id: 'havens', title: 'Havens', templateType: 'DEFAULT' },
    { id: 'pintown', title: 'Pintown', templateType: 'DEFAULT' },
    { id: 'rescue', title: 'Rescue the Missing Princess', templateType: 'QUEST' },
  ];

  assert.deepEqual(
    newestVisibleCampaignPages(rows, 10).map((row) => row.id),
    ['maul', 'other-maul', 'foxes', 'havens', 'pintown', 'rescue'],
  );
});
