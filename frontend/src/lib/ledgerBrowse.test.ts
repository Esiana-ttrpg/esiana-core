import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import type { LedgerTransactionLine } from '@shared/downtimeHub';
import {
  DEFAULT_LEDGER_BROWSE_STATE,
  hasActiveLedgerBrowse,
  projectLedgerFeed,
  toggleLedgerCategory,
  toggleLedgerEntryKind,
} from './ledgerBrowse.ts';

function line(
  partial: Partial<LedgerTransactionLine> & Pick<LedgerTransactionLine, 'id' | 'title'>,
): LedgerTransactionLine {
  return {
    amountLabel: '+10g',
    dateLabel: '2024-01-02',
    category: 'income',
    categoryLabel: 'Income',
    entryKind: 'credit',
    amount: 10,
    canEdit: true,
    canDelete: true,
    ...partial,
  };
}

describe('ledgerBrowse', () => {
  const rows: LedgerTransactionLine[] = [
    line({ id: '1', title: 'Tithe', category: 'income', entryKind: 'credit', amount: 100, dateLabel: '2024-01-03' }),
    line({ id: '2', title: 'Upkeep', category: 'upkeep', entryKind: 'debit', amount: 50, dateLabel: '2024-01-02' }),
    line({ id: '3', title: 'Debt opened', category: 'debt', entryKind: 'debt_open', amount: 200, dateLabel: '2024-01-01' }),
  ];

  it('filters by category and search', () => {
    const state = toggleLedgerCategory(DEFAULT_LEDGER_BROWSE_STATE, 'income');
    const filtered = projectLedgerFeed(rows, { ...state, search: 'tithe' }, 'newest');
    assert.equal(filtered.length, 1);
    assert.equal(filtered[0]?.id, '1');
  });

  it('filters by entry kind', () => {
    const state = toggleLedgerEntryKind(DEFAULT_LEDGER_BROWSE_STATE, 'debt_open');
    const filtered = projectLedgerFeed(rows, state, 'newest');
    assert.equal(filtered.length, 1);
    assert.equal(filtered[0]?.entryKind, 'debt_open');
  });

  it('sorts by amount descending', () => {
    const sorted = projectLedgerFeed(rows, DEFAULT_LEDGER_BROWSE_STATE, 'amountDesc');
    assert.deepEqual(sorted.map((row) => row.id), ['3', '1', '2']);
  });

  it('detects active browse state', () => {
    assert.equal(hasActiveLedgerBrowse(DEFAULT_LEDGER_BROWSE_STATE), false);
    assert.equal(
      hasActiveLedgerBrowse({ ...DEFAULT_LEDGER_BROWSE_STATE, search: 'upkeep' }),
      true,
    );
  });
});
