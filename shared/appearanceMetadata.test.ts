import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  enforceSinglePrimaryInEditor,
  normalizeAppearanceGallery,
  normalizePresentationType,
  resolvePrimaryGalleryEntry,
  resolveGalleryEntriesWithLegacy,
  synthesizeLegacyGalleryEntry,
} from './appearanceMetadata.js';

describe('appearanceMetadata', () => {
  it('normalizes gallery entries with presentationType and isPrimary', () => {
    const gallery = normalizeAppearanceGallery({
      entries: [
        {
          id: 'a1',
          label: 'Civilian',
          imageUrl: 'https://example.com/a.jpg',
          tags: ['formal'],
          presentationType: 'private',
          isPrimary: true,
        },
        {
          id: 'a2',
          label: 'Vigilante',
          imageUrl: 'https://example.com/b.jpg',
          presentationType: 'public',
          isPrimary: true,
        },
      ],
    });
    assert.equal(gallery.entries.length, 2);
    assert.equal(gallery.entries[0]?.presentationType, 'private');
    assert.equal(gallery.entries[0]?.isPrimary, true);
    assert.equal(gallery.entries[1]?.isPrimary, true);
  });

  it('rejects invalid presentationType', () => {
    assert.equal(normalizePresentationType('illusion'), undefined);
    assert.equal(normalizePresentationType('disguise'), 'disguise');
  });

  it('resolvePrimaryGalleryEntry prefers context presentationType', () => {
    const entries = normalizeAppearanceGallery({
      entries: [
        {
          id: '1',
          label: 'Civilian',
          imageUrl: 'https://x/a.jpg',
          isPrimary: true,
          presentationType: 'private',
        },
        {
          id: '2',
          label: 'Mask',
          imageUrl: 'https://x/b.jpg',
          isPrimary: true,
          presentationType: 'public',
        },
      ],
    }).entries;

    const publicEntry = resolvePrimaryGalleryEntry(entries, { presentationType: 'public' });
    assert.equal(publicEntry?.label, 'Mask');

    const fallback = resolvePrimaryGalleryEntry(entries);
    assert.equal(fallback?.label, 'Civilian');
  });

  it('synthesizes legacy portrait when gallery empty', () => {
    const entries = resolveGalleryEntriesWithLegacy(
      { entries: [] },
      'https://legacy.jpg',
      null,
    );
    assert.equal(entries.length, 1);
    assert.equal(entries[0]?.id, '__legacy_portrait__');
    assert.equal(entries[0]?.isPrimary, true);
  });

  it('enforceSinglePrimaryInEditor clears other primaries', () => {
    const entries = [
      synthesizeLegacyGalleryEntry('https://a.jpg', null, 'A'),
      { ...synthesizeLegacyGalleryEntry('https://b.jpg', null, 'B'), id: 'b' },
    ];
    entries[1]!.isPrimary = true;
    const next = enforceSinglePrimaryInEditor(entries, 'b');
    assert.equal(next.find((e) => e.id === 'a')?.isPrimary, undefined);
    assert.equal(next.find((e) => e.id === 'b')?.isPrimary, true);
  });

  it('reads presentationNotes with legacy notes fallback', () => {
    const gallery = normalizeAppearanceGallery({
      entries: [
        {
          id: 'n1',
          label: 'Corrupted',
          imageUrl: 'https://example.com/c.jpg',
          notes: 'Her voice becomes resonant.',
        },
      ],
    });
    assert.equal(gallery.entries[0]?.presentationNotes, 'Her voice becomes resonant.');
  });

  it('keeps draft forms without a portrait URL', () => {
    const gallery = normalizeAppearanceGallery({
      entries: [
        {
          id: 'draft-1',
          label: 'Moon Prism Form',
          imageUrl: '',
        },
      ],
    });
    assert.equal(gallery.entries.length, 1);
    assert.equal(gallery.entries[0]?.label, 'Moon Prism Form');
    assert.equal(gallery.entries[0]?.imageUrl, '');
  });

  it('accepts corrupted presentationType', () => {
    const gallery = normalizeAppearanceGallery({
      entries: [
        {
          id: 'c1',
          label: 'Twisted aspect',
          imageUrl: 'https://example.com/twisted.jpg',
          presentationType: 'corrupted',
        },
      ],
    });
    assert.equal(gallery.entries[0]?.presentationType, 'corrupted');
  });

  it('normalizes presentation entry overlay fields', () => {
    const gallery = normalizeAppearanceGallery({
      entries: [
        {
          id: 'fox',
          label: 'Fox form',
          imageUrl: 'https://example.com/fox.jpg',
          presentationNotes: 'Low and feral.',
          distinguishingFeatures: ['nine tails', 'ember eyes'],
          voice: 'Growling undertone',
          presence: 'Predatory stillness',
          clothingMotifs: 'None — natural fur',
          authorNotes: 'Table note: only at full moon',
          gender: 'they/them in this form',
          presentation: 'feral kitsune',
        },
      ],
    });
    const entry = gallery.entries[0];
    assert.equal(entry?.presentationNotes, 'Low and feral.');
    assert.deepEqual(entry?.distinguishingFeatures, ['nine tails', 'ember eyes']);
    assert.equal(entry?.voice, 'Growling undertone');
    assert.equal(entry?.presence, 'Predatory stillness');
    assert.equal(entry?.clothingMotifs, 'None — natural fur');
    assert.equal(entry?.authorNotes, 'Table note: only at full moon');
    assert.equal(entry?.gender, 'they/them in this form');
    assert.equal(entry?.presentation, 'feral kitsune');
  });

  it('keeps authorNotes separate from legacy notes mapped to presentationNotes', () => {
    const gallery = normalizeAppearanceGallery({
      entries: [
        {
          id: 'd1',
          label: 'Disguise',
          imageUrl: 'https://example.com/d.jpg',
          notes: 'Legacy description prose',
          authorNotes: 'Author-only reminder',
        },
      ],
    });
    assert.equal(gallery.entries[0]?.presentationNotes, 'Legacy description prose');
    assert.equal(gallery.entries[0]?.authorNotes, 'Author-only reminder');
  });

  it('preserves timelinePin on normalize', () => {
    const gallery = normalizeAppearanceGallery({
      entries: [
        {
          id: 't1',
          label: 'Era look',
          imageUrl: 'https://example.com/e.jpg',
          timelinePin: 'epoch-3-session-12',
        },
      ],
    });
    assert.equal(gallery.entries[0]?.timelinePin, 'epoch-3-session-12');
  });
});
