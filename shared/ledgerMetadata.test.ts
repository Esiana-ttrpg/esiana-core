import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  buildProjectCompletionSuggestionKey,
  buildTradeEventSuggestionKey,
  computeLedgerBalance,
  formatLedgerAmountLabel,
  formatLedgerBalanceLabel,
  formatOpenDebtsSummary,
  normalizeLedgerAmount,
  normalizeLedgerNarrative,
  normalizeLedgerSuggestionStatus,
  parseQuestLedgerReward,
  summarizeOpenDebts,
  treasuryDeltaForEntry,
} from './ledgerMetadata.js';

describe('ledgerMetadata', () => {
  it('formats signed amount labels', () => {
    assert.equal(
      formatLedgerAmountLabel({ entryKind: 'credit', amount: 700, suffix: 'g' }),
      '+700g',
    );
    assert.equal(
      formatLedgerAmountLabel({ entryKind: 'debit', amount: 450, suffix: 'g' }),
      '-450g',
    );
    assert.equal(
      formatLedgerAmountLabel({ entryKind: 'debt_open', amount: 20, suffix: 'g' }),
      '20g owed',
    );
  });

  it('computes treasury balance from opening balance and entries', () => {
    const balance = computeLedgerBalance(
      { openingBalance: 1000 },
      [
        { entryKind: 'credit', amount: 700, debtMeta: null },
        { entryKind: 'debit', amount: 450, debtMeta: null },
        { entryKind: 'debt_open', amount: 200, debtMeta: { status: 'open' } },
        { entryKind: 'debt_payment', amount: 50, debtMeta: null },
      ],
    );
    assert.equal(balance, 1300);
  });

  it('summarizes open debts', () => {
    const debts = summarizeOpenDebts([
      {
        id: 'a',
        title: 'Brakka',
        amount: 20,
        narrative: 'Still owes',
        entryKind: 'debt_open',
        debtMeta: { status: 'open' },
      },
      {
        id: 'b',
        title: 'Settled',
        amount: 100,
        narrative: null,
        entryKind: 'debt_open',
        debtMeta: { status: 'settled' },
      },
    ]);
    assert.equal(debts.length, 1);
    assert.equal(debts[0]?.title, 'Brakka');
    assert.match(formatOpenDebtsSummary(debts, 'g') ?? '', /20g outstanding/);
  });

  it('normalizes narrative to one-line context cap', () => {
    const long = 'x'.repeat(200);
    assert.equal(normalizeLedgerNarrative(long)?.length, 120);
    assert.equal(normalizeLedgerNarrative('  Paid half upfront  '), 'Paid half upfront');
  });

  it('rejects non-positive amounts', () => {
    assert.equal(normalizeLedgerAmount(0), null);
    assert.equal(normalizeLedgerAmount(-5), null);
    assert.equal(normalizeLedgerAmount('120'), 120);
  });

  it('formats balance labels with suffix', () => {
    assert.equal(formatLedgerBalanceLabel(1230, 'g'), '1,230g');
  });

  it('treasury deltas ignore open debts', () => {
    assert.equal(treasuryDeltaForEntry({ entryKind: 'debt_open', amount: 50 }), 0);
    assert.equal(treasuryDeltaForEntry({ entryKind: 'debit', amount: 50 }), -50);
  });

  it('builds stable suggestion idempotency keys', () => {
    assert.equal(
      buildProjectCompletionSuggestionKey('proj-1', 'run-a'),
      'project-completion:proj-1:run-a',
    );
    assert.equal(buildTradeEventSuggestionKey('fx-1'), 'trade-event:fx-1');
  });

  it('normalizes suggestion status', () => {
    assert.equal(normalizeLedgerSuggestionStatus('PENDING'), 'pending');
    assert.equal(normalizeLedgerSuggestionStatus('unknown'), 'pending');
  });

  it('parses quest ledger reward metadata', () => {
    assert.deepEqual(parseQuestLedgerReward({ amount: 700, recipient: 'party' }), {
      amount: 700,
      recipient: 'party',
      contributorPageId: null,
    });
    assert.equal(parseQuestLedgerReward({ amount: 0 }), null);
  });
});
