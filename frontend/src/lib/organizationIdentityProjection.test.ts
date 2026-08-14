import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { buildOrganizationIdentityProjection } from './organizationIdentityProjection.ts';

describe('buildOrganizationIdentityProjection', () => {
  it('builds faction presence line', () => {
    const projection = buildOrganizationIdentityProjection('o1', [
      {
        id: 'o1',
        title: 'The Sapphire Order',
        templateType: 'DEFAULT',
        metadata: {
          orgType: 'Knightly intelligence network',
          motivation: 'Operating from Rivendale',
          headquartersId: 'loc1',
        },
      },
      {
        id: 'loc1',
        title: 'Rivendale',
        templateType: 'DEFAULT',
        metadata: {},
      },
    ]);

    assert.equal(projection?.displayName, 'The Sapphire Order');
    assert.ok(projection?.identityLine.includes('Knightly intelligence network'));
    assert.ok(projection?.identityLine.includes('Rivendale'));
  });
});
