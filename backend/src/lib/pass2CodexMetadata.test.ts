import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  parseAncestryMetadata,
  mergeAncestryMetadata,
  validateAncestryParentChain,
} from './ancestryMetadata.js';
import {
  parseObjectMetadata,
  mergeObjectMetadata,
} from './objectMetadata.js';
import {
  parseLocationMetadata,
  mergeLocationMetadata,
  isRegionLocationPage,
  filterRegionLocationPages,
} from './locationMetadata.js';
import {
  parseRuleResourceMetadata,
  mergeRuleResourceMetadata,
} from './ruleResourceMetadata.js';
import { parseCharacterMetadata } from './characterMetadata.js';
import {
  mergeOrganizationMetadata,
  parseOrganizationMetadata,
  wouldCreateOrgParentCycle,
} from './organizationMetadata.js';

describe('pass2 codex metadata', () => {
  it('parses and merges ancestry metadata with index fields', () => {
    const parsed = parseAncestryMetadata({
      ancestryType: 'Dwarven',
      homeland: 'Stonehold',
      region: 'North',
      reputation: 'Stalwart',
      traditions: 'Forge rites',
    });
    assert.equal(parsed.ancestryType, 'Dwarven');
    assert.equal(parsed.homeland, 'Stonehold');
    assert.equal(parsed.entityKind, 'root');
    assert.equal(parsed.societies.length, 1);
    assert.equal(parsed.societies[0]?.name, 'Traditional');

    const merged = mergeAncestryMetadata(
      {},
      { knownFor: 'Smithing', entityKind: 'lineage', parentAncestryId: 'dwarf-1' },
      { resolvePageTitle: (id) => (id === 'dwarf-1' ? 'Dwarf' : null) },
    );
    const fields = (merged.fields as Array<{ key: string; value: string }>) ?? [];
    assert.ok(fields.some((f) => f.key === 'Kind' && f.value === 'Lineage'));
    assert.ok(fields.some((f) => f.key === 'Parent' && f.value === 'Dwarf'));
  });

  it('rejects ancestry parent cycles', () => {
    const metaById = new Map<string, unknown>([
      ['a', { parentAncestryId: 'b' }],
      ['b', { parentAncestryId: 'c' }],
      ['c', { parentAncestryId: 'a' }],
    ]);
    const error = validateAncestryParentChain('page-1', 'b', (id) => metaById.get(id) ?? null);
    assert.equal(error, 'Ancestry parent chain would create a cycle.');
  });

  it('parses and merges organization metadata with power-surface fields', () => {
    const parsed = parseOrganizationMetadata({
      orgType: 'Guild',
      motivation: 'Protect trade routes',
      worldState: 'rising',
      currentPressures: ['Succession dispute', ''],
      influenceMode: 'mercantile',
      organizationalVisibility: 'public',
      symbolPreset: 'coin',
      doctrineTint: '#ca8a04',
    });
    assert.equal(parsed.publicPurpose, 'Protect trade routes');
    assert.equal(parsed.worldState, 'rising');
    assert.deepEqual(parsed.currentPressures, ['Succession dispute']);
    assert.equal(parsed.influenceMode, 'mercantile');
    assert.equal(parsed.symbolPreset, 'coin');

    const merged = mergeOrganizationMetadata(
      {},
      { publicPurpose: 'Smuggle relics', privateAgenda: 'Ash Court front' },
      { resolvePageTitle: (id) => (id === 'parent-1' ? 'Dominion' : null) },
    );
    assert.equal(merged.publicPurpose, 'Smuggle relics');
    assert.equal(merged.privateAgenda, 'Ash Court front');
    const fields = (merged.fields as Array<{ key: string; value: string }>) ?? [];
    assert.ok(fields.some((f) => f.key === 'World State' && f.value === ''));
  });

  it('detects organization parent cycles', () => {
    const snapshots = [
      { id: 'a', metadata: { parentOrgId: 'b' } },
      { id: 'b', metadata: { parentOrgId: 'c' } },
      { id: 'c', metadata: { parentOrgId: null } },
    ];
    assert.equal(wouldCreateOrgParentCycle('page-1', 'b', snapshots), false);
    assert.equal(wouldCreateOrgParentCycle('c', 'a', snapshots), true);
  });

  it('parses character ancestry page refs', () => {
    const parsed = parseCharacterMetadata({
      ancestryId: 'ancestry-1',
      lineageId: 'lineage-1',
      ancestry: 'Legacy text',
    });
    assert.equal(parsed.ancestryId, 'ancestry-1');
    assert.equal(parsed.lineageId, 'lineage-1');
    assert.equal(parsed.ancestry, 'Legacy text');
  });

  it('merges object metadata with holder label in index', () => {
    const merged = mergeObjectMetadata(
      { objectType: 'Relic' },
      { currentHolderId: 'char-1' },
      { resolvePageTitle: () => 'Aldric' },
    );
    const fields = (merged.fields as Array<{ key: string; value: string }>) ?? [];
    const holder = fields.find((f) => f.key === 'Holder');
    assert.equal(holder?.value, 'Aldric');
  });

  it('parses location metadata with legacy type field', () => {
    const parsed = parseLocationMetadata({
      fields: [{ key: 'Type', value: 'City' }],
      region: 'Coast',
      rulerOrAuthority: 'Council',
    });
    assert.equal(parsed.locationType, 'City');
    assert.equal(parsed.rulerOrAuthority, 'Council');
  });

  it('detects region location pages by locationType', () => {
    assert.equal(
      isRegionLocationPage({ metadata: { locationType: 'Region' } }),
      true,
    );
    assert.equal(
      isRegionLocationPage({ metadata: { locationType: 'City' } }),
      false,
    );
    const filtered = filterRegionLocationPages([
      { id: '1', metadata: { locationType: 'Kingdom' } },
      { id: '2', metadata: { locationType: 'Town' } },
    ]);
    assert.deepEqual(
      filtered.map((page) => page.id),
      ['1'],
    );
  });

  it('merges rule resource tags into index', () => {
    const merged = mergeRuleResourceMetadata({}, {
      resourceType: 'Reference',
      topicTags: ['combat', 'actions'],
    });
    const fields = (merged.fields as Array<{ key: string; value: string }>) ?? [];
    const tags = fields.find((f) => f.key === 'Tags');
    assert.equal(tags?.value, 'combat, actions');
  });
});
