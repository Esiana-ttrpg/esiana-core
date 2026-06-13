import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  AliasUsageTypes,
  buildEntityHistoricalNameProjection,
  isDateWithinRange,
  resolveHistoricalAliasesAtDate,
  resolveFormerPrimaryChip,
} from '../../../shared/loreKnowledge.js';
import type { EntityHistoricalAliasRecord } from '../../../shared/loreKnowledge.js';

const baseAlias = (
  patch: Partial<EntityHistoricalAliasRecord>,
): EntityHistoricalAliasRecord => ({
  id: 'a1',
  stableKey: 'sk1',
  pageId: 'p1',
  campaignId: 'c1',
  name: 'Third Ember Dynasty',
  usageType: AliasUsageTypes.OFFICIAL,
  visibility: 'PUBLIC',
  isPrimaryInEra: true,
  isSecret: false,
  playerDiscoverable: true,
  sortOrder: 0,
  ...patch,
});

describe('loreKnowledge projections', () => {
  it('isDateWithinRange respects open-ended eras', () => {
    const date = { year: 760, month: 0, day: 1 };
    const alias = baseAlias({
      eraStart: { year: 701, month: null, day: null },
      eraEnd: { year: 812, month: null, day: null },
    });
    assert.equal(isDateWithinRange(date, alias.eraStart, alias.eraEnd), true);
    assert.equal(
      isDateWithinRange({ year: 900, month: 0, day: 1 }, alias.eraStart, alias.eraEnd),
      false,
    );
  });

  it('resolveHistoricalAliasesAtDate returns multiple usage types in same era', () => {
    const date = { year: 760, month: 0, day: 1 };
    const aliases = [
      baseAlias({ id: '1', name: 'Third Ember Dynasty', usageType: AliasUsageTypes.OFFICIAL }),
      baseAlias({
        id: '2',
        name: 'Ash Tyranny',
        usageType: AliasUsageTypes.PEJORATIVE,
        isPrimaryInEra: false,
      }),
    ];
    const matches = resolveHistoricalAliasesAtDate(aliases, date);
    assert.equal(matches.length, 2);
  });

  it('buildEntityHistoricalNameProjection keeps canonical title primary', () => {
    const projection = buildEntityHistoricalNameProjection(
      'Ash Kingdom',
      [
        baseAlias({
          eraStart: { year: 701, month: null, day: null },
          eraEnd: { year: 812, month: null, day: null },
        }),
        baseAlias({
          id: 'past',
          name: 'Third Ember Dynasty',
          eraStart: { year: 640, month: null, day: null },
          eraEnd: { year: 700, month: null, day: null },
          isPrimaryInEra: true,
        }),
      ],
      { year: 900, month: 0, day: 1 },
    );
    assert.equal(projection.canonicalTitle, 'Ash Kingdom');
    assert.equal(projection.formerChip, 'Third Ember Dynasty');
    assert.equal(projection.eraCallout, null);
  });

  it('era callout appears when viewing in-period', () => {
    const projection = buildEntityHistoricalNameProjection(
      'Ash Kingdom',
      [
        baseAlias({
          eraStart: { year: 701, month: null, day: null },
          eraEnd: { year: 812, month: null, day: null },
        }),
      ],
      { year: 760, month: 0, day: 1 },
    );
    assert.equal(projection.canonicalTitle, 'Ash Kingdom');
    assert.ok(projection.eraCallout?.length);
    assert.equal(projection.eraCallout?.[0]?.name, 'Third Ember Dynasty');
  });

  it('resolveFormerPrimaryChip picks latest ended primary name', () => {
    const chip = resolveFormerPrimaryChip(
      [
        baseAlias({
          name: 'Kingdom of Ashes',
          eraEnd: { year: 700, month: null, day: null },
        }),
        baseAlias({
          id: '2',
          name: 'Third Ember Dynasty',
          eraEnd: { year: 812, month: null, day: null },
        }),
      ],
      { year: 900, month: 0, day: 1 },
      'Ash Kingdom',
    );
    assert.equal(chip, 'Third Ember Dynasty');
  });
});
