import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  buildCoSeenMap,
  buildLocationCounts,
  resolveKnownThrough,
  resolvePresenceTier,
} from './characterHubContext.js';

describe('characterHubContext', () => {
  it('resolveKnownThrough prefers active quest over session', () => {
    const result = resolveKnownThrough({
      characterId: 'char-1',
      activeQuests: [
        {
          id: 'quest-1',
          title: 'Ghost Coin Investigation',
          href: '/campaigns/demo/adventures/quest-1',
        },
      ],
      lastSeen: {
        id: 'session-1',
        title: 'Session 14',
        parentId: null,
        visibility: 'PARTY',
        updatedAt: new Date().toISOString(),
        templateType: 'SESSION_NOTE',
        timelinePointId: 'tp-1',
        href: '/campaigns/demo/notes/tp-1',
      },
    });

    assert.equal(result?.kind, 'quest');
    assert.equal(result?.title, 'Ghost Coin Investigation');
  });

  it('resolveKnownThrough falls back to session', () => {
    const result = resolveKnownThrough({
      characterId: 'char-1',
      activeQuests: [],
      lastSeen: {
        id: 'session-1',
        title: 'Session 14',
        parentId: null,
        visibility: 'PARTY',
        updatedAt: new Date().toISOString(),
        templateType: 'SESSION_NOTE',
        timelinePointId: 'tp-1',
        href: '/campaigns/demo/notes/tp-1',
      },
    });

    assert.equal(result?.kind, 'session');
    assert.equal(result?.title, 'Session 14');
  });

  it('resolvePresenceTier marks latest session mentions active', () => {
    assert.equal(
      resolvePresenceTier({
        mentionedInLatestSession: true,
        atLatestSessionLocation: false,
        seenInRecentSessions: false,
      }),
      'active',
    );
  });

  it('buildCoSeenMap links characters from same session source', () => {
    const map = buildCoSeenMap({
      characterIds: new Set(['a', 'b', 'c']),
      sessionSources: [
        { sourceId: 's1', characterIds: ['a', 'b'], sortKey: 100 },
        { sourceId: 's2', characterIds: ['b', 'c'], sortKey: 50 },
      ],
    });

    assert.deepEqual(map.get('a'), ['b']);
    assert.deepEqual(map.get('b'), ['a', 'c']);
    assert.deepEqual(map.get('c'), ['b']);
  });

  it('buildLocationCounts sorts unknown last', () => {
    const contexts = new Map([
      [
        'a',
        {
          locationPageId: 'loc-1',
          locationTitle: 'Peach Castle',
          portraitUrl: null,
          identityLine: null,
          lifeStatus: 'ALIVE' as const,
          presenceTier: 'active' as const,
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
      ],
      [
        'b',
        {
          locationPageId: null,
          locationTitle: 'Unknown',
          portraitUrl: null,
          identityLine: null,
          lifeStatus: 'UNKNOWN' as const,
          presenceTier: 'dormant' as const,
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
      ],
    ]);

    const counts = buildLocationCounts(contexts);
    assert.equal(counts[0].locationTitle, 'Peach Castle');
    assert.equal(counts[1].locationTitle, 'Unknown');
  });
});
