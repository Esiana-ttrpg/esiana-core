import assert from 'node:assert/strict';
import test from 'node:test';
import { PartyParticipationRoles } from '../partyParticipation.js';
import { mapKankaCharacterFields } from './kankaCharacter.js';

const ANYA_NPC = {
  id: 6401071,
  type: 'NPC',
  title: 'Master Assassin',
  entity: {
    id: 6401071,
    name: 'Anya Nightshadow',
    type: 'NPC',
    entityAttributes: [
      { name: 'Class', value: 'Rogue 3 / Assassin 2' },
      { name: 'Level', value: '5' },
      { name: 'Background', value: 'Criminal' },
      { name: 'Alignment', value: 'Neutral Evil' },
    ],
    entityLocations: [{ location_id: 6359027 }],
  },
  character_traits: [{ name: 'Hair', entry: 'Jet black', section_id: 1 }],
};

const ELORA_PC = {
  id: 6409005,
  type: 'Player Character',
  entity: {
    id: 6409005,
    name: 'Elora Arkenea',
    type: 'Player Character',
    entityAttributes: [
      { name: 'Class', value: 'Wizard' },
      { name: 'Level', value: '7' },
      { name: 'Player_Name', value: 'Alice' },
    ],
  },
  character_races: [
    {
      race: {
        entity: { id: 6399999, name: 'High Elf' },
      },
    },
  ],
};

test('mapKankaCharacterFields maps NPC lore fields and sheet appendix', () => {
  const result = mapKankaCharacterFields(ANYA_NPC);
  assert.equal(result.characterMetadata.profession, 'Rogue 3 / Assassin 2');
  assert.equal(result.characterMetadata.title, 'Master Assassin');
  assert.equal(result.importMetadataExtras.level, '5');
  assert.deepEqual(result.characterMetadata.partyParticipation, {
    active: false,
    role: PartyParticipationRoles.NPC_ALLY,
  });
  const appearance = result.characterMetadata.appearance as Record<string, unknown>;
  assert.equal(appearance.hairDescription, 'Jet black');
  assert.ok(result.deferredRefs.some((ref) => ref.field === 'currentLocationId'));
  assert.match(result.biographyAppendix, /### Sheet notes/);
  assert.match(result.biographyAppendix, /Background/);
  assert.doesNotMatch(result.biographyAppendix, /### Notable gear/);
});

test('mapKankaCharacterFields maps PC participation and deferred ancestry', () => {
  const result = mapKankaCharacterFields(ELORA_PC);
  assert.equal(result.characterMetadata.profession, 'Wizard');
  assert.equal(result.characterMetadata.ancestry, 'High Elf');
  assert.equal(result.importMetadataExtras.level, '7');
  assert.equal(result.importMetadataExtras.playerName, 'Alice');
  assert.deepEqual(result.characterMetadata.partyParticipation, {
    active: true,
    role: PartyParticipationRoles.PLAYER_CHARACTER,
  });
  assert.ok(
    result.deferredRefs.some(
      (ref) => ref.field === 'ancestryId' && ref.kankaEntityId === '6399999',
    ),
  );
});
