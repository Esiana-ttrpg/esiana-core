import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { mergeCharacterMetadata, parseCharacterMetadata } from './characterMetadata.ts';

describe('characterMetadata', () => {
  it('merges patches and syncs index columns', () => {
    const merged = mergeCharacterMetadata(
      { firstName: 'Snaks' },
      { profession: 'Scout', knownFor: 'Night watch' },
      { resolvePageTitle: () => null },
    );

    const quickInfo = (merged.quickInfo as Array<{ key: string; value: string }>) ?? [];
    const map = new Map(quickInfo.map((f) => [f.key, f.value]));
    assert.equal(map.get('Role'), 'Scout');
    assert.equal(map.get('Known For'), 'Night watch');
  });

  it('parses appearance gallery and forms fields', () => {
    const identity = parseCharacterMetadata({
      appearance: {
        gallery: {
          entries: [
            {
              id: 'v1',
              label: 'Moon Form',
              imageUrl: 'https://example.com/moon.jpg',
              presentationType: 'transformation',
              isPrimary: true,
            },
          ],
        },
        voice: 'Bright',
        visibleInjuries: ['Scarred hand'],
        atAGlance: 'Tall silhouette',
        apparelDescription: 'Silk robes',
      },
    });

    assert.equal(identity.appearance.gallery.entries.length, 1);
    assert.equal(identity.appearance.gallery.entries[0]?.presentationType, 'transformation');
    assert.equal(identity.appearance.voice, 'Bright');
    assert.deepEqual(identity.appearance.visibleInjuries, ['Scarred hand']);
    assert.equal(identity.appearance.atAGlance, 'Tall silhouette');
    assert.equal(identity.appearance.apparelDescription, 'Silk robes');
  });

  it('parses and merges party participation metadata', () => {
    const identity = parseCharacterMetadata({
      partyParticipation: { active: true, role: 'COMPANION' },
    });
    assert.equal(identity.partyParticipation.active, true);
    assert.equal(identity.partyParticipation.role, 'COMPANION');

    const merged = mergeCharacterMetadata(
      {},
      { partyParticipation: { active: true, role: 'NPC_ALLY' } },
      { resolvePageTitle: () => null },
    );
    const quickInfo = (merged.quickInfo as Array<{ key: string; value: string }>) ?? [];
    const map = new Map(quickInfo.map((f) => [f.key, f.value]));
    assert.equal(map.get('Party'), 'NPC Ally');
  });
});
