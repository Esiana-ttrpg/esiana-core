import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildDowntimeProjectCreateMarkdown,
  constraintsToProjectEntries,
} from './buildDowntimeProjectCreateMarkdown.js';
import { bootstrapDowntimeProjectOnCreate } from './bootstrapDowntimeProjectOnCreate.js';

test('buildDowntimeProjectCreateMarkdown seeds anti-PM sections', () => {
  const markdown = buildDowntimeProjectCreateMarkdown({
    operationBrief: 'Rebuild the shrine walls.',
    stakes: 'Refugees arrive before winter.',
    constraints: [
      { label: '800 stone blocks', kind: 'requirement' },
      { label: 'Winter storms', kind: 'obstacle' },
    ],
  });

  assert.match(markdown, /## Operation brief/);
  assert.match(markdown, /Rebuild the shrine walls\./);
  assert.match(markdown, /## Stakes/);
  assert.match(markdown, /Refugees arrive before winter\./);
  assert.match(markdown, /## Requirements/);
  assert.match(markdown, /- 800 stone blocks/);
  assert.match(markdown, /## Obstacles/);
  assert.match(markdown, /- Winter storms/);
  assert.match(markdown, /## Notes/);
  assert.doesNotMatch(markdown, /## Tasks/);
});

test('constraintsToProjectEntries maps soft types to simulation arrays', () => {
  const { resources, blockers } = constraintsToProjectEntries([
    { label: 'Blessing from river priests', kind: 'requirement' },
    { label: 'Bandit raids', kind: 'obstacle' },
  ]);

  assert.equal(resources.length, 1);
  assert.equal(resources[0]?.label, 'Blessing from river priests');
  assert.equal(resources[0]?.satisfied, false);
  assert.equal(blockers.length, 1);
  assert.equal(blockers[0]?.label, 'Bandit raids');
  assert.equal(blockers[0]?.resolved, false);
});

test('bootstrapDowntimeProjectOnCreate merges ledger resources with constraints', () => {
  const result = bootstrapDowntimeProjectOnCreate({
    title: 'Citadel repairs',
    constraints: [{ label: '800 stone blocks', kind: 'requirement' }],
    fields: {
      resources: [
        {
          id: 'ledger-cost',
          label: 'Project treasury cost',
          quantity: null,
          unit: null,
          satisfied: true,
          linkedPageId: null,
          sourceKind: 'ledger',
          ledgerAmount: 450,
          ledgerImpactKind: 'debit',
        },
      ],
      outcomes: [
        {
          id: 'treasury-outcome',
          outcomeKind: 'treasury_effect',
          description: null,
          linkedPageIds: [],
          status: 'pending',
          treasuryEffect: { amount: 700, kind: 'credit', category: 'income', title: 'Payout' },
        },
      ],
    },
  });

  assert.equal(result.ok, true);
  if (!result.ok) return;
  assert.equal(result.fields.resources.length, 2);
  assert.equal(result.fields.resources[0]?.label, '800 stone blocks');
  assert.equal(result.fields.resources[1]?.sourceKind, 'ledger');
  assert.equal(result.fields.outcomes.length, 1);
  assert.equal(result.fields.outcomes[0]?.outcomeKind, 'treasury_effect');
});
