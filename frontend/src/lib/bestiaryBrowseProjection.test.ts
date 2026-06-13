import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import type { CategoryIndexChild } from './wiki.ts';
import {
  buildBestiarySectionPresence,
  buildCreatureCodexTileViewModel,
  classifyThreatTier,
  filterOnlyCatalogued,
  formatThreatPresentation,
} from './bestiaryBrowseProjection.ts';

function mockCreature(
  id: string,
  title: string,
  options: {
    habitat?: string;
    region?: string;
    threatLevel?: string;
    weaknesses?: string[];
    discovery?: CategoryIndexChild['discovery'];
  } = {},
): CategoryIndexChild {
  return {
    id,
    title,
    parentId: null,
    visibility: 'PARTY',
    updatedAt: '2026-01-01T00:00:00.000Z',
    snippet: '',
    metadata: {
      entityCategory: 'bestiary',
      habitat: options.habitat ?? null,
      region: options.region ?? null,
      threatLevel: options.threatLevel ?? null,
      weaknesses: options.weaknesses ?? [],
      appearance: { portraitUrl: null, portraitCredit: null, summary: null, tags: [], gallery: { items: [] } },
    },
    discovery: options.discovery,
  };
}

describe('classifyThreatTier', () => {
  it('maps apex and elevated tiers', () => {
    assert.equal(classifyThreatTier('Apex'), 'apex');
    assert.equal(classifyThreatTier('★★★★'), 'apex');
    assert.equal(classifyThreatTier('High'), 'elevated');
    assert.equal(classifyThreatTier('★★★'), 'elevated');
    assert.equal(classifyThreatTier('Moderate'), 'moderate');
    assert.equal(classifyThreatTier(null), 'unknown');
  });
});

describe('formatThreatPresentation', () => {
  it('prefixes star tiers for apex and elevated', () => {
    assert.match(formatThreatPresentation('Apex') ?? '', /★★★★/);
    assert.match(formatThreatPresentation('Dangerous') ?? '', /★★★/);
  });
});

describe('buildCreatureCodexTileViewModel', () => {
  it('masks weaknesses for partial discovery', () => {
    const model = buildCreatureCodexTileViewModel(
      mockCreature('w1', 'Ashen Warg', {
        habitat: 'Frostwilds',
        weaknesses: ['Fire'],
        discovery: { state: 'partial', available: true },
      }),
      false,
    );

    assert.equal(model.weaknessLine, '???');
    assert.equal(model.showPartialBlur, true);
  });

  it('shows silhouette for hidden discovery', () => {
    const model = buildCreatureCodexTileViewModel(
      mockCreature('w2', 'Ashen Warg', {
        discovery: { state: 'hidden', available: true },
      }),
      false,
    );

    assert.equal(model.showSilhouette, true);
    assert.notEqual(model.displayName, 'Ashen Warg');
  });
});

describe('buildBestiarySectionPresence', () => {
  it('counts known species for party vs DM', () => {
    const entries = [
      mockCreature('a', 'Known', { discovery: { state: 'known', available: true } }),
      mockCreature('b', 'Hidden', { discovery: { state: 'hidden', available: true } }),
    ];

    const party = buildBestiarySectionPresence(entries, false);
    assert.equal(party.knownSpeciesCount, 1);
    assert.equal(party.totalSpeciesCount, 2);

    const dm = buildBestiarySectionPresence(entries, true);
    assert.equal(dm.knownSpeciesCount, 2);
  });

  it('counts apex threats only when threat is visible to viewer', () => {
    const entries = [
      mockCreature('apex', 'Drake', {
        threatLevel: 'Apex',
        discovery: { state: 'known', available: true },
      }),
      mockCreature('hidden', 'Unknown', {
        threatLevel: 'Apex',
        discovery: { state: 'hidden', available: true },
      }),
    ];

    const party = buildBestiarySectionPresence(entries, false);
    assert.equal(party.apexThreatCount, 1);
    assert.equal(party.apexActivityDetected, true);
  });
});

describe('filterOnlyCatalogued', () => {
  it('excludes hidden entries for party when enabled', () => {
    const entries = [
      mockCreature('a', 'Known', { discovery: { state: 'known', available: true } }),
      mockCreature('b', 'Hidden', { discovery: { state: 'hidden', available: true } }),
    ];

    const filtered = filterOnlyCatalogued(entries, true, false);
    assert.equal(filtered.length, 1);
    assert.equal(filtered[0]?.id, 'a');
  });
});
