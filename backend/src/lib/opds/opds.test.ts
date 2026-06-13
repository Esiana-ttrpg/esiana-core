import assert from 'node:assert/strict';
import test from 'node:test';
import { buildOpdsCatalogFeed, escapeXml } from './atom.js';

test('escapeXml encodes reserved characters', () => {
  assert.equal(escapeXml(`Tom & "Jerry" <3>`), 'Tom &amp; &quot;Jerry&quot; &lt;3&gt;');
});

test('buildOpdsCatalogFeed emits OPDS Atom catalog', () => {
  const xml = buildOpdsCatalogFeed({
    id: 'urn:test:catalog',
    title: 'Test Catalog',
    updated: '2026-01-01T00:00:00.000Z',
    links: [
      {
        rel: 'self',
        href: 'https://example.com/catalog.atom',
        type: 'application/atom+xml;profile=opds-catalog',
      },
    ],
    entries: [
      {
        id: 'urn:test:page:1',
        title: 'Opening Scene',
        updated: '2026-01-02T00:00:00.000Z',
        summary: 'The adventure begins.',
        links: [
          {
            rel: 'http://opds-spec.org/acquisition',
            href: 'https://example.com/pages/1.md',
            type: 'text/markdown',
          },
        ],
      },
    ],
  });

  assert.match(xml, /xmlns:opds="http:\/\/opds-spec.org\/2010\/catalog"/);
  assert.match(xml, /<title>Test Catalog<\/title>/);
  assert.match(xml, /Opening Scene/);
  assert.match(xml, /opds-spec.org\/acquisition/);
  assert.match(xml, /text\/markdown/);
});
