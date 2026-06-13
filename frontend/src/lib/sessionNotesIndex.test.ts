import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { flattenTimelineSessions, hasTimelineSessions } from './sessionNotesIndex.js';
import type { SessionNotesIndexPayload } from '@/types/wiki';

const sampleIndex: SessionNotesIndexPayload = {
  canManage: true,
  notebooks: [
    {
      id: 'arc-1',
      title: 'Arc',
      displayOrder: 0,
      pages: [
        {
          id: 'p1',
          title: 'Session 2',
          content: '',
          updatedAt: '',
          visibility: 'PARTY',
          canEdit: true,
          canDelete: true,
          timelinePointId: 'tp-2',
          sequenceOrder: 2,
        },
      ],
    },
  ],
  uncategorized: [
    {
      id: 'p2',
      title: 'Session 1',
      content: '',
      updatedAt: '',
      visibility: 'PARTY',
      canEdit: true,
      canDelete: true,
      timelinePointId: 'tp-1',
      sequenceOrder: 1,
    },
  ],
};

describe('sessionNotesIndex', () => {
  it('flattenTimelineSessions sorts by sequenceOrder', () => {
    const sessions = flattenTimelineSessions(sampleIndex);
    assert.equal(sessions.length, 2);
    assert.equal(sessions[0]?.timelinePointId, 'tp-1');
    assert.equal(sessions[1]?.timelinePointId, 'tp-2');
  });

  it('hasTimelineSessions returns false for empty index', () => {
    assert.equal(
      hasTimelineSessions({ canManage: true, notebooks: [], uncategorized: [] }),
      false,
    );
    assert.equal(hasTimelineSessions(sampleIndex), true);
  });
});
