/**
 * Pure unit tests for portfolio filter derivation and public projection.
 */
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  buildPublicPortfolioProjection,
  derivePortfolioFilter,
  emptyAdventureSnapshot,
} from './portfolioCharacter.js';

describe('derivePortfolioFilter', () => {
  it('returns UNASSIGNED when there are no adventures', () => {
    assert.equal(derivePortfolioFilter([]), 'UNASSIGNED');
  });

  it('returns ACTIVE when any adventure is CURRENT', () => {
    assert.equal(
      derivePortfolioFilter([{ status: 'CURRENT' }, { status: 'PAST' }]),
      'ACTIVE',
    );
  });

  it('returns PAST when only historical adventures exist (between campaigns)', () => {
    assert.equal(
      derivePortfolioFilter([{ status: 'PAST' }, { status: 'DETACHED' }]),
      'PAST',
    );
  });
});

describe('buildPublicPortfolioProjection', () => {
  const base = {
    id: 'pc-1',
    userId: 'user-1',
    name: 'Belle',
    tagline: 'The Bookish Adventurer',
    roleLabel: 'Wizard',
    levelLabel: '7',
    biography: 'A quiet scholar with a curious heart.',
    isShowcased: true,
    metadata: {
      ancestry: 'Human',
      appearance: { pronouns: 'she/her', summary: 'Soft eyes, ink-stained fingers.' },
    },
    portraitUrl: null as string | null,
    currentAdventure: null as null | {
      snapshot: ReturnType<typeof emptyAdventureSnapshot>;
      campaignLinkable: boolean;
    },
  };

  it('returns null when not showcased and requireShowcased', () => {
    assert.equal(
      buildPublicPortfolioProjection({ ...base, isShowcased: false }),
      null,
    );
  });

  it('omits campaign title when not linkable', () => {
    const proj = buildPublicPortfolioProjection({
      ...base,
      currentAdventure: {
        snapshot: emptyAdventureSnapshot({
          campaignTitle: 'Secret Campaign',
          campaignHandle: 'secret',
        }),
        campaignLinkable: false,
      },
    });
    assert.ok(proj);
    assert.equal(proj!.adventureBlurb?.campaignTitle, null);
    assert.equal(proj!.adventureBlurb?.genericLabel, 'Currently adventuring');
    assert.equal(proj!.adventureBlurb?.currentlyAdventuring, true);
  });

  it('includes campaign title when linkable', () => {
    const proj = buildPublicPortfolioProjection({
      ...base,
      currentAdventure: {
        snapshot: emptyAdventureSnapshot({
          campaignTitle: 'Curse of Strahd',
          campaignHandle: 'strahd',
        }),
        campaignLinkable: true,
      },
    });
    assert.ok(proj);
    assert.equal(proj!.adventureBlurb?.campaignTitle, 'Curse of Strahd');
    assert.equal(proj!.adventureBlurb?.campaignHandle, 'strahd');
  });

  it('allowlists public fields only', () => {
    const proj = buildPublicPortfolioProjection(base);
    assert.ok(proj);
    assert.equal(proj!.name, 'Belle');
    assert.equal(proj!.pronouns, 'she/her');
    assert.equal(proj!.ancestry, 'Human');
    assert.equal(proj!.appearanceSummary, 'Soft eyes, ink-stained fingers.');
    assert.equal(
      Object.prototype.hasOwnProperty.call(proj, 'metadata'),
      false,
    );
    assert.equal(
      Object.prototype.hasOwnProperty.call(proj, 'biography'),
      false,
    );
  });
});
