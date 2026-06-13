import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import type { CategoryIndexChild } from './wiki.ts';
import { groupCreaturesByHabitat } from './bestiaryHubGrouping.ts';

function mockCreature(
  id: string,
  title: string,
  habitat?: string | null,
  region?: string | null,
  threatLevel?: string | null,
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
      habitat: habitat ?? null,
      region: region ?? null,
      threatLevel: threatLevel ?? null,
      appearance: { portraitUrl: null, portraitCredit: null, summary: null, tags: [], gallery: { items: [] } },
    },
    discovery: { state: 'known', available: true },
  };
}

describe('groupCreaturesByHabitat', () => {
  it('buckets by habitat with region fallback', () => {
    const sections = groupCreaturesByHabitat(
      [
        mockCreature('a', 'Warg', 'Frostwilds'),
        mockCreature('b', 'Slime', null, 'Deep Marsh'),
        mockCreature('c', 'Mystery'),
      ],
      true,
    );

    const labels = sections.map((s) => s.label);
    assert.ok(labels.includes('Frostwilds'));
    assert.ok(labels.includes('Deep Marsh'));
    assert.ok(labels.includes('Unknown Range'));
  });

  it('aggregates apex threat presence per section', () => {
    const sections = groupCreaturesByHabitat(
      [
        mockCreature('a', 'Drake', 'Volcanic Range', null, 'Apex'),
        mockCreature('b', 'Rat', 'Volcanic Range'),
      ],
      true,
    );

    const volcanic = sections.find((s) => s.label === 'Volcanic Range');
    assert.ok(volcanic);
    assert.equal(volcanic?.presence.apexThreatCount, 1);
    assert.equal(volcanic?.presence.apexActivityDetected, true);
  });
});
