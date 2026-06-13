import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { buildAncestryIdentityProjection } from './ancestryIdentityProjection.ts';
import { buildObjectIdentityProjection } from './objectIdentityProjection.ts';
import { buildLocationIdentityProjection } from './locationIdentityProjection.ts';
import { buildRuleResourceIdentityProjection } from './ruleResourceIdentityProjection.ts';
import {
  resolveSurfaceProfileKey,
} from './entitySurfaceProfile.ts';
import type { WikiTreeNode } from '@/types/wiki';

describe('pass2 identity projections', () => {
  it('builds ancestry identity line from type and homeland', () => {
    const projection = buildAncestryIdentityProjection('a1', [
      {
        id: 'a1',
        title: 'Sun Elves',
        templateType: 'DEFAULT',
        metadata: {
          entityCategory: 'ancestries',
          ancestryType: 'Elven',
          homeland: 'Silverwood',
          knownFor: 'Ancient magic',
        },
      },
    ]);
    assert.equal(projection?.identityLine, 'Elven • Silverwood');
    assert.equal(projection?.knownFor, 'Ancient magic');
  });

  it('builds object identity line from type and invested flag', () => {
    const projection = buildObjectIdentityProjection('o1', [
      {
        id: 'o1',
        title: 'Sunblade',
        templateType: 'DEFAULT',
        metadata: {
          objectType: 'Sword',
          investedOrMagical: 'Invested',
        },
      },
    ]);
    assert.equal(projection?.identityLine, 'Sword • Invested');
  });

  it('builds location identity line from type and region', () => {
    const projection = buildLocationIdentityProjection('l1', [
      {
        id: 'l1',
        title: 'Port Azure',
        templateType: 'LOCATION',
        metadata: { locationType: 'City', region: 'Coast' },
      },
    ]);
    assert.equal(projection?.identityLine, 'City • Coast');
  });

  it('builds rules/resources identity from type and scope', () => {
    const projection = buildRuleResourceIdentityProjection('r1', [
      {
        id: 'r1',
        title: 'Combat Actions',
        templateType: 'DEFAULT',
        metadata: {
          resourceType: 'Rule',
          scope: 'Core',
          summary: 'Standard action economy',
        },
      },
    ]);
    assert.equal(projection?.identityLine, 'Rule • Core');
    assert.equal(projection?.knownFor, 'Standard action economy');
  });
});

describe('resolveSurfaceProfileKey pass2', () => {
  const flatPages = [
    {
      id: 'loc-root',
      title: 'Locations',
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
      id: 'loc-1',
      title: 'Port Azure',
      parentId: 'loc-root',
      templateType: 'LOCATION',
      metadata: { entityCategory: 'locations' },
      campaignId: 'c1',
      visibility: 'Party',
      featuredImageId: null,
      children: [],
      createdAt: '',
      updatedAt: '',
    },
  ] as WikiTreeNode[];

  it('resolves location from template type and category folder', () => {
    assert.equal(
      resolveSurfaceProfileKey({
        pageId: 'loc-1',
        templateType: 'LOCATION',
        metadata: { entityCategory: 'locations' },
        flatPages,
      }),
      'location',
    );
  });

  it('resolves rules-resources from entityCategory', () => {
    assert.equal(
      resolveSurfaceProfileKey({
        pageId: 'rule-1',
        templateType: 'DEFAULT',
        metadata: { entityCategory: 'rules-resources' },
        flatPages: [],
      }),
      'rule-resource',
    );
  });
});
