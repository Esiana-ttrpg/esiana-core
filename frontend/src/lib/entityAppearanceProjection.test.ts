import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  projectAppearanceDetails,
  projectAppearanceForms,
  projectEntityAppearance,
  resolvePrimaryGalleryPortrait,
} from './entityAppearanceProjection';

describe('entityAppearanceProjection', () => {
  const characterMeta = {
    appearance: {
      summary: 'A wandering knight',
      portraitUrl: 'https://example.com/hero.jpg',
      appearanceTags: ['stern'],
      build: 'Lean',
      voice: 'Soft',
      gallery: {
        entries: [
          {
            id: 'g1',
            label: 'Armored',
            imageUrl: 'https://example.com/armor.jpg',
            tags: ['battle-worn'],
            presentationType: 'ceremonial',
            isPrimary: true,
          },
        ],
      },
    },
  };

  it('projectEntityAppearance uses primary gallery portrait', () => {
    const vm = projectEntityAppearance(characterMeta, 'character');
    assert.equal(vm.portraitUrl, 'https://example.com/armor.jpg');
    assert.equal(vm.summary, 'A wandering knight');
  });

  it('projectAppearanceForms synthesizes legacy portrait', () => {
    const legacyOnly = {
      appearance: { portraitUrl: 'https://legacy.jpg', portraitCredit: null },
    };
    const forms = projectAppearanceForms(legacyOnly, 'character');
    assert.equal(forms.entries.length, 1);
    assert.equal(forms.entries[0]?.id, '__legacy_portrait__');
    assert.equal(forms.hasContent, true);
  });

  it('projectAppearanceDetails maps apparelDescription to clothingMotifs', () => {
    const meta = {
      appearance: {
        apparelDescription: 'Gold-threaded gloves',
        distinguishingFeatures: ['Scar'],
      },
    };
    const details = projectAppearanceDetails(meta, 'character');
    assert.equal(details.clothingMotifs, 'Gold-threaded gloves');
    assert.deepEqual(details.distinguishingFeatures, ['Scar']);
    assert.equal(details.hasContent, true);
  });

  it('resolvePrimaryGalleryPortrait falls back to legacy', () => {
    const portrait = resolvePrimaryGalleryPortrait(
      { entries: [] },
      'https://legacy.jpg',
      null,
    );
    assert.equal(portrait.portraitUrl, 'https://legacy.jpg');
  });
});
