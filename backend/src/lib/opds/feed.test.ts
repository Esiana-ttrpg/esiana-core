import assert from 'node:assert/strict';
import test from 'node:test';
import { buildOpdsFeed, OPDS_MEDIA_TYPE, pageToPublication } from './feed.js';

test('adapts a page summary into an OPDS 2 publication', () => {
  const publication = pageToPublication({
    id: 'page-1', title: 'Elara', modified: new Date('2026-11-20T00:00:00Z'),
    description: ' A scholar. ', category: 'Characters',
    reading: { href: '/opds/me/c1/pages/page-1', type: 'text/html' },
    canonical: { href: '/c/c1/characters/elara', type: 'text/html' },
  });
  assert.equal(publication.metadata.identifier, 'page-1');
  assert.equal(publication.metadata.description, 'A scholar.');
  assert.equal(publication.metadata.modified, '2026-11-20T00:00:00.000Z');
  assert.equal(publication.links[0]?.rel, 'http://opds-spec.org/acquisition');
  assert.equal(publication.links[1]?.rel, 'alternate');
  assert.equal('images' in publication, false);
});

test('omits absent optional metadata and includes navigation and pagination', () => {
  const publication = pageToPublication({ id: 'p', title: 'Page', description: ' ',
    reading: { href: '/read' }, canonical: { href: '/page' } });
  assert.equal('description' in publication.metadata, false);
  assert.equal('subject' in publication.metadata, false);
  const feed = buildOpdsFeed({ title: 'Catalog', links: [{ href: '/opds', rel: 'self', type: OPDS_MEDIA_TYPE }],
    navigation: [{ href: '/opds/campaigns', title: 'Campaigns', type: OPDS_MEDIA_TYPE }],
    publications: [publication], numberOfItems: 0, itemsPerPage: 20, currentPage: 1 });
  assert.equal(feed.metadata.numberOfItems, 0);
  assert.equal(feed.navigation?.[0]?.title, 'Campaigns');
  assert.equal(JSON.parse(JSON.stringify(feed)).publications[0].metadata.title, 'Page');
});
