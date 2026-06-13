import assert from 'node:assert/strict';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath, pathToFileURL } from 'node:url';

const catalogPath = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '../../../../../community-plugins/wiki-opds-feed/backend/catalog.js',
);

const { buildWikiOpdsCatalogFeed } = await import(pathToFileURL(catalogPath).href);

test('buildWikiOpdsCatalogFeed maps public pages to acquisition entries', () => {
  const feed = buildWikiOpdsCatalogFeed({
    pluginId: 'wiki-opds-feed',
    campaignHandle: 'somerden',
    campaignName: 'Somerden',
    campaignUpdatedAt: new Date('2026-01-01T00:00:00.000Z'),
    baseUrl: 'http://localhost:3001',
    catalogTitleSuffix: 'Public Lore',
    pages: [
      {
        id: 'page-1',
        title: 'Greenest',
        blocks: [],
        updatedAt: new Date('2026-02-01T12:00:00.000Z'),
      },
    ],
  });

  assert.equal(feed.entries.length, 1);
  assert.equal(feed.entries[0]?.title, 'Greenest');
  assert.equal(feed.title, 'Somerden — Public Lore');
  assert.match(feed.entries[0]?.links[0]?.href ?? '', /pages\/page-1\.md$/);
});

test('buildWikiOpdsCatalogFeed uses custom catalog title suffix', () => {
  const feed = buildWikiOpdsCatalogFeed({
    pluginId: 'wiki-opds-feed',
    campaignHandle: 'test',
    campaignName: 'Test Campaign',
    campaignUpdatedAt: new Date('2026-01-01T00:00:00.000Z'),
    baseUrl: 'http://localhost:3001',
    catalogTitleSuffix: 'Lore Feed',
    pages: [],
  });

  assert.equal(feed.title, 'Test Campaign — Lore Feed');
});
