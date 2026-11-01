import assert from 'node:assert/strict';
import test from 'node:test';
import { normalizeDashboardExternalUrl, parseDashboardQuickLinks, normalizeDashboardQuickLinks, sanitizeQuickUtilityNavConfig } from './dashboardQuickLinkCatalog.js';

const external = { kind: 'external', id: 'atlas', label: 'Shared atlas', url: 'https://example.com/world', icon: 'book' };

test('legacy choices and mixed quick-link ordering survive serialization', () => {
  const entries = ['maps', external, 'sessionNotes'];
  assert.deepEqual(parseDashboardQuickLinks(entries), entries);
  assert.deepEqual(normalizeDashboardQuickLinks(JSON.parse(JSON.stringify(entries))), entries);
  assert.deepEqual(sanitizeQuickUtilityNavConfig({ links: entries, custom: 'keep' }), { links: entries, custom: 'keep' });
  assert.deepEqual(normalizeDashboardQuickLinks([]), []);
});

test('external navigation only accepts complete HTTP/HTTPS URLs without credentials', () => {
  for (const url of ['javascript:alert(1)', 'data:text/html,test', 'file:///tmp/test', '//example.com', '/wiki', 'https:example.com',
    'https://user:password@example.com', 'https://example.com\n/path', 'https://example.com\\@evil.test', 'https://<script>.test']) {
    assert.equal(normalizeDashboardExternalUrl(url), null, url);
    assert.equal(parseDashboardQuickLinks([{ ...external, url }]), null, url);
  }
  assert.equal(normalizeDashboardExternalUrl(' HTTP://example.com '), 'http://example.com/');
});

test('invalid metadata, duplicate IDs, and excessive links are rejected on save', () => {
  assert.equal(parseDashboardQuickLinks([external, external]), null);
  assert.equal(parseDashboardQuickLinks([{ ...external, icon: '<svg>' }]), null);
  assert.equal(parseDashboardQuickLinks([{ ...external, label: ' ' }]), null);
  assert.equal(parseDashboardQuickLinks([{ ...external, label: 'x'.repeat(81) }]), null);
  assert.equal(parseDashboardQuickLinks(Array(8).fill('maps')), null);
  assert.deepEqual(normalizeDashboardQuickLinks(['maps', { ...external, url: 'javascript:alert(1)' }, 'party']), ['maps', 'party']);
});
