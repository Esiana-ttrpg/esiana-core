import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  buildBestiaryIdentityProjection,
  buildBestiaryIntelProjection,
  projectBestiaryIntelVisibility,
} from './bestiaryIdentityProjection.ts';

describe('buildBestiaryIdentityProjection', () => {
  it('composes identity line from creature type and habitat', () => {
    const projection = buildBestiaryIdentityProjection('c1', [
      {
        id: 'c1',
        title: 'Ashfang Drake',
        templateType: 'DEFAULT',
        metadata: {
          entityCategory: 'bestiary',
          creatureType: 'Elder Fire Drake',
          habitat: 'Volcanic Range',
          knownFor: 'Raiding mountain caravans',
        },
      },
    ]);

    assert.equal(projection?.displayName, 'Ashfang Drake');
    assert.equal(projection?.identityLine, 'Elder Fire Drake • Volcanic Range');
    assert.equal(projection?.knownFor, 'Raiding mountain caravans');
  });

  it('masks combat intel for partial discovery', () => {
    const mask = projectBestiaryIntelVisibility({ state: 'partial', available: true }, false);
    assert.equal(mask.weaknesses, 'hidden');
    assert.equal(mask.region, 'revealed');

    const intel = buildBestiaryIntelProjection(
      {
        region: 'Frostwilds',
        weaknesses: ['Fire'],
        resistances: ['Frost'],
      },
      { state: 'partial', available: true },
      false,
    );
    assert.equal(intel.discoveryMask.weaknesses, 'hidden');
    assert.equal(intel.region, 'Frostwilds');
  });

  it('reveals all intel for DM users', () => {
    const mask = projectBestiaryIntelVisibility({ state: 'hidden', available: false }, true);
    assert.equal(mask.weaknesses, 'revealed');
  });
});
