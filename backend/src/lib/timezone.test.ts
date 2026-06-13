import test from 'node:test';
import assert from 'node:assert/strict';
import {
  DEFAULT_TIMEZONE,
  isValidTimezone,
  resolveEffectiveTimezone,
  sanitizeTimezone,
} from './timezone.js';
import {
  OWNERSHIP_TRANSFER_EXPIRY_DAYS,
  ownershipTransferExpiresAt,
} from './ownershipTransferExpiry.js';

test('isValidTimezone accepts IANA zones', () => {
  assert.equal(isValidTimezone('UTC'), true);
  assert.equal(isValidTimezone('America/New_York'), true);
  assert.equal(isValidTimezone('Not/AZone'), false);
});

test('sanitizeTimezone normalizes valid input and rejects invalid', () => {
  assert.equal(sanitizeTimezone(' America/Chicago '), 'America/Chicago');
  assert.equal(sanitizeTimezone(''), null);
  assert.equal(sanitizeTimezone(null), null);
  assert.equal(sanitizeTimezone('bogus'), null);
});

test('resolveEffectiveTimezone prefers user over system default', () => {
  assert.equal(
    resolveEffectiveTimezone({
      userTimezone: 'Europe/Berlin',
      systemDefaultTimezone: 'America/New_York',
    }),
    'Europe/Berlin',
  );
  assert.equal(
    resolveEffectiveTimezone({
      userTimezone: null,
      systemDefaultTimezone: 'America/Chicago',
    }),
    'America/Chicago',
  );
  assert.equal(
    resolveEffectiveTimezone({
      userTimezone: null,
      systemDefaultTimezone: null,
    }),
    DEFAULT_TIMEZONE,
  );
});

test('ownershipTransferExpiresAt is seven days from anchor', () => {
  const anchor = Date.parse('2026-05-30T12:00:00.000Z');
  const expires = ownershipTransferExpiresAt(anchor);
  assert.equal(
    expires.getTime() - anchor,
    OWNERSHIP_TRANSFER_EXPIRY_DAYS * 24 * 60 * 60 * 1000,
  );
});
