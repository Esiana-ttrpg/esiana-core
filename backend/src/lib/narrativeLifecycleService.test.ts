import assert from 'node:assert/strict';
import test from 'node:test';
import { NarrativeLifecycleStates } from '../../../shared/narrativeLifecycle.js';
import type { NarrativeViewerContext } from '../../../shared/narrativeProjection.js';
import {
  filterQuestRowsForViewer,
  isQuestVisibleToViewer,
  lifecycleMapFromRows,
} from './narrativeLifecycleService.js';

const partyCtx: NarrativeViewerContext = {
  campaignId: 'c1',
  perspective: 'party',
  role: 'PLAYER',
  capabilities: { canManageCampaign: false, canManageChronology: false },
  campaignNow: null,
};

const elevatedCtx: NarrativeViewerContext = {
  ...partyCtx,
  perspective: 'elevated',
  role: 'DM',
  capabilities: { canManageCampaign: true, canManageChronology: true },
};

test('filterQuestRowsForViewer drops LOCKED for party', () => {
  const rows = [
    {
      id: 'q1',
      title: 'Hidden',
      parentId: 'root',
      visibility: 'Party',
      metadata: {},
      blocks: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      id: 'q2',
      title: 'Visible',
      parentId: 'root',
      visibility: 'Party',
      metadata: {},
      blocks: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  ];
  const map = lifecycleMapFromRows([
    { subjectId: 'q1', lifecycleState: NarrativeLifecycleStates.LOCKED, updatedAt: new Date() },
    { subjectId: 'q2', lifecycleState: NarrativeLifecycleStates.ACTIVE, updatedAt: new Date() },
  ]);

  const partyRows = filterQuestRowsForViewer(rows, map, partyCtx);
  assert.equal(partyRows.length, 1);
  assert.equal(partyRows[0]?.id, 'q2');

  const gmRows = filterQuestRowsForViewer(rows, map, elevatedCtx);
  assert.equal(gmRows.length, 2);
});

test('isQuestVisibleToViewer defaults missing lifecycle to discovered', () => {
  assert.equal(isQuestVisibleToViewer('missing', new Map(), partyCtx), true);
  assert.equal(
    isQuestVisibleToViewer(
      'locked',
      lifecycleMapFromRows([
        {
          subjectId: 'locked',
          lifecycleState: NarrativeLifecycleStates.LOCKED,
          updatedAt: new Date(),
        },
      ]),
      partyCtx,
    ),
    false,
  );
});
