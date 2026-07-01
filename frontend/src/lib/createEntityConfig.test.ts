import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  buildCreateBlocks,
  buildCreateMetadata,
  CHARACTER_ROLE_OPTIONS,
  createEmptyFormState,
  getCreateEntityConfig,
} from './createEntityConfig.ts';

describe('createEntityConfig', () => {
  it('builds generic character metadata with characterRole and quickInfo', () => {
    const form = {
      ...createEmptyFormState('Characters'),
      name: 'The Nameless King',
      fieldValues: {
        Role: 'Cult leader',
        Affiliation: 'Hidden cult',
        Location: 'Port Haven',
      },
    };
    const metadata = buildCreateMetadata('Characters', form);
    assert.equal(metadata.entityCategory, 'characters');
    assert.equal(metadata.characterRole, 'generic');
    assert.ok(!('firstName' in metadata));
    assert.ok(!('createTemplate' in metadata));
    const quickInfo = metadata.quickInfo as Array<{ key: string; value: string }>;
    assert.equal(quickInfo.find((f) => f.key === 'Role')?.value, 'Cult leader');
  });

  it('lists Generic Character first in role options', () => {
    assert.equal(CHARACTER_ROLE_OPTIONS[0]?.value, 'generic');
    assert.equal(CHARACTER_ROLE_OPTIONS[1]?.value, 'party-member');
  });

  it('defaults to generic character role', () => {
    const form = createEmptyFormState('Characters');
    assert.equal(form.characterRole, 'generic');
  });

  it('builds party member with active participation and no empty quickInfo', () => {
    const form = {
      ...createEmptyFormState('Characters'),
      characterRole: 'party-member' as const,
      name: 'Kael',
    };
    const metadata = buildCreateMetadata('Characters', form);
    assert.equal(metadata.characterRole, 'party-member');
    assert.equal(metadata.partyParticipation?.active, true);
    assert.equal(metadata.quickInfo, undefined);
  });

  it('maps party member optional fields to quickInfo', () => {
    const form = {
      ...createEmptyFormState('Characters'),
      characterRole: 'party-member' as const,
      fieldValues: {
        partyRole: 'Face of the party',
        startingLocation: 'Port Haven',
      },
    };
    const metadata = buildCreateMetadata('Characters', form);
    const quickInfo = metadata.quickInfo as Array<{ key: string; value: string }>;
    assert.equal(quickInfo.find((f) => f.key === 'Role')?.value, 'Face of the party');
    assert.equal(quickInfo.find((f) => f.key === 'Location')?.value, 'Port Haven');
  });

  it('builds noble metadata with title and partial quickInfo', () => {
    const form = {
      ...createEmptyFormState('Characters'),
      characterRole: 'noble' as const,
      fieldValues: {
        title: 'Duchess',
        house: 'Valeris',
        affiliation: 'Royal Council',
        seat: 'Blackstone Keep',
      },
    };
    const metadata = buildCreateMetadata('Characters', form);
    assert.equal(metadata.characterRole, 'noble');
    assert.equal(metadata.title, 'Duchess');
    const quickInfo = metadata.quickInfo as Array<{ key: string; value: string }>;
    assert.equal(quickInfo.find((f) => f.key === 'Family')?.value, 'Valeris');
    assert.equal(quickInfo.find((f) => f.key === 'Affiliation')?.value, 'Royal Council');
    assert.equal(quickInfo.find((f) => f.key === 'Location')?.value, 'Blackstone Keep');
  });

  it('builds noble with only title filled', () => {
    const form = {
      ...createEmptyFormState('Characters'),
      characterRole: 'noble' as const,
      fieldValues: { title: 'Duchess' },
    };
    const metadata = buildCreateMetadata('Characters', form);
    assert.equal(metadata.title, 'Duchess');
    assert.equal(metadata.quickInfo, undefined);
  });

  it('builds villain metadata with motivation and threat quickInfo', () => {
    const form = {
      ...createEmptyFormState('Characters'),
      characterRole: 'villain' as const,
      fieldValues: {
        threatLevel: 'Regional',
        primaryGoal: 'Restore the drowned empire',
        affiliation: 'Cult of the Deep',
      },
    };
    const metadata = buildCreateMetadata('Characters', form);
    assert.equal(metadata.characterRole, 'villain');
    assert.equal(metadata.motivation, 'Restore the drowned empire');
    const quickInfo = metadata.quickInfo as Array<{ key: string; value: string }>;
    assert.equal(quickInfo.find((f) => f.key === 'Threat Level')?.value, 'Regional');
    assert.equal(quickInfo.find((f) => f.key === 'Affiliation')?.value, 'Cult of the Deep');
  });

  it('builds merchant metadata omitting empty guild', () => {
    const form = {
      ...createEmptyFormState('Characters'),
      characterRole: 'merchant' as const,
      fieldValues: {
        business: 'Moon & Lantern Trading',
      },
    };
    const metadata = buildCreateMetadata('Characters', form);
    const quickInfo = metadata.quickInfo as Array<{ key: string; value: string }>;
    assert.equal(quickInfo.find((f) => f.key === 'Business')?.value, 'Moon & Lantern Trading');
    assert.equal(quickInfo.find((f) => f.key === 'Guild'), undefined);
  });

  it('builds organization metadata with orgType and headquarters index', () => {
    const form = {
      ...createEmptyFormState('Organizations'),
      name: 'The Sapphire Company',
      fieldValues: {
        orgType: 'Guild',
        Headquarters: 'Port Haven',
      },
    };
    const metadata = buildCreateMetadata('Organizations', form);
    assert.equal(metadata.orgType, 'Guild');
    const fields = metadata.fields as Array<{ key: string; value: string }>;
    assert.equal(fields.find((f) => f.key === 'Headquarters')?.value, 'Port Haven');
  });

  it('builds bestiary metadata with creatureType', () => {
    const form = {
      ...createEmptyFormState('Bestiary'),
      name: 'Owlbear',
      fieldValues: { creatureType: 'Beast' },
    };
    const metadata = buildCreateMetadata('Bestiary', form);
    assert.equal(metadata.creatureType, 'Beast');
    assert.equal(metadata.entityCategory, 'bestiary');
  });

  it('builds ancestry metadata with parentAncestryId', () => {
    const form = {
      ...createEmptyFormState('Ancestries'),
      name: 'Deep Gnome',
      parentAncestryId: 'ancestry-gnome',
    };
    const metadata = buildCreateMetadata('Ancestries', form);
    assert.equal(metadata.parentAncestryId, 'ancestry-gnome');
  });

  it('seeds description into character biography block', () => {
    const blocks = buildCreateBlocks(
      'Characters',
      'Retired knight who lost her arm',
    );
    const bio = blocks.find((block) => block.type === 'text-biography');
    assert.equal(
      (bio?.content as { markdown?: string })?.markdown,
      'Retired knight who lost her arm',
    );
  });

  it('seeds description into bestiary tiptap block with surface layout', () => {
    const blocks = buildCreateBlocks('Bestiary', 'Shadow predator of the deep woods');
    const text = blocks.find((block) => block.type === 'text-tiptap');
    assert.equal(
      (text?.content as { markdown?: string })?.markdown,
      'Shadow predator of the deep woods',
    );
  });

  it('uses bestiary surface blocks', () => {
    const config = getCreateEntityConfig('Bestiary');
    assert.equal(config.surfaceKey, 'bestiary');
  });
});
