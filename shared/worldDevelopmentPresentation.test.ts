import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  campaignBudgetForActivityTier,
  formatDevelopmentDuration,
  worldActivityLabelForBudget,
  worldActivityTierForBudget,
  WORLD_DEVELOPMENT_MODE_HEADLINES,
} from './worldDevelopmentPresentation.js';

test('worldActivityTierForBudget maps internal budgets to GM tiers', () => {
  assert.equal(worldActivityTierForBudget('very_low'), 'quiet');
  assert.equal(worldActivityTierForBudget('normal'), 'moderate');
  assert.equal(worldActivityTierForBudget('high'), 'active');
  assert.equal(worldActivityTierForBudget('custom'), 'custom');
  assert.equal(campaignBudgetForActivityTier('moderate'), 'normal');
});

test('worldActivityLabelForBudget uses GM-facing labels', () => {
  assert.equal(worldActivityLabelForBudget('normal'), 'Moderate');
  assert.equal(worldActivityLabelForBudget('very_low'), 'Quiet');
});

test('WORLD_DEVELOPMENT_MODE_HEADLINES are narrative', () => {
  assert.equal(WORLD_DEVELOPMENT_MODE_HEADLINES.manual, 'Manual Review');
  assert.equal(WORLD_DEVELOPMENT_MODE_HEADLINES.off, 'World Development off');
});

test('formatDevelopmentDuration uses campaign-friendly units', () => {
  assert.equal(formatDevelopmentDuration(0), 'None');
  assert.equal(formatDevelopmentDuration(30 * 24 * 60), '1 campaign month');
  assert.equal(formatDevelopmentDuration(7 * 24 * 60), '1 week');
});
