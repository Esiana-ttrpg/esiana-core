import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { buildSessionNotesAttendance } from './sessionNotesAttendance.js';
import { CampaignMemberRoles, WikiVisibility } from '../types/domain.js';

function noteBlocks(markdown: string) {
  return [
    {
      id: 'session-note-body',
      type: 'text-tiptap',
      content: { markdown },
    },
  ];
}

const EMPTY_CELL = { pageId: null, hasNotes: false };

describe('buildSessionNotesAttendance', () => {
  it('orders sessions by sequenceOrder descending and sets current to top visible', () => {
    const built = buildSessionNotesAttendance({
      canManage: true,
      members: [
        {
          userId: 'u-1',
          role: CampaignMemberRoles.PARTICIPANT,
          user: { email: 'a@example.com', displayName: 'Allison' },
        },
      ],
      timelineRows: [
        {
          id: 'tp-1',
          sequenceOrder: 1,
          wikiPage: {
            id: 'anchor-1',
            title: 'Session 1',
            metadata: { isSessionAnchor: true, sessionGroupId: 'sg-1' },
            visibility: WikiVisibility.PARTY,
          },
        },
        {
          id: 'tp-3',
          sequenceOrder: 3,
          wikiPage: {
            id: 'anchor-3',
            title: 'Session 3',
            metadata: { isSessionAnchor: true, sessionGroupId: 'sg-3' },
            visibility: WikiVisibility.PARTY,
          },
        },
        {
          id: 'tp-2',
          sequenceOrder: 2,
          wikiPage: {
            id: 'anchor-2',
            title: 'Session 2',
            metadata: { isSessionAnchor: true, sessionGroupId: 'sg-2' },
            visibility: WikiVisibility.PARTY,
          },
        },
      ],
      authorPages: [],
    });

    assert.deepEqual(
      built.sessions.map((s) => s.timelinePointId),
      ['tp-3', 'tp-2', 'tp-1'],
    );
    assert.equal(built.currentTimelinePointId, 'tp-3');
  });

  it('matches author pages via sessionGroupId and timelinePointId', () => {
    const built = buildSessionNotesAttendance({
      canManage: true,
      members: [
        {
          userId: 'u-a',
          role: CampaignMemberRoles.PARTICIPANT,
          user: { email: 'a@example.com', displayName: 'Allison' },
        },
        {
          userId: 'u-b',
          role: CampaignMemberRoles.PARTICIPANT,
          user: { email: 'b@example.com', displayName: 'Jordan' },
        },
      ],
      timelineRows: [
        {
          id: 'tp-1',
          sequenceOrder: 1,
          wikiPage: {
            id: 'anchor-1',
            title: 'Session 1',
            metadata: { isSessionAnchor: true, sessionGroupId: 'sg-1' },
            visibility: WikiVisibility.PARTY,
          },
        },
      ],
      authorPages: [
        {
          id: 'page-a',
          metadata: {
            sessionGroupId: 'sg-1',
            sessionNoteAuthorId: 'u-a',
            isSessionAuthor: true,
          },
          blocks: noteBlocks('hello'),
          visibility: WikiVisibility.PARTY,
        },
        {
          id: 'page-b',
          metadata: {
            timelinePointId: 'tp-1',
            sessionNoteAuthorId: 'u-b',
            isSessionAuthor: true,
          },
          blocks: noteBlocks('world'),
          visibility: WikiVisibility.PARTY,
        },
      ],
    });

    assert.deepEqual(built.sessions[0]?.cells['u-a'], {
      pageId: 'page-a',
      hasNotes: true,
    });
    assert.deepEqual(built.sessions[0]?.cells['u-b'], {
      pageId: 'page-b',
      hasNotes: true,
    });
  });

  it('treats empty and whitespace-only notes as hasNotes false', () => {
    const built = buildSessionNotesAttendance({
      canManage: true,
      members: [
        {
          userId: 'u-empty',
          role: CampaignMemberRoles.PARTICIPANT,
          user: { email: 'e@example.com', displayName: 'Empty' },
        },
        {
          userId: 'u-ws',
          role: CampaignMemberRoles.PARTICIPANT,
          user: { email: 'w@example.com', displayName: 'Whitespace' },
        },
      ],
      timelineRows: [
        {
          id: 'tp-1',
          sequenceOrder: 1,
          wikiPage: {
            id: 'anchor-1',
            title: 'Session 1',
            metadata: { isSessionAnchor: true, sessionGroupId: 'sg-1' },
            visibility: WikiVisibility.PARTY,
          },
        },
      ],
      authorPages: [
        {
          id: 'page-empty',
          metadata: {
            sessionGroupId: 'sg-1',
            sessionNoteAuthorId: 'u-empty',
            isSessionAuthor: true,
          },
          blocks: noteBlocks(''),
          visibility: WikiVisibility.PARTY,
        },
        {
          id: 'page-ws',
          metadata: {
            sessionGroupId: 'sg-1',
            sessionNoteAuthorId: 'u-ws',
            isSessionAuthor: true,
          },
          blocks: noteBlocks('   \n\t  '),
          visibility: WikiVisibility.PARTY,
        },
      ],
    });

    assert.deepEqual(built.sessions[0]?.cells['u-empty'], {
      pageId: 'page-empty',
      hasNotes: false,
    });
    assert.deepEqual(built.sessions[0]?.cells['u-ws'], {
      pageId: 'page-ws',
      hasNotes: false,
    });
  });

  it('includes only roster roles passed in (callers filter observers)', () => {
    const built = buildSessionNotesAttendance({
      canManage: true,
      members: [
        {
          userId: 'u-gm',
          role: CampaignMemberRoles.GAMEMASTER,
          user: { email: 'gm@example.com', displayName: 'GM' },
        },
        {
          userId: 'u-p',
          role: CampaignMemberRoles.PARTICIPANT,
          user: { email: 'p@example.com', displayName: 'Player' },
        },
      ],
      timelineRows: [],
      authorPages: [],
    });

    assert.deepEqual(
      built.members.map((m) => m.userId),
      ['u-gm', 'u-p'],
    );
  });

  it('populates identity fields and portrait; hides them when identity is not visible', () => {
    const visibleBuilt = buildSessionNotesAttendance({
      canManage: false,
      members: [
        {
          userId: 'u-1',
          role: CampaignMemberRoles.PARTICIPANT,
          user: { email: 'a@example.com', displayName: 'Allison' },
          identityPage: {
            id: 'char-1',
            title: 'Lyra Voss',
            visibility: WikiVisibility.PARTY,
            metadata: {
              appearance: { portraitUrl: '/api/assets/portrait-1' },
            },
          },
        },
      ],
      timelineRows: [],
      authorPages: [],
    });

    assert.equal(visibleBuilt.members[0]?.label, 'Allison');
    assert.equal(visibleBuilt.members[0]?.playerContext, 'Allison');
    assert.equal(visibleBuilt.members[0]?.displayName, 'Lyra Voss');
    assert.equal(visibleBuilt.members[0]?.identityPageId, 'char-1');
    assert.equal(
      visibleBuilt.members[0]?.identityPortrait,
      '/api/assets/portrait-1',
    );

    const hiddenBuilt = buildSessionNotesAttendance({
      canManage: false,
      members: [
        {
          userId: 'u-1',
          role: CampaignMemberRoles.PARTICIPANT,
          user: { email: 'a@example.com', displayName: 'Allison' },
          identityPage: {
            id: 'char-secret',
            title: 'Secret Character',
            visibility: WikiVisibility.DM_ONLY,
            metadata: {
              appearance: { portraitUrl: '/api/assets/secret-portrait' },
            },
          },
        },
      ],
      timelineRows: [],
      authorPages: [],
    });

    assert.equal(hiddenBuilt.members[0]?.displayName, null);
    assert.equal(hiddenBuilt.members[0]?.identityPageId, null);
    assert.equal(hiddenBuilt.members[0]?.identityPortrait, null);
    assert.equal(hiddenBuilt.members[0]?.label, 'Allison');
  });

  it('chooses current after visibility filter and treats hidden author pages as no-page', () => {
    const sharedRows = [
      {
        id: 'tp-secret',
        sequenceOrder: 3,
        wikiPage: {
          id: 'anchor-secret',
          title: 'Session 3',
          metadata: { isSessionAnchor: true, sessionGroupId: 'sg-3' },
          visibility: WikiVisibility.DM_ONLY,
        },
      },
      {
        id: 'tp-visible',
        sequenceOrder: 2,
        wikiPage: {
          id: 'anchor-visible',
          title: 'Session 2',
          metadata: { isSessionAnchor: true, sessionGroupId: 'sg-2' },
          visibility: WikiVisibility.PARTY,
        },
      },
    ];
    const members = [
      {
        userId: 'u-1',
        role: CampaignMemberRoles.PARTICIPANT,
        user: { email: 'a@example.com', displayName: 'Allison' },
      },
    ];
    const authorPages = [
      {
        id: 'page-secret',
        metadata: {
          sessionGroupId: 'sg-2',
          sessionNoteAuthorId: 'u-1',
          isSessionAuthor: true,
        },
        blocks: noteBlocks('secret notes'),
        visibility: WikiVisibility.DM_ONLY,
      },
    ];

    const nonManager = buildSessionNotesAttendance({
      canManage: false,
      members,
      timelineRows: sharedRows,
      authorPages,
    });

    assert.deepEqual(
      nonManager.sessions.map((s) => s.timelinePointId),
      ['tp-visible'],
    );
    assert.equal(nonManager.currentTimelinePointId, 'tp-visible');
    assert.deepEqual(nonManager.sessions[0]?.cells['u-1'], EMPTY_CELL);

    const manager = buildSessionNotesAttendance({
      canManage: true,
      members,
      timelineRows: sharedRows,
      authorPages,
    });

    assert.deepEqual(
      manager.sessions.map((s) => s.timelinePointId),
      ['tp-secret', 'tp-visible'],
    );
    assert.equal(manager.currentTimelinePointId, 'tp-secret');
    assert.deepEqual(manager.sessions[1]?.cells['u-1'], {
      pageId: 'page-secret',
      hasNotes: true,
    });
  });
});
