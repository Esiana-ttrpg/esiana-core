import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  buildColumnSortKey,
  buildCombinedSessionNotes,
  formatFantasyDateLabel,
} from './sessionNotesCombined.js';
import { CampaignMemberRoles, WikiVisibility } from '../types/domain.js';

const baseSession = {
  sessionGroupId: 'sg-1',
  timelinePointId: 'tp-1',
  anchorPageId: 'anchor-1',
  title: 'Session 3',
  sequenceOrder: 3,
  sessionCreatedAt: '2026-01-01T00:00:00.000Z',
  fantasyEpochMinute: '1000',
  fantasyDateLabel: 'Moonday, Frost 1, Year 1',
  locationPageId: null,
  locationTitle: null,
};

describe('sessionNotesCombined', () => {
  it('masks DM-only columns for non-managers', () => {
    const built = buildCombinedSessionNotes({
      session: baseSession,
      canManage: false,
      members: [
        {
          userId: 'dm-1',
          role: CampaignMemberRoles.GAMEMASTER,
          label: 'DM',
          displayName: null,
          playerContext: 'DM',
          identityPageId: null,
        },
        {
          userId: 'p-1',
          role: CampaignMemberRoles.PARTICIPANT,
          label: 'Player',
          displayName: null,
          playerContext: 'Player',
          identityPageId: null,
        },
      ],
      authorPages: [
        {
          id: 'page-dm',
          title: 'DM Notes',
          metadata: {
            sessionGroupId: 'sg-1',
            sessionNoteAuthorId: 'dm-1',
            isSessionAuthor: true,
          },
          blocks: [
            {
              id: 'session-note-body',
              type: 'text-tiptap',
              content: { markdown: 'secret' },
            },
          ],
          visibility: WikiVisibility.DM_ONLY,
          createdAt: new Date('2026-01-02T00:00:00.000Z'),
          updatedAt: new Date('2026-01-02T00:00:00.000Z'),
        },
        {
          id: 'page-p1',
          title: 'Player Notes',
          metadata: {
            sessionGroupId: 'sg-1',
            sessionNoteAuthorId: 'p-1',
            isSessionAuthor: true,
          },
          blocks: [
            {
              id: 'session-note-body',
              type: 'text-tiptap',
              content: { markdown: 'we fought a dragon' },
            },
          ],
          visibility: WikiVisibility.PARTY,
          createdAt: new Date('2026-01-01T00:00:00.000Z'),
          updatedAt: new Date('2026-01-01T00:00:00.000Z'),
        },
      ],
      pageTitlesById: new Map(),
    });

    const dmCol = built.columns.find((c) => c.userId === 'dm-1');
    const playerCol = built.columns.find((c) => c.userId === 'p-1');
    assert.ok(dmCol?.masked);
    assert.equal(dmCol?.markdown, '');
    assert.ok(playerCol?.hasNotes);
    assert.deepEqual(built.referenceSourcePageIds, ['page-p1']);
    assert.equal(built.entitiesMentioned.length, 0);
  });

  it('builds sort keys from fantasy epoch and createdAt', () => {
    assert.equal(
      buildColumnSortKey('500', '2026-01-01T00:00:00.000Z'),
      '500|2026-01-01T00:00:00.000Z',
    );
    assert.equal(
      buildColumnSortKey(null, '2026-01-01T00:00:00.000Z'),
      '|2026-01-01T00:00:00.000Z',
    );
  });

  it('formatFantasyDateLabel returns null without calendar', () => {
    assert.equal(formatFantasyDateLabel('100', null), null);
  });
});
