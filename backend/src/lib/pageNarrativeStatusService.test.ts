import assert from 'node:assert/strict';
import { test } from 'node:test';
import { ALL_PAGE_NARRATIVE_STATUSES } from '../../../shared/pageNarrativeStatus.js';
import { assertPageNarrativeStatusCatalog } from './pageNarrativeStatusService.js';

test('PageNarrativeStatuses catalog is well-formed', () => {
  assertPageNarrativeStatusCatalog();
  assert.ok(ALL_PAGE_NARRATIVE_STATUSES.length >= 9);
});
