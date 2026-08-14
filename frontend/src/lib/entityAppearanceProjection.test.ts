import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  listAppearancePresentations,
  projectAppearanceDetails,
  projectAppearanceForms,
  projectAppearancePresentation,
  projectEntityAppearance,
  resolveAlternateGalleryEntries,
  resolvePrimaryGalleryPortrait,
  shouldShowPresentationSelector,
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

  it('resolveAlternateGalleryEntries excludes default presentation', () => {
    const primary = {
      id: 'primary',
      label: 'Human',
      imageUrl: 'https://example.com/human.jpg',
      tags: [],
      isPrimary: true,
    };
    const fox = {
      id: 'fox',
      label: 'Fox',
      imageUrl: 'https://example.com/fox.jpg',
      tags: [],
    };
    const alternates = resolveAlternateGalleryEntries([primary, fox], primary);
    assert.equal(alternates.length, 1);
    assert.equal(alternates[0]?.id, 'fox');
  });

  const kitsuneForms = {
    entries: [
      {
        id: 'human',
        label: 'Human',
        imageUrl: 'https://example.com/human.jpg',
        imageCredit: null,
        tags: ['calm'],
        isPrimary: true,
        presentationNotes: 'Usually in town clothes.',
        timelinePin: null,
      },
      {
        id: 'hybrid',
        label: 'Hybrid',
        imageUrl: 'https://example.com/hybrid.jpg',
        imageCredit: null,
        tags: ['glowing'],
        presentationNotes: 'Ears and tail visible.',
        timelinePin: null,
      },
      {
        id: 'fox',
        label: 'Fox',
        imageUrl: 'https://example.com/fox.jpg',
        imageCredit: null,
        tags: ['wild'],
        presentationNotes: 'Full fox shape.',
        timelinePin: null,
      },
    ],
    primaryEntry: null as import('@shared/appearanceMetadata').AppearanceGalleryEntry | null,
    hasContent: true,
  };

  const kitsuneAppearance = {
    summary: 'A wandering kitsune.',
    tags: ['mysterious'],
    portraitUrl: 'https://example.com/legacy.jpg',
    portraitCredit: null,
    pronouns: 'she/her',
    gender: 'Woman',
    presentation: 'Feminine',
  };

  it('listAppearancePresentations uses author labels', () => {
    const forms = projectAppearanceForms(
      {
        appearance: {
          gallery: { entries: kitsuneForms.entries },
        },
      },
      'character',
    );
    const options = listAppearancePresentations(forms);
    assert.deepEqual(
      options.map((o) => o.label),
      ['Human', 'Hybrid', 'Fox'],
    );
    assert.equal(shouldShowPresentationSelector(forms, true), true);
  });

  it('projectAppearancePresentation baseline keeps entity details and summary', () => {
    const details = projectAppearanceDetails(
      {
        appearance: {
          build: 'Slender',
          apparelDescription: 'Silk robes',
        },
      },
      'character',
    );
    const forms = projectAppearanceForms(
      {
        appearance: {
          gallery: { entries: kitsuneForms.entries },
        },
      },
      'character',
    );

    const vm = projectAppearancePresentation({
      appearance: kitsuneAppearance,
      forms,
      details,
      selectedEntryId: 'human',
    });

    assert.equal(vm.isBaseline, true);
    assert.equal(vm.portraitUrl, 'https://example.com/human.jpg');
    assert.equal(vm.details?.build, 'Slender');
    assert.equal(vm.description, 'A wandering kitsune.\n\nUsually in town clothes.');
    assert.deepEqual(vm.tags, ['mysterious', 'calm']);
    assert.equal(vm.gender, 'Woman');
  });

  it('projectAppearancePresentation non-baseline suppresses entity inheritance', () => {
    const details = projectAppearanceDetails(
      {
        appearance: {
          build: 'Slender',
          apparelDescription: 'Silk robes',
        },
      },
      'character',
    );
    const forms = projectAppearanceForms(
      {
        appearance: {
          gallery: { entries: kitsuneForms.entries },
        },
      },
      'character',
    );

    const vm = projectAppearancePresentation({
      appearance: kitsuneAppearance,
      forms,
      details,
      selectedEntryId: 'fox',
    });

    assert.equal(vm.isBaseline, false);
    assert.equal(vm.portraitUrl, 'https://example.com/fox.jpg');
    assert.equal(vm.details, null);
    assert.equal(vm.description, 'Full fox shape.');
    assert.deepEqual(vm.tags, ['wild']);
    assert.equal(vm.gender, null);
    assert.equal(vm.presentation, null);
  });

  it('projectAppearancePresentation legacy single entry is baseline', () => {
    const legacyOnly = {
      appearance: { portraitUrl: 'https://legacy.jpg', summary: 'Only one look.' },
    };
    const appearance = projectEntityAppearance(legacyOnly, 'character');
    const forms = projectAppearanceForms(legacyOnly, 'character');
    const vm = projectAppearancePresentation({ appearance, forms });

    assert.equal(vm.isBaseline, true);
    assert.equal(shouldShowPresentationSelector(forms, true), false);
    assert.equal(vm.description, 'Only one look.');
  });
});
