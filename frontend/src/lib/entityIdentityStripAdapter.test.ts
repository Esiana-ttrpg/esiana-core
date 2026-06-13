import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { campaignWikiPath } from './campaignPaths.ts';
import {
  adaptCharacterIdentityStrip,
  adaptCodexEntityIdentityStrip,
  adaptOrganizationIdentityStrip,
} from './entityIdentityStripAdapter.ts';
import type { CharacterIdentityProjection } from './characterIdentityProjection.ts';

const CHARACTER_PROJECTION: CharacterIdentityProjection = {
  displayName: 'Mario',
  pronouns: 'he/him',
  roleSubtitle: 'Plumber',
  identityLine: 'Kingdom of Nuln • House Mario • Active',
  overflowSegments: ['Scout'],
  knownFor: 'Jumping',
  activeArc: 'Rescue the princess',
  motivation: 'Protect the kingdom',
  status: 'ACTIVE',
  statusLabel: 'Active',
  affiliationTitle: 'Kingdom of Nuln',
  affiliationId: 'org-1',
  familyTitle: null,
  familyId: null,
  ancestry: 'Human',
  locationLabel: null,
  locationId: null,
  appearanceSummary: null,
  appearanceTags: [],
  portraitUrl: null,
  temporalBadges: [],
  lifeStatusVariant: 'ACTIVE',
};

const FLAT_PAGES = [
  { id: 'org-1', pathKey: 'kingdom-of-nuln', workspace: 'ORGANIZATIONS' },
  { id: 'loc-hq', pathKey: 'nuln', workspace: 'LOCATIONS' },
];

describe('entityIdentityStripAdapter', () => {
  it('adapts character projection with overflow segments', () => {
    const vm = adaptCharacterIdentityStrip(
      CHARACTER_PROJECTION,
      'test-campaign',
      FLAT_PAGES,
    );
    assert.equal(vm.title, 'Mario');
    assert.equal(vm.pronounSuffix, 'he/him');
    assert.equal(vm.overflowChipLabels.length, 1);
    assert.equal(
      vm.chips[0]?.href,
      campaignWikiPath('test-campaign', 'org-1', FLAT_PAGES),
    );
  });

  it('links organization headquarters chip to location', () => {
    const vm = adaptOrganizationIdentityStrip(
      {
        displayName: 'Kingdom of Nuln',
        subtitle: null,
        identityLine: 'Nation • Expansion • Nuln',
        knownFor: null,
        emblemUrl: null,
      },
      'test-campaign',
      'loc-hq',
      FLAT_PAGES,
    );
    assert.equal(
      vm.chips.at(-1)?.href,
      campaignWikiPath('test-campaign', 'loc-hq', FLAT_PAGES),
    );
  });

  it('adapts pass-2 codex projections', () => {
    const vm = adaptCodexEntityIdentityStrip(
      {
        displayName: 'Rusty Sword',
        identityLine: 'Weapon • Invested',
        knownFor: 'Legendary',
        portraitUrl: null,
      },
      'object',
    );
    assert.equal(vm.editFieldKey, 'objectType');
    assert.equal(vm.chips.length, 2);
  });
});
