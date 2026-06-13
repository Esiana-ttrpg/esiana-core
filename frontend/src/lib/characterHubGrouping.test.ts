import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import type { CharacterHubPayload } from './characterHub.ts';
import type { CategoryIndexChild } from './wiki.ts';
import {
  enrichCharacterEntries,
  groupCharactersByLocation,
  groupCharactersByPresenceTier,
} from './characterHubGrouping.ts';
import { projectCastEntryProps } from './characterCastProjection.ts';

function mockChild(id: string, title: string): CategoryIndexChild {
  return {
    id,
    title,
    parentId: null,
    visibility: 'PARTY',
    updatedAt: '2026-01-01T00:00:00.000Z',
    snippet: '',
    metadata: {},
  };
}

describe('characterHubGrouping', () => {
  it('pins latest session location group first', () => {
    const payload: CharacterHubPayload = {
      category: { id: 'cat', title: 'Characters', isIndexCategory: true },
      children: [mockChild('a', 'Mario'), mockChild('b', 'Peach')],
      latestSession: {
        id: 'session-1',
        title: 'Session 14',
        locationPageId: 'loc-peach',
        locationTitle: 'Peach Castle',
        href: '/campaigns/demo/notes/session-1',
        mentionedCharacterIds: ['b'],
      },
      recentlySeenBySession: [],
      locationCounts: [],
      characterContext: {
        a: {
          locationPageId: 'loc-woods',
          locationTitle: 'Boo Woods',
          portraitUrl: null,
          identityLine: null,
          lifeStatus: 'ALIVE',
          presenceTier: 'dormant',
          mentionedInLatestSession: false,
          lastSeen: null,
          knownThrough: null,
          activeQuests: [],
          coSeenWith: [],
          memorySnippet: null,
          isPartyMember: false,
          partyRoleLabel: null,
          primaryAffiliationId: null,
          primaryAffiliationTitle: null,
        },
        b: {
          locationPageId: 'loc-peach',
          locationTitle: 'Peach Castle',
          portraitUrl: null,
          identityLine: 'Royal Court',
          lifeStatus: 'ALIVE',
          presenceTier: 'active',
          mentionedInLatestSession: true,
          lastSeen: {
            sessionId: 'session-1',
            sessionTitle: 'Session 14',
            href: '/campaigns/demo/notes/session-1',
          },
          knownThrough: null,
          activeQuests: [],
          coSeenWith: [],
          memorySnippet: null,
          isPartyMember: false,
          partyRoleLabel: null,
          primaryAffiliationId: null,
          primaryAffiliationTitle: null,
        },
      },
    };

    const entries = enrichCharacterEntries(payload, payload.children);
    const groups = groupCharactersByLocation(entries, payload.latestSession);

    assert.equal(groups[0]?.locationTitle, 'Peach Castle');
    assert.equal(groups[0]?.isLatestSessionLocation, true);
    assert.equal(groups[0]?.characters[0]?.child.id, 'b');
  });

  it('orders presence bands active → recent → dormant and preserves location order inside bands', () => {
    const payload: CharacterHubPayload = {
      category: { id: 'cat', title: 'Characters', isIndexCategory: true },
      children: [
        mockChild('a', 'Mario'),
        mockChild('b', 'Peach'),
        mockChild('c', 'Luigi'),
      ],
      latestSession: {
        id: 'session-1',
        title: 'Session 14',
        locationPageId: 'loc-peach',
        locationTitle: 'Peach Castle',
        href: '/campaigns/demo/notes/session-1',
        mentionedCharacterIds: ['b'],
      },
      recentlySeenBySession: [],
      locationCounts: [],
      characterContext: {
        a: {
          locationPageId: 'loc-woods',
          locationTitle: 'Boo Woods',
          portraitUrl: null,
          identityLine: null,
          lifeStatus: 'ALIVE',
          presenceTier: 'dormant',
          mentionedInLatestSession: false,
          lastSeen: null,
          knownThrough: null,
          activeQuests: [],
          coSeenWith: [],
          memorySnippet: null,
          isPartyMember: false,
          partyRoleLabel: null,
          primaryAffiliationId: null,
          primaryAffiliationTitle: null,
        },
        b: {
          locationPageId: 'loc-peach',
          locationTitle: 'Peach Castle',
          portraitUrl: null,
          identityLine: null,
          lifeStatus: 'ALIVE',
          presenceTier: 'active',
          mentionedInLatestSession: true,
          lastSeen: null,
          knownThrough: null,
          activeQuests: [],
          coSeenWith: [],
          memorySnippet: null,
          isPartyMember: false,
          partyRoleLabel: null,
          primaryAffiliationId: null,
          primaryAffiliationTitle: null,
        },
        c: {
          locationPageId: 'loc-plumber',
          locationTitle: 'Mario Bros Plumbing',
          portraitUrl: null,
          identityLine: null,
          lifeStatus: 'ALIVE',
          presenceTier: 'recent',
          mentionedInLatestSession: false,
          lastSeen: null,
          knownThrough: null,
          activeQuests: [],
          coSeenWith: [],
          memorySnippet: null,
          isPartyMember: false,
          partyRoleLabel: null,
          primaryAffiliationId: null,
          primaryAffiliationTitle: null,
        },
      },
    };

    const entries = enrichCharacterEntries(payload, payload.children);
    const bands = groupCharactersByPresenceTier(entries, payload.latestSession);

    assert.deepEqual(
      bands.map((band) => band.tier),
      ['active', 'recent', 'dormant'],
    );
    assert.equal(bands[0]?.locationGroups[0]?.characters[0]?.child.id, 'b');
    assert.equal(bands[1]?.locationGroups[0]?.characters[0]?.child.id, 'c');
    assert.equal(bands[2]?.locationGroups[0]?.characters[0]?.child.id, 'a');
  });

  it('sorts active party characters before others within a location group', () => {
    const payload: CharacterHubPayload = {
      category: { id: 'cat', title: 'Characters', isIndexCategory: true },
      children: [mockChild('a', 'Mario'), mockChild('b', 'Peach')],
      latestSession: null,
      recentlySeenBySession: [],
      locationCounts: [],
      characterContext: {
        a: {
          locationPageId: 'loc-peach',
          locationTitle: 'Peach Castle',
          portraitUrl: null,
          identityLine: null,
          lifeStatus: 'ALIVE',
          presenceTier: 'dormant',
          mentionedInLatestSession: false,
          lastSeen: null,
          knownThrough: null,
          activeQuests: [],
          coSeenWith: [],
          memorySnippet: null,
          isPartyMember: false,
          partyRoleLabel: null,
          primaryAffiliationId: null,
          primaryAffiliationTitle: null,
        },
        b: {
          locationPageId: 'loc-peach',
          locationTitle: 'Peach Castle',
          portraitUrl: null,
          identityLine: null,
          lifeStatus: 'ALIVE',
          presenceTier: 'dormant',
          mentionedInLatestSession: false,
          lastSeen: null,
          knownThrough: null,
          activeQuests: [],
          coSeenWith: [],
          memorySnippet: null,
          isPartyMember: true,
          partyRoleLabel: 'Companion',
          primaryAffiliationId: null,
          primaryAffiliationTitle: null,
        },
      },
    };

    const entries = enrichCharacterEntries(payload, payload.children);
    const groups = groupCharactersByLocation(entries, null);

    assert.equal(groups[0]?.characters[0]?.child.id, 'b');
    assert.equal(groups[0]?.characters[1]?.child.id, 'a');
  });
});

describe('characterCastProjection', () => {
  it('projects known through and last seen labels', () => {
    const props = projectCastEntryProps({
      child: mockChild('a', 'Snaks Miller'),
      context: {
        locationPageId: 'loc-1',
        locationTitle: 'Peach Castle',
        portraitUrl: null,
        identityLine: 'Player Character',
        lifeStatus: 'ALIVE',
        presenceTier: 'active',
        mentionedInLatestSession: true,
        lastSeen: {
          sessionId: 's1',
          sessionTitle: 'Session 14',
          href: '/campaigns/demo/notes/s1',
        },
        knownThrough: {
          kind: 'quest',
          id: 'q1',
          title: 'Ghost Coin Investigation',
          href: '/campaigns/demo/adventures/q1',
        },
        activeQuests: [],
        coSeenWith: [],
        memorySnippet: null,
        isPartyMember: true,
        partyRoleLabel: 'Player Character',
        primaryAffiliationId: null,
        primaryAffiliationTitle: null,
      },
    });

    assert.equal(props.knownThroughLabel, 'Ghost Coin Investigation');
    assert.equal(props.lastSeenLabel, 'Session 14');
    assert.equal(props.isPartyMember, true);
  });

  it('projects co-seen peers, active quests, and memory snippet', () => {
    const props = projectCastEntryProps({
      child: mockChild('a', 'Snaks Miller'),
      context: {
        locationPageId: 'loc-1',
        locationTitle: 'Peach Castle',
        portraitUrl: null,
        identityLine: 'Player Character',
        lifeStatus: 'ALIVE',
        presenceTier: 'active',
        mentionedInLatestSession: true,
        lastSeen: null,
        knownThrough: null,
        activeQuests: [
          {
            id: 'q1',
            title: 'Ghost Coin Investigation',
            href: '/campaigns/demo/adventures/q1',
          },
          {
            id: 'q2',
            title: 'Tournament Arc',
            href: '/campaigns/demo/adventures/q2',
          },
        ],
        coSeenWith: [
          { id: 'mario', title: 'Mario' },
          { id: 'peach', title: 'Peach' },
        ],
        memorySnippet: 'asked about the ghost coin again',
        isPartyMember: false,
        partyRoleLabel: null,
        primaryAffiliationId: null,
        primaryAffiliationTitle: null,
      },
    });

    assert.equal(props.activeQuests.length, 2);
    assert.equal(props.coSeenWith.length, 2);
    assert.equal(props.memorySnippet, 'asked about the ghost coin again');
  });
});
