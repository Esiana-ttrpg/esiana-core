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
  DISPLAY_NAME_MAX_LENGTH,
  PRONOUNS_MAX_LENGTH,
  STATUS_BLURB_MAX_LENGTH,
  PUBLIC_BIO_MAX_LENGTH,
  DEFAULT_PITCH_MAX_LENGTH,
  deriveUsername,
  resolveUserDisplayName,
  formatPlayerLabel,
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
  assert.equal(sanitizeDisplayName('<b>Mira</b>'), '<b>Mira</b>');
});

const profileFields = [
  { normalize: sanitizeDisplayName, limit: DISPLAY_NAME_MAX_LENGTH },
  { normalize: sanitizePronouns, limit: PRONOUNS_MAX_LENGTH },
  { normalize: sanitizeStatusBlurb, limit: STATUS_BLURB_MAX_LENGTH },
  { normalize: sanitizePublicBio, limit: PUBLIC_BIO_MAX_LENGTH },
  { normalize: sanitizeDefaultPitch, limit: DEFAULT_PITCH_MAX_LENGTH },
];

for (const { normalize, limit } of profileFields) {
  test(`${normalize.name} preserves adversarial markup as literal text`, () => {
    for (const input of [
      '<b>Mira</b>', '<script>alert(1)</script>',
      '<ScRiPt src=x/>Mira', '<scr<script>ipt>x</scr</script>ipt>',
      '<<b>script>alert(1)<</b>/script>', '<img src=x onerror=alert(1)>',
      '<!-->Mira', '<script', '<b title=">">Mira</b>',
      '&lt;script&gt;x&lt;/script&gt;', '&#60;img src=x&#62;',
      'javajavascript:script:', '<>'.repeat(100),
    ]) {
      const result = normalize(input);
      assert.equal(result, input.slice(0, limit), input);
      assert.equal(normalize(result), result, input);
    }
  });

  test(`${normalize.name} handles empty values, limits and truncation idempotently`, () => {
    for (const input of [null, undefined, {}, [], true, 123, '', '\t\r\n\u00a0']) {
      assert.equal(normalize(input), null);
    }
    const atLimit = 'x'.repeat(limit);
    assert.equal(normalize(atLimit), atLimit);
    assert.equal(normalize(atLimit + 'x'), atLimit);
    const result = normalize('x'.repeat(limit - 1) + ' y');
    assert.equal(result, 'x'.repeat(limit - 1));
    assert.equal(normalize(result), result);
  });

  test(`${normalize.name} handles long unmatched tag prefixes without regex backtracking`, () => {
    for (const input of ['<'.repeat(200_000), '<script '.repeat(25_000)]) {
      const result = normalize(input);
      assert.equal(result, input.slice(0, limit).trim());
      assert.equal(normalize(result), result);
    }
  });
}

test('single-line profile fields collapse Unicode whitespace and preserve punctuation', () => {
  for (const normalize of [sanitizePronouns, sanitizeStatusBlurb]) {
    assert.equal(normalize(' \t她 / they\n\u00a0elle  '), '她 / they elle');
    assert.equal(normalize('Míra & Ren — “探索” <3'), 'Míra & Ren — “探索” <3');
  }
});

test('display names retain interior whitespace and Unicode names', () => {
  assert.equal(sanitizeDisplayName(' \tMíra  星\nRen’s\t '), 'Míra  星\nRen’s');
});

test('multiline fields retain Markdown and normalize CRLF', () => {
  for (const normalize of [sanitizePublicBio, sanitizeDefaultPitch]) {
    const text = '**Míra**\n\n- 探索 & discovery\n- [notes](https://example.com)';
    assert.equal(normalize(' \r\n' + text.replace(/\n/g, '\r\n') + '\r\n '), text);
    assert.equal(normalize('Míra  &  Ren'), 'Míra  &  Ren');
  }
});

test('identity helpers retain display-name, username and player fallback distinctions', () => {
  const user = { email: 'mira@example.com', displayName: ' Ren 星 ' };
  assert.equal(resolveUserDisplayName(user), 'Ren 星');
  assert.equal(formatPlayerLabel(user, 0), 'Ren 星');
  assert.equal(deriveUsername(user.email), 'mira');
  assert.equal(resolveUserDisplayName({ ...user, displayName: ' ' }), 'mira');
  assert.equal(formatPlayerLabel({ ...user, displayName: null }, 0), 'Mira');
  assert.equal(formatPlayerLabel({ email: '' }, 2), 'Player 3');
  // Provider/plugin values remain untrusted literal text, including legacy data.
  assert.equal(resolveUserDisplayName({ ...user, displayName: '<b>Ren</b>' }), '<b>Ren</b>');
  assert.equal(serializeUserIdentity({ ...baseUser, displayName: '<b>Ren</b>' }).displayName, '<b>Ren</b>');
});
