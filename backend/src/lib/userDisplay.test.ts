import assert from 'node:assert/strict';
import test from 'node:test';
import {
  serializeUserIdentity,
  sanitizeSocialLink,
  sanitizeStatusBlurb,
  sanitizeDefaultPitch,
  sanitizePublicBio,
  sanitizePronouns,
  sanitizeDisplayName,
  SOCIAL_LINK_MAX_LENGTH,
} from './userDisplay.js';

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

test('social links normalize web URLs and bare hostnames', () => {
  assert.equal(sanitizeSocialLink(' example.com/profile '), 'https://example.com/profile');
  assert.equal(sanitizeSocialLink('HTTPS://EXAMPLE.COM/profile'), 'https://example.com/profile');
  assert.equal(sanitizeSocialLink('http://localhost:8080/profile'), 'http://localhost:8080/profile');
  assert.equal(sanitizeSocialLink('https://example.com/?q=javascript:notes'), 'https://example.com/?q=javascript:notes');
});

test('social links reject unsupported schemes and obfuscated input', () => {
  for (const value of [
    'javascript:alert(1)', 'JaVaScRiPt:alert(1)', 'javajavascript:script:alert(1)',
    'java\tscript:alert(1)', 'java\nscript:alert(1)',
    'javascript:someone@example.com', 'data:text/html,hello', 'vbscript:msgbox(1)',
    'file:///etc/passwd', 'ftp://example.com', 'mailto:someone@example.com',
    '<b>https://example.com</b>', 'https://exa\nmple.com', 'https://',
  ]) {
    assert.equal(sanitizeSocialLink(value), null, value);
  }
});

test('HTML entity text cannot become an executable social link scheme', () => {
  const result = sanitizeSocialLink('javascript&#58;alert(1)');
  assert.ok(result);
  assert.equal(new URL(result).protocol, 'https:');
});

test('social links reject oversized URLs instead of truncating the destination', () => {
  const prefix = 'https://example.com/';
  const atLimit = prefix + 'a'.repeat(SOCIAL_LINK_MAX_LENGTH - prefix.length);
  assert.equal(sanitizeSocialLink(atLimit), atLimit);
  assert.equal(sanitizeSocialLink(atLimit + 'a'), null);
  // Check the serialized length too: Unicode paths expand during normalization.
  assert.equal(sanitizeSocialLink(prefix + 'é'.repeat(100)), null);
});

test('profile text preserves literal scheme names rather than attempting URL sanitization', () => {
  const text = 'Notes on javascript: and javajavascript:script:';
  for (const sanitize of [sanitizeStatusBlurb, sanitizeDefaultPitch, sanitizePublicBio, sanitizePronouns, sanitizeDisplayName]) {
    // Keep within even the shortest field limit.
    assert.equal(sanitize('javascript: notes'), 'javascript: notes');
    for (const empty of [null, undefined, '', '   ', 42]) assert.equal(sanitize(empty), null);
  }
  assert.equal(sanitizePublicBio(text), text);
  assert.equal(sanitizePublicBio('[notes](javascript:alert%281%29)'), '[notes](javascript:alert%281%29)');
  assert.equal(sanitizeDisplayName('<b>Mira</b>'), 'Mira');
});
