import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  formatConvergenceFeedTitle,
  formatConvergenceLinkLabel,
  formatConvergenceVisibilityTier,
  formatWorldEventFeedSummary,
  shouldShowConvergenceVisibilityBadge,
} from './convergenceFeedDisplay.js';

test('formatConvergenceVisibilityTier humanizes elevated tier', () => {
  assert.equal(formatConvergenceVisibilityTier('ELEVATED_ONLY'), 'Staff');
});

test('shouldShowConvergenceVisibilityBadge hides party tier', () => {
  assert.equal(shouldShowConvergenceVisibilityBadge('PARTY'), false);
  assert.equal(shouldShowConvergenceVisibilityBadge('ELEVATED_ONLY'), true);
});

test('formatConvergenceLinkLabel maps known href kinds', () => {
  assert.equal(formatConvergenceLinkLabel('event_lore'), 'View event');
  assert.equal(formatConvergenceLinkLabel('chronology_events'), 'Events ledger');
});

test('formatConvergenceFeedTitle renames rumor spread prefix', () => {
  assert.equal(
    formatConvergenceFeedTitle('Rumor spread: The Ash King died'),
    'Rumor circulated: The Ash King died',
  );
});

test('formatWorldEventFeedSummary parses rumor spread payload', () => {
  const summary = formatWorldEventFeedSummary(
    JSON.stringify({
      version: 'spreadAction-v1',
      actorUserId: 'user-1',
      claimId: 'claim-1',
      stance: 'distorts',
      visibility: 'GM_ONLY',
      targets: [{ kind: 'region', locationPageId: 'loc-1' }],
    }),
  );
  assert.match(summary ?? '', /Distorted retelling/);
  assert.match(summary ?? '', /GM-only circulation/);
  assert.match(summary ?? '', /1 region/);
});

test('formatWorldEventFeedSummary hides unknown JSON payloads', () => {
  assert.equal(formatWorldEventFeedSummary('{"version":"other-v1"}'), null);
});

test('formatWorldEventFeedSummary keeps plain text descriptions', () => {
  assert.equal(formatWorldEventFeedSummary('The council met at dawn.'), 'The council met at dawn.');
});
