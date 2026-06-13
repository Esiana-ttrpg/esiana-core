import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  mergeCharacterMetadata,
  parseCharacterMetadata,
  resolveCharacterStatus,
  resolvePrimaryAffiliationId,
  type CharacterIdentityFields,
} from './characterMetadata.ts';
import { parseCharacterLineageMetadata } from './characterLineageMetadata.ts';

describe('characterMetadata', () => {
  it('parses legacy quickInfo into typed fields', () => {
    const parsed = parseCharacterMetadata({
      firstName: 'Snaks',
      quickInfo: [
        { key: 'Profession', value: 'Scout' },
        { key: 'Pronouns', value: 'they/them' },
        { key: 'Known For', value: 'Night watch veteran' },
      ],
    });

    assert.equal(parsed.profession, 'Scout');
    assert.equal(parsed.appearance.pronouns, 'they/them');
    assert.equal(parsed.knownFor, 'Night watch veteran');
  });

  it('migrates legacy top-level gender and pronouns into appearance', () => {
    const parsed = parseCharacterMetadata({
      pronouns: 'she/her',
      gender: 'woman',
    });

    assert.equal(parsed.appearance.pronouns, 'she/her');
    assert.equal(parsed.appearance.gender, 'woman');
  });

  it('writes expressive identity under appearance and clears legacy top-level keys', () => {
    const merged = mergeCharacterMetadata(
      { pronouns: 'they/them', gender: 'nonbinary' },
      {
        appearance: {
          pronouns: 'she/they',
          gender: 'nonbinary',
          presentation: 'femme',
        },
      },
    );

    assert.equal(
      (merged.appearance as { pronouns?: string }).pronouns,
      'she/they',
    );
    assert.equal(
      (merged.appearance as { presentation?: string }).presentation,
      'femme',
    );
    assert.equal(merged.pronouns, undefined);
    assert.equal(merged.gender, undefined);
  });

  it('maps legacy top-level patch keys into appearance', () => {
    const merged = mergeCharacterMetadata(
      {},
      { pronouns: 'xe/xem' } as Record<string, unknown> as Partial<CharacterIdentityFields>,
    );

    assert.equal(
      (merged.appearance as { pronouns?: string }).pronouns,
      'xe/xem',
    );
  });

  it('merges patches and syncs index columns', () => {
    const merged = mergeCharacterMetadata(
      {
        firstName: 'Alden',
        familyId: 'fam-1',
        orgAffiliations: [{ id: 'a1', orgId: 'org-1', role: null, startDate: null, endDate: null, visibility: 'PUBLIC' }],
      },
      {
        title: 'Heir Apparent',
        profession: 'Noble',
        knownFor: 'Exiled heir',
        primaryAffiliationId: 'org-1',
        currentLocationId: 'loc-1',
        status: 'EXILED',
      },
      {
        resolvePageTitle: (id) =>
          id === 'org-1'
            ? 'Imperial Court'
            : id === 'fam-1'
              ? 'House Sterling'
              : id === 'loc-1'
                ? 'Crown District'
                : null,
      },
    );

    const quickInfo = (merged.quickInfo as Array<{ key: string; value: string }>) ?? [];
    const map = new Map(quickInfo.map((f) => [f.key, f.value]));
    assert.equal(map.get('Role'), 'Heir Apparent');
    assert.equal(map.get('Affiliation'), 'Imperial Court');
    assert.equal(map.get('Family'), 'House Sterling');
    assert.equal(map.get('Status'), 'Exiled');
    assert.equal(map.get('Location'), 'Crown District');
    assert.equal(map.get('Known For'), 'Exiled heir');
  });

  it('parses appearance gallery and forms fields', () => {
    const parsed = parseCharacterMetadata({
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

    assert.equal(parsed.appearance.gallery.entries.length, 1);
    assert.equal(parsed.appearance.gallery.entries[0]?.presentationType, 'transformation');
    assert.equal(parsed.appearance.voice, 'Bright');
    assert.deepEqual(parsed.appearance.visibleInjuries, ['Scarred hand']);
  });

  it('infers deceased status from death date', () => {
    const identity = parseCharacterMetadata({});
    const lineage = parseCharacterLineageMetadata({
      deathDate: { year: 400, month: null, day: null },
    });
    assert.equal(resolveCharacterStatus(identity, lineage), 'DECEASED');
  });

  it('falls back to first active affiliation', () => {
    const identity = parseCharacterMetadata({});
    const lineage = parseCharacterLineageMetadata({
      orgAffiliations: [
        {
          id: 'a1',
          orgId: 'org-sapphire',
          role: 'Scout',
          startDate: { year: 390, month: null, day: null },
          endDate: null,
          visibility: 'PUBLIC',
        },
      ],
    });
    assert.equal(
      resolvePrimaryAffiliationId(identity, lineage, {
        year: 400,
        month: null,
        day: null,
      }),
      'org-sapphire',
    );
  });
});
