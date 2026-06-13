import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  computeBudgetSlotsForAdvance,
  createDefaultWorldDevelopmentSettings,
  isWorldDevelopmentEnabled,
  parseWorldDevelopmentSettings,
  shouldAutoApplySuggestion,
} from './worldDevelopmentMetadata.js';

test('default world development mode is off', () => {
  const settings = createDefaultWorldDevelopmentSettings();
  assert.equal(settings.mode, 'off');
  assert.equal(isWorldDevelopmentEnabled(settings), false);
});

test('assisted auto-applies minor only', () => {
  const settings = parseWorldDevelopmentSettings({ mode: 'assisted' });
  assert.equal(shouldAutoApplySuggestion(settings, 'minor'), true);
  assert.equal(shouldAutoApplySuggestion(settings, 'significant'), false);
});

test('computeBudgetSlotsForAdvance scales with elapsed time', () => {
  const settings = createDefaultWorldDevelopmentSettings();
  settings.campaignMonthlyBudget = 'normal';
  const week = computeBudgetSlotsForAdvance(settings, 7 * 24 * 60);
  const month = computeBudgetSlotsForAdvance(settings, 30 * 24 * 60);
  assert.ok(week >= 0);
  assert.ok(month >= week);
});
