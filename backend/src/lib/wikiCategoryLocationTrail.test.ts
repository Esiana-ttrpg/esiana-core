import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  buildCategoryLocationTrails,
  computeLocationAncestorTrail,
  graphFromWikiPageRows,
} from './wikiCategoryLocationTrail.js';

describe('wikiCategoryLocationTrail', () => {
  const graph = graphFromWikiPageRows([
    { id: 'world', title: 'World', parentId: null, templateType: 'DEFAULT', metadata: null },
    { id: 'characters', title: 'Characters', parentId: 'world', templateType: 'DEFAULT', metadata: null },
    { id: 'locations', title: 'Locations', parentId: 'world', templateType: 'DEFAULT', metadata: null },
    { id: 'region', title: 'Sword Coast', parentId: 'locations', templateType: 'LOCATION', metadata: null },
    { id: 'town', title: 'Greenest', parentId: 'region', templateType: 'LOCATION', metadata: null },
    { id: 'inn', title: 'Purple Dragon Inn', parentId: 'town', templateType: 'LOCATION', metadata: null },
    {
      id: 'innkeeper',
      title: 'Innkeeper',
      parentId: 'inn',
      templateType: 'CHARACTER',
      metadata: null,
    },
    { id: 'room', title: 'Back Room', parentId: 'inn', templateType: 'LOCATION', metadata: null },
  ]);

  it('returns empty trail for direct child of category folder', () => {
    const result = computeLocationAncestorTrail(
      { id: 'innkeeper', parentId: 'characters' },
      'characters',
      graph,
    );
    assert.equal(result.isCrossNested, false);
    assert.equal(result.locationAncestors.length, 0);
    assert.equal(result.locationTrailLabel, null);
  });

  it('collects location-only ancestors for NPC under inn', () => {
    const result = computeLocationAncestorTrail(
      { id: 'innkeeper', parentId: 'inn' },
      'characters',
      graph,
    );
    assert.equal(result.isCrossNested, true);
    assert.deepEqual(
      result.locationAncestors.map((node) => node.title),
      ['Sword Coast', 'Greenest', 'Purple Dragon Inn'],
    );
    assert.equal(
      result.locationTrailLabel,
      'Sword Coast › Greenest › Purple Dragon Inn',
    );
  });

  it('tiers location child up through location chain', () => {
    const result = computeLocationAncestorTrail(
      { id: 'room', parentId: 'inn' },
      'locations',
      graph,
    );
    assert.deepEqual(
      result.locationAncestors.map((node) => node.title),
      ['Sword Coast', 'Greenest', 'Purple Dragon Inn'],
    );
  });

  it('builds trails for many children', () => {
    const trails = buildCategoryLocationTrails(
      [
        { id: 'innkeeper', parentId: 'inn', title: 'Innkeeper', templateType: 'CHARACTER', metadata: null },
        { id: 'direct', parentId: 'characters', title: 'Direct', templateType: 'CHARACTER', metadata: null },
      ],
      'characters',
      graph,
    );
    assert.equal(trails.get('direct')?.isCrossNested, false);
    assert.equal(trails.get('innkeeper')?.locationAncestors.length, 3);
  });
});
