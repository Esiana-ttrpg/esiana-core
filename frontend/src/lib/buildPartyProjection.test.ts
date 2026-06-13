import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { ENSEMBLE_SPOTLIGHT_RANDOM, getDefaultEnsembleConfig } from './ensembleConfig.ts';
import {
  buildPartyProjection,
  resolvePartyQuestPursuits,
} from './buildPartyProjection.ts';
const campaignNow = { year: 400, month: 1, day: 1 };

const activeParty = (role = 'PLAYER_CHARACTER') => ({
  partyParticipation: { active: true, role },
});

const flatPages = [
  {
    id: 'char-a',
    title: 'Alden Sterling',
    templateType: 'CHARACTER',
    metadata: {
      ...activeParty(),
      title: 'Exiled Knight',
      pronouns: 'he/they',
      knownFor: 'Surviving Black Hollow',
      activeArc: 'Reclaiming his oath',
      primaryAffiliationId: 'org-1',
    },
  },
  {
    id: 'char-b',
    title: 'Snaks Miller',
    templateType: 'CHARACTER',
    metadata: {
      ...activeParty(),
      title: 'Scout',
      pronouns: 'they/them',
      activeArc: 'Finding the Glass Compass',
      primaryAffiliationId: 'org-1',
    },
  },
  {
    id: 'org-1',
    title: 'Sapphire Order',
    templateType: 'ORGANIZATION',
    metadata: {},
  },
  {
    id: 'quest-1',
    title: 'The Hollow Crown',
    templateType: 'DEFAULT',
    metadata: { questStatus: 'ACTIVE' },
  },
];

const wikiTreePages = [
  {
    id: 'char-a',
    parentId: null,
    title: 'Alden Sterling',
    templateType: 'CHARACTER',
    metadata: flatPages[0]!.metadata,
  },
  {
    id: 'char-b',
    parentId: null,
    title: 'Snaks Miller',
    templateType: 'CHARACTER',
    metadata: flatPages[1]!.metadata,
  },
  {
    id: 'char-c',
    parentId: null,
    title: 'Mira Vale',
    templateType: 'DEFAULT',
    metadata: {
      ...activeParty('COMPANION'),
      entityCategory: 'characters',
      title: 'Warden',
      pronouns: 'she/her',
      activeArc: 'Holding the pass',
    },
  },
];

describe('buildPartyProjection', () => {
  it('builds roster from active party participation and applies member order', () => {
    const config = {
      ...getDefaultEnsembleConfig(),
      memberOrder: ['char-b', 'char-a'],
      featuredQuestIds: ['quest-1'],
      spotlightCharacterId: 'char-a',
      spotlightQuote: 'I did not flee.',
      spotlightNote: 'Accused before the Tribunal',
    };

    const projection = buildPartyProjection({
      config,
      rosterMembers: [
        { userId: 'u1', playerLabel: 'Alex', identityPageId: 'char-a' },
        { userId: 'u2', playerLabel: 'Sam', identityPageId: 'char-b' },
        { userId: 'u3', playerLabel: 'Jordan', identityPageId: null },
      ],
      flatPages,
      wikiTreePages,
      campaignNow,
      isDMUser: true,
      canViewCharacter: () => true,
    });

    assert.equal(projection.members.length, 1);
    assert.equal(projection.members[0]!.characterId, 'char-b');
    assert.ok(projection.spotlight);
    assert.equal(projection.spotlight!.member.characterId, 'char-a');
    assert.equal(projection.spotlight!.quote, 'I did not flee.');
    assert.equal(projection.unmappedMemberCount, 0);
    assert.equal(projection.pursuits.length, 1);
    assert.equal(projection.pursuits[0]!.title, 'The Hollow Crown');
    assert.match(projection.members[0]!.cardIdentityLine, /Scout/);
    assert.equal(projection.members[0]!.partyRoleLabel, 'Player Character');
  });

  it('resolves featured quest pursuits only', () => {
    const pursuits = resolvePartyQuestPursuits(['quest-1', 'missing'], flatPages);
    assert.equal(pursuits.length, 1);
    assert.equal(pursuits[0]!.statusLabel, 'Active');
  });

  it('finds shared affiliations across roster', () => {
    const config = {
      ...getDefaultEnsembleConfig(),
      tensionNotes: ['Alden distrusts Seraphine'],
    };

    const projection = buildPartyProjection({
      config,
      rosterMembers: [
        { userId: 'u1', playerLabel: 'Alex', identityPageId: 'char-a' },
        { userId: 'u2', playerLabel: 'Sam', identityPageId: 'char-b' },
      ],
      flatPages,
      wikiTreePages,
      campaignNow,
      isDMUser: true,
      canViewCharacter: () => true,
    });

    assert.ok(
      projection.dynamics.sharedConnections.some(
        (row) => row.label === 'Sapphire Order' && row.memberCount >= 2,
      ),
    );
    assert.deepEqual(projection.dynamics.tensionNotes, ['Alden distrusts Seraphine']);
  });

  it('includes active companions without player identity mapping', () => {
    const companionMeta = wikiTreePages[2]!.metadata;
    const projection = buildPartyProjection({
      config: getDefaultEnsembleConfig(),
      rosterMembers: [{ userId: 'u3', playerLabel: 'Jordan', identityPageId: null }],
      flatPages: [
        {
          id: 'char-c',
          title: 'Mira Vale',
          templateType: 'DEFAULT',
          metadata: companionMeta,
        },
      ],
      wikiTreePages: [wikiTreePages[2]!],
      campaignNow,
      isDMUser: true,
      canViewCharacter: () => true,
    });

    assert.equal(projection.members.length, 1);
    assert.equal(projection.members[0]!.characterId, 'char-c');
    assert.equal(projection.members[0]!.identity.displayName, 'Mira Vale');
    assert.equal(projection.members[0]!.partyRoleLabel, 'Companion');
    assert.equal(projection.unmappedMemberCount, 0);
  });

  it('excludes characters without active party participation', () => {
    const projection = buildPartyProjection({
      config: getDefaultEnsembleConfig(),
      rosterMembers: [
        { userId: 'u1', playerLabel: 'Alex', identityPageId: 'char-default' },
      ],
      flatPages: [
        {
          id: 'char-default',
          title: 'Pella Brightquill',
          templateType: 'DEFAULT',
          metadata: {
            entityCategory: 'characters',
            title: 'Delver',
            pronouns: 'she/her',
          },
        },
      ],
      wikiTreePages: [
        {
          id: 'char-default',
          parentId: null,
          title: 'Pella Brightquill',
          templateType: 'DEFAULT',
          metadata: {
            entityCategory: 'characters',
            title: 'Delver',
            pronouns: 'she/her',
          },
        },
      ],
      campaignNow,
      isDMUser: true,
      canViewCharacter: () => true,
    });

    assert.equal(projection.members.length, 0);
  });

  it('counts unmapped player characters without linked campaign member', () => {
    const projection = buildPartyProjection({
      config: getDefaultEnsembleConfig(),
      rosterMembers: [],
      flatPages,
      wikiTreePages,
      campaignNow,
      isDMUser: true,
      canViewCharacter: () => true,
    });

    assert.equal(projection.members.length, 2);
    assert.equal(projection.unmappedMemberCount, 2);
  });

  it('resolves random spotlight when a visit character id is provided', () => {
    const config = {
      ...getDefaultEnsembleConfig(),
      spotlightCharacterId: ENSEMBLE_SPOTLIGHT_RANDOM,
      spotlightQuote: 'Fortune favors us.',
    };

    const projection = buildPartyProjection({
      config,
      rosterMembers: [
        { userId: 'u1', playerLabel: 'Alex', identityPageId: 'char-a' },
        { userId: 'u2', playerLabel: 'Sam', identityPageId: 'char-b' },
      ],
      flatPages,
      wikiTreePages,
      campaignNow,
      isDMUser: true,
      canViewCharacter: () => true,
      resolvedSpotlightCharacterId: 'char-b',
    });

    assert.ok(projection.spotlight);
    assert.equal(projection.spotlight!.member.characterId, 'char-b');
    assert.equal(projection.spotlight!.quote, 'Fortune favors us.');
    assert.equal(projection.members.length, 1);
    assert.equal(projection.members[0]!.characterId, 'char-a');
  });

  it('omits spotlight when random mode has no resolved visit character', () => {
    const projection = buildPartyProjection({
      config: {
        ...getDefaultEnsembleConfig(),
        spotlightCharacterId: ENSEMBLE_SPOTLIGHT_RANDOM,
      },
      rosterMembers: [
        { userId: 'u1', playerLabel: 'Alex', identityPageId: 'char-a' },
        { userId: 'u2', playerLabel: 'Sam', identityPageId: 'char-b' },
      ],
      flatPages,
      wikiTreePages,
      campaignNow,
      isDMUser: true,
      canViewCharacter: () => true,
    });

    assert.equal(projection.spotlight, null);
    assert.equal(projection.members.length, 2);
  });

  it('sorts roster by party role before member order', () => {
    const projection = buildPartyProjection({
      config: {
        ...getDefaultEnsembleConfig(),
        memberOrder: ['char-c', 'char-a', 'char-b'],
      },
      rosterMembers: [],
      flatPages: [
        ...flatPages,
        {
          id: 'char-c',
          title: 'Mira Vale',
          templateType: 'DEFAULT',
          metadata: wikiTreePages[2]!.metadata,
        },
      ],
      wikiTreePages,
      campaignNow,
      isDMUser: true,
      canViewCharacter: () => true,
    });

    assert.deepEqual(
      projection.members.map((m) => m.characterId),
      ['char-a', 'char-b', 'char-c'],
    );
  });
});
