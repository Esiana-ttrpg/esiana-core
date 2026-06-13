import assert from 'node:assert/strict';
import { test } from 'node:test';
import { PageNarrativeStatusType } from '@prisma/client';
import { ALL_PAGE_NARRATIVE_STATUSES } from '../../../shared/pageNarrativeStatus.js';
import { assertSharedMatchesPrismaEnum } from './pageNarrativeStatusService.js';

test('shared PageNarrativeStatuses match Prisma enum', () => {
  assertSharedMatchesPrismaEnum();
  assert.equal(
    ALL_PAGE_NARRATIVE_STATUSES.length,
    Object.values(PageNarrativeStatusType).length,
  );
});
