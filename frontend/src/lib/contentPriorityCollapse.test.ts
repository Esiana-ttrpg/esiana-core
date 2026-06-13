import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  catalogFieldsForTile,
  countHiddenColumnsForViewport,
  formatIndexCellDisplay,
  isEmptyIndexValue,
  visibleColumnsForViewport,
  type PriorityColumnDef,
} from './contentPriorityCollapse.ts';

const SAMPLE_COLUMNS: PriorityColumnDef[] = [
  { key: 'Role', priority: 'primary' },
  { key: 'Affiliation', priority: 'primary' },
  { key: 'Family', priority: 'secondary' },
  { key: 'Status', priority: 'secondary' },
  { key: 'Location', priority: 'tertiary' },
  { key: 'Tags', priority: 'operator' },
];

describe('contentPriorityCollapse', () => {
  it('shows only primary columns on narrow viewports', () => {
    const visible = visibleColumnsForViewport(SAMPLE_COLUMNS, 400);
    assert.deepEqual(
      visible.map((c) => c.key),
      ['Role', 'Affiliation'],
    );
  });

  it('adds tertiary columns at lg breakpoint', () => {
    const visible = visibleColumnsForViewport(SAMPLE_COLUMNS, 1100);
    assert.ok(visible.some((c) => c.key === 'Location'));
    assert.equal(visible.some((c) => c.key === 'Tags'), false);
  });

  it('catalogFieldsForTile caps primary and secondary chips', () => {
    const { primary, secondary } = catalogFieldsForTile(SAMPLE_COLUMNS);
    assert.equal(primary.length, 2);
    assert.equal(secondary.length, 2);
  });

  it('treats UNKNOWN as empty index value', () => {
    assert.equal(isEmptyIndexValue('UNKNOWN'), true);
    assert.equal(isEmptyIndexValue('Kingdom of Nuln'), false);
    assert.equal(formatIndexCellDisplay('UNKNOWN'), null);
    assert.equal(formatIndexCellDisplay('Mario'), 'Mario');
  });

  it('counts hidden columns at narrow viewports', () => {
    assert.equal(countHiddenColumnsForViewport(SAMPLE_COLUMNS, 400), 4);
    assert.equal(countHiddenColumnsForViewport(SAMPLE_COLUMNS, 1400), 0);
  });
});
