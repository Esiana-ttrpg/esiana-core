import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { composeIdentityLine } from './characterIdentityProjection.ts';
import { buildCharacterIdentityProjection } from './characterIdentityProjection.ts';

describe('characterIdentityProjection', () => {
  it('caps identity line at four segments', () => {
    const { visibleLine, overflowSegments } = composeIdentityLine(
      [
        { key: 'role', label: 'Scout' },
        { key: 'aff', label: 'Sapphire Order' },
        { key: 'family', label: 'House Miller' },
        { key: 'status', label: 'Alive' },
        { key: 'extra', label: 'Veteran' },
      ],
      4,
    );
    assert.equal(
      visibleLine,
      'Scout • Sapphire Order • House Miller • Alive',
    );
    assert.deepEqual(overflowSegments, ['Veteran']);
  });

  it('prefers family over ancestry in projection', () => {
    const projection = buildCharacterIdentityProjection(
      'char-1',
      [
        {
          id: 'char-1',
          title: 'Snaks Miller',
          templateType: 'CHARACTER',
          metadata: {
            firstName: 'Snaks',
            title: 'Scout',
            ancestry: 'Kobold',
            familyId: 'fam-1',
            pronouns: 'they/them',
          },
        },
        {
          id: 'fam-1',
          title: 'House Miller',
          templateType: 'FAMILY',
          metadata: {},
        },
      ],
      { year: 400, month: null, day: null },
    );

    assert.ok(projection);
    assert.equal(projection!.displayName, 'Snaks Miller');
    assert.equal(projection!.pronouns, 'they/them');
    assert.equal(projection!.roleSubtitle, 'Scout');
    assert.match(projection!.identityLine, /House Miller/);
    assert.doesNotMatch(projection!.identityLine, /Kobold/);
    assert.doesNotMatch(projection!.identityLine, /Scout/);
    assert.equal(projection!.knownFor, null);
  });
});
