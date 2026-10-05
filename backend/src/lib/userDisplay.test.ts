import assert from 'node:assert/strict';
import test from 'node:test';
import { serializeUserIdentity } from './userDisplay.js';

const baseUser = {
  id: 'user-1', email: 'navigator@example.com', role: 'USER', passwordHash: null,
};

test('user identity defaults campaign navigation shortcuts to disabled', () => {
  assert.equal(serializeUserIdentity(baseUser).campaignNavigationShortcutsEnabled, false);
});

test('user identity exposes enabled campaign navigation shortcuts', () => {
  assert.equal(serializeUserIdentity({
    ...baseUser, campaignNavigationShortcutsEnabled: true,
  }).campaignNavigationShortcutsEnabled, true);
});
