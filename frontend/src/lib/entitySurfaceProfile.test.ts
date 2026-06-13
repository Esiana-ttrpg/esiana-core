import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  categoryTitleToEntityCategoryKey,
  normalizeEntityCategoryKey,
} from './entityCategoryKeys.ts';
import {
  getAppearanceCapabilities,
  getAppearanceMode,
  getSurfaceProfile,
  resolveEntitySurfaceProfile,
  resolveSurfaceProfileKey,
  supportsAppearanceDetails,
} from './entitySurfaceProfile.ts';
import type { WikiTreeNode } from '@/types/wiki';

describe('entityCategoryKeys', () => {
  it('normalizes folder titles and legacy stamps', () => {
    assert.equal(categoryTitleToEntityCategoryKey('Bestiary'), 'bestiary');
    assert.equal(normalizeEntityCategoryKey('Bestiary'), 'bestiary');
    assert.equal(normalizeEntityCategoryKey('Rules/Resources'), 'rules-resources');
  });
});

describe('resolveEntitySurfaceProfile', () => {
  const flatPages = [
    {
      id: 'bestiary-root',
      title: 'Bestiary',
      parentId: null,
      templateType: 'DEFAULT',
      metadata: {},
      campaignId: 'c1',
      visibility: 'Party',
      featuredImageId: null,
      children: [],
      createdAt: '',
      updatedAt: '',
    },
    {
      id: 'creature-1',
      title: 'Drake',
      parentId: 'bestiary-root',
      templateType: 'DEFAULT',
      metadata: { entityCategory: 'bestiary' },
      campaignId: 'c1',
      visibility: 'Party',
      featuredImageId: null,
      children: [],
      createdAt: '',
      updatedAt: '',
    },
  ] as WikiTreeNode[];

  it('resolves bestiary from normalized entityCategory', () => {
    const key = resolveSurfaceProfileKey({
      pageId: 'creature-1',
      templateType: 'DEFAULT',
      metadata: { entityCategory: 'bestiary' },
      flatPages,
    });
    assert.equal(key, 'bestiary');
    assert.equal(
      resolveEntitySurfaceProfile({
        pageId: 'creature-1',
        templateType: 'DEFAULT',
        metadata: { entityCategory: 'bestiary' },
        flatPages,
      }).typedInfobox,
      true,
    );
  });

  it('accepts legacy title-case entityCategory', () => {
    const key = resolveSurfaceProfileKey({
      pageId: 'creature-1',
      templateType: 'DEFAULT',
      metadata: { entityCategory: 'Bestiary' },
      flatPages,
    });
    assert.equal(key, 'bestiary');
  });
});

describe('appearance profile matrix', () => {
  it('assigns full appearance with forms and details to character and bestiary', () => {
    const character = getSurfaceProfile('character');
    assert.equal(getAppearanceMode(character), 'full');
    assert.equal(supportsAppearanceDetails(character), true);
    assert.equal(getAppearanceCapabilities(character).forms, true);
    assert.equal(getAppearanceCapabilities(character).details, true);
    assert.equal(getAppearanceCapabilities(character).discoveryVariants, true);

    const bestiary = getSurfaceProfile('bestiary');
    assert.equal(getAppearanceMode(bestiary), 'full');
    assert.equal(supportsAppearanceDetails(bestiary), true);
    assert.equal(getAppearanceCapabilities(bestiary).forms, true);
    assert.equal(getAppearanceCapabilities(bestiary).details, true);
  });

  it('assigns full appearance with forms only to location', () => {
    const location = getSurfaceProfile('location');
    assert.equal(getAppearanceMode(location), 'full');
    assert.equal(supportsAppearanceDetails(location), false);
    assert.equal(getAppearanceCapabilities(location).forms, true);
    assert.equal(getAppearanceCapabilities(location).details, false);
    assert.equal(getAppearanceCapabilities(location).discoveryVariants, true);
  });

  it('assigns section appearance with details only to object', () => {
    const object = getSurfaceProfile('object');
    assert.equal(getAppearanceMode(object), 'section');
    assert.equal(supportsAppearanceDetails(object), true);
    assert.equal(getAppearanceCapabilities(object).forms, false);
    assert.equal(getAppearanceCapabilities(object).details, true);
  });
});
