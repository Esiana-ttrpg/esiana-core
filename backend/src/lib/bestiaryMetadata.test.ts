import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { mergeBestiaryMetadata, parseBestiaryMetadata } from './bestiaryMetadata.js';

describe('bestiaryMetadata', () => {
  it('parses typed fields and migrates legacy Type', () => {
    const parsed = parseBestiaryMetadata({
      fields: [{ key: 'Type', value: 'Fire Drake' }],
      habitat: 'Volcanic Range',
    });
    assert.equal(parsed.creatureType, 'Fire Drake');
    assert.equal(parsed.habitat, 'Volcanic Range');
  });

  it('syncs index fields on merge', () => {
    const merged = mergeBestiaryMetadata(
      { entityCategory: 'bestiary' },
      {
        creatureType: 'Ashfang Drake',
        habitat: 'Mountains',
        threatLevel: 'High',
        region: 'North',
        intelligence: 'Low',
      },
    );
    const fields = merged.fields as Array<{ key: string; value: string }>;
    assert.ok(fields.some((f) => f.key === 'Type' && f.value === 'Ashfang Drake'));
    assert.ok(fields.some((f) => f.key === 'Habitat' && f.value === 'Mountains'));
  });

  it('parses and merges ecology/combat intel fields', () => {
    const parsed = parseBestiaryMetadata({
      alsoKnownAs: 'The White Hunger',
      temperament: 'Pack Hunter',
      encounterConditions: 'Night / Snowstorms',
      encounterRate: 'Rare',
      activePeriods: ['Winter', 'Night'],
      weaknesses: ['Fire'],
      resistances: ['Frost', 'Bleed'],
      immunities: ['Poison'],
      factionAlignment: 'Feral',
      corruptionAffinity: 'High',
    });
    assert.equal(parsed.alsoKnownAs, 'The White Hunger');
    assert.equal(parsed.temperament, 'Pack Hunter');
    assert.deepEqual(parsed.weaknesses, ['Fire']);
    assert.deepEqual(parsed.resistances, ['Frost', 'Bleed']);

    const merged = mergeBestiaryMetadata(parsed, {
      weaknesses: ['Fire', 'Silver'],
    });
    const reParsed = parseBestiaryMetadata(merged);
    assert.deepEqual(reParsed.weaknesses, ['Fire', 'Silver']);
    assert.equal(reParsed.alsoKnownAs, 'The White Hunger');
  });
});
