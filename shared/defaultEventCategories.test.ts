import assert from 'node:assert/strict';
import test from 'node:test';
import { DEFAULT_EVENT_CATEGORIES, EVENT_CATEGORY_ICONS, eventCategoryLabel, isEventCategoryIcon, resolveEventCategoryFilter } from './defaultEventCategories.js';

test('category icons use one supported contract for defaults, validation and editors', () => {
  assert.ok(DEFAULT_EVENT_CATEGORIES.every(category => isEventCategoryIcon(category.icon)));
  assert.equal(new Set(EVENT_CATEGORY_ICONS.map(icon => icon.value)).size, EVENT_CATEGORY_ICONS.length);
  for (const invalid of [undefined, null, '', 'unknown', 0, {}]) assert.equal(isEventCategoryIcon(invalid), false);
});

test('category filters preserve virtual options and IDs across renames, then reset deleted IDs', () => {
  const categories = [{ id: 'discovery', name: 'Archives' }, { id: 'legacy', name: 'Uncategorized' }];
  for (const value of ['all', 'uncategorized', 'discovery', 'legacy']) assert.equal(resolveEventCategoryFilter(value, categories), value);
  assert.equal(resolveEventCategoryFilter('discovery', categories.slice(1)), 'all');
  assert.equal(resolveEventCategoryFilter('deleted', []), 'all');
  assert.equal(resolveEventCategoryFilter(null, []), 'all');
  assert.equal(eventCategoryLabel('Uncategorized'), 'Uncategorized (saved category)');
});
