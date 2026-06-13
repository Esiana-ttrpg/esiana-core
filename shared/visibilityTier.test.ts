import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  formatProjectionVisibilityTier,
  resolveVisibilityTierLabel,
  shouldShowProjectionVisibilityBadge,
  shouldShowVisibilityTierChip,
  visibilityTierLabelFromProjection,
} from './visibilityTier.js';

test('resolveVisibilityTierLabel maps wiki and chronology visibility strings', () => {
  assert.equal(resolveVisibilityTierLabel({ pageVisibility: 'Public' }), 'public');
  assert.equal(resolveVisibilityTierLabel({ pageVisibility: 'Party' }), 'party');
  assert.equal(resolveVisibilityTierLabel({ pageVisibility: 'DM_Only' }), 'staff');
  assert.equal(resolveVisibilityTierLabel({ pageVisibility: 'DM_ONLY' }), 'staff');
  assert.equal(
    resolveVisibilityTierLabel({
      pageVisibility: 'Party',
      narrativeStatus: 'DRAFT',
    }),
    'draft',
  );
  assert.equal(resolveVisibilityTierLabel({ pageVisibility: 'Public', isFuture: true }), 'future');
});

test('visibilityTierLabelFromProjection maps narrative projection tiers', () => {
  assert.equal(visibilityTierLabelFromProjection('ELEVATED_ONLY'), 'staff');
  assert.equal(visibilityTierLabelFromProjection('SECRET'), 'staff');
  assert.equal(visibilityTierLabelFromProjection('PARTY'), 'party');
});

test('formatProjectionVisibilityTier uses Staff label for elevated tiers', () => {
  assert.equal(formatProjectionVisibilityTier('ELEVATED_ONLY'), 'Staff');
});

test('shouldShowProjectionVisibilityBadge hides party tier', () => {
  assert.equal(shouldShowProjectionVisibilityBadge('PARTY'), false);
  assert.equal(shouldShowProjectionVisibilityBadge('ELEVATED_ONLY'), true);
});

test('shouldShowVisibilityTierChip hides default visible tiers', () => {
  assert.equal(shouldShowVisibilityTierChip('public'), false);
  assert.equal(shouldShowVisibilityTierChip('party'), false);
  assert.equal(shouldShowVisibilityTierChip('staff'), true);
});
