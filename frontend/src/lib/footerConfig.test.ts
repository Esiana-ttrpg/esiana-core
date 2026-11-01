import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  DEFAULT_FOOTER_CONFIG,
  footerNavLinks,
  footerNavLinksForAudience,
  normalizeFooterConfig,
} from './footerConfig';

describe('footer nav links', () => {
  it('omits empty footer URLs', () => {
    assert.deepEqual(footerNavLinks(DEFAULT_FOOTER_CONFIG), []);
  });

  it('defaults visitor visibility off', () => {
    assert.equal(DEFAULT_FOOTER_CONFIG.showToUnauthorized, false);
    assert.equal(normalizeFooterConfig({ tosUrl: 'https://example.test/tos' }).showToUnauthorized, false);
  });

  it('returns only configured instance footer links', () => {
    assert.deepEqual(
      footerNavLinks({
        ...DEFAULT_FOOTER_CONFIG,
        tosUrl: 'https://example.test/tos',
        discordUrl: 'https://discord.gg/instance',
      }),
      [
        { label: 'Terms of Service', url: 'https://example.test/tos' },
        { label: 'Discord', url: 'https://discord.gg/instance' },
      ],
    );
  });

  it('hides footer links from unauthorized visitors unless opted in', () => {
    const footer = {
      ...DEFAULT_FOOTER_CONFIG,
      tosUrl: 'https://example.test/tos',
    };
    assert.deepEqual(footerNavLinksForAudience(footer, false), []);
    assert.deepEqual(footerNavLinksForAudience(footer, true), [
      { label: 'Terms of Service', url: 'https://example.test/tos' },
    ]);
    assert.deepEqual(
      footerNavLinksForAudience({ ...footer, showToUnauthorized: true }, false),
      [{ label: 'Terms of Service', url: 'https://example.test/tos' }],
    );
  });
});
