import assert from 'node:assert/strict';
import test from 'node:test';
import {
  buildWorldDevelopmentStatusSummary,
  campaignMonthStartEpoch,
} from './worldDevelopmentPresentationHelpers.js';
import { createDefaultWorldDevelopmentSettings } from '../../../shared/worldDevelopmentMetadata.js';

test('campaignMonthStartEpoch floors to campaign-month boundary', () => {
  const month = BigInt(30 * 24 * 60);
  assert.equal(campaignMonthStartEpoch(month * 2n + 1000n), month * 2n);
});

test('buildWorldDevelopmentStatusSummary includes narrative fields', () => {
  const settings = createDefaultWorldDevelopmentSettings();
  settings.mode = 'manual';
  settings.campaignMonthlyBudget = 'normal';

  const summary = buildWorldDevelopmentStatusSummary({
    settings,
    pendingCount: 3,
    generatedThisCampaignMonth: 5,
  });

  assert.equal(summary.modeHeadline, 'Manual Review');
  assert.equal(summary.pendingCount, 3);
  assert.equal(summary.generatedThisCampaignMonth, 5);
  assert.equal(summary.worldActivityLabel, 'Moderate');
  assert.equal(summary.budgetMax, 12);
});
