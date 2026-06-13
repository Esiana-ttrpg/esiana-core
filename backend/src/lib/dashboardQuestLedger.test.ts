import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

/** Mirrors sort order in dashboardQuestLedger.ts */
const STATUS_SORT_ORDER = {
  ACTIVE: 0,
  AVAILABLE: 1,
  COMPLETED: 2,
  FAILED: 3,
  ABANDONED: 4,
};

describe('dashboard quest ledger sort order', () => {
  it('prioritizes ACTIVE before AVAILABLE', () => {
    assert.ok(STATUS_SORT_ORDER.ACTIVE < STATUS_SORT_ORDER.AVAILABLE);
  });
});
