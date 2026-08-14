import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { buildEntityWorkspaceEmphasis } from './entityWorkspaceEmphasis.ts';

describe('entityWorkspaceEmphasis', () => {
  it('surfaces character motivation and active arc', () => {
    const emphasis = buildEntityWorkspaceEmphasis(
      'character',
      'c1',
      {
        motivation: 'Protect the realm',
        activeArc: 'The exile returns',
        currentLocationId: 'l1',
      },
      [
        { id: 'c1', title: 'Hero', templateType: 'DEFAULT', metadata: {} },
        { id: 'l1', title: 'Nuln', templateType: 'DEFAULT', metadata: {} },
      ],
      [],
    );
    assert.equal(emphasis.motivation, 'Protect the realm');
    assert.equal(emphasis.activeArc, 'The exile returns');
    assert.ok(emphasis.facts.some((f) => f.label === 'Location' && f.value === 'Nuln'));
  });

  it('surfaces object provenance and holder', () => {
    const emphasis = buildEntityWorkspaceEmphasis(
      'object',
      'o1',
      {
        provenance: 'Forged in the First Age',
        currentHolderId: 'c1',
      },
      [{ id: 'c1', title: 'Keeper', templateType: 'DEFAULT', metadata: {} }],
      [],
    );
    assert.equal(emphasis.holderTitle, 'Keeper');
    assert.ok(emphasis.facts.some((f) => f.label === 'Provenance'));
  });

  it('surfaces bestiary taxonomy fields', () => {
    const emphasis = buildEntityWorkspaceEmphasis(
      'bestiary',
      'b1',
      { creatureType: 'Dragon', habitat: 'Mountain peaks', threatLevel: 'Deadly' },
      [],
      [],
    );
    assert.equal(emphasis.facts.length, 3);
  });
});
