import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { buildFamilyIdentityProjection } from './familyIdentityProjection.ts';

describe('buildFamilyIdentityProjection', () => {
  it('builds dynasty identity line', () => {
    const projection = buildFamilyIdentityProjection('f1', [
      {
        id: 'f1',
        title: 'House Sterling',
        templateType: 'FAMILY',
        metadata: {
          familyType: 'Noble house',
          region: 'Rivendale',
          status: 'Active',
        },
      },
    ]);

    assert.equal(projection?.displayName, 'House Sterling');
    assert.equal(projection?.identityLine, 'Noble house • Rivendale • Active');
  });
});
