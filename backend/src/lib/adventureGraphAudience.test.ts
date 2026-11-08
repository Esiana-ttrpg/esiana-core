import assert from 'node:assert/strict';
import test from 'node:test';
import { authorizedGraphRow, rowForAudience } from './entityGraphService.js';

type Row = Parameters<typeof authorizedGraphRow>[0];
const row = (overrides: Partial<Row> = {}): Row => ({
  id: 'edge', sourceEntityType: 'calendar_event', sourceEntityId: 'shared-event',
  targetEntityType: 'wiki_page', targetEntityId: 'shared-page',
  relationKind: 'WIKI_REFERENCE', direction: 'directed', startDate: null, endDate: null,
  visibility: null, payload: null, sourceDomain: 'calendar', sourceRecordKey: 'edge',
  sourcePageId: null, ...overrides,
});

test('Party graph retains only mixed-type edges with both endpoints authorized', () => {
  const pages = new Set(['shared-page']);
  const entities = new Set(['calendar_event:shared-event', 'wiki_page:shared-page']);
  assert.equal(authorizedGraphRow(row(), { authorizedPageIds: pages, authorizedEntityKeys: entities }), true);
  assert.equal(authorizedGraphRow(row({ targetEntityId: 'hidden-page' }),
    { authorizedPageIds: pages, authorizedEntityKeys: entities }), false);
  assert.equal(authorizedGraphRow(row({ sourceEntityId: 'hidden-event' }),
    { authorizedPageIds: pages, authorizedEntityKeys: entities }), false);
  assert.equal(authorizedGraphRow(row({ sourcePageId: 'hidden-page' }),
    { authorizedPageIds: pages, authorizedEntityKeys: entities }), false);
  assert.equal(authorizedGraphRow(row({ visibility: 'unknown' }),
    { authorizedPageIds: pages, authorizedEntityKeys: entities }), false);
  const wikiRow = row({ sourceEntityType: 'wiki_page', sourceEntityId: 'shared-page',
    targetEntityId: 'other-visible-page', sourceDomain: 'wiki_link' });
  const wikiEntities = new Set(['wiki_page:shared-page', 'wiki_page:other-visible-page']);
  assert.equal(authorizedGraphRow(wikiRow, { authorizedPageIds: pages,
    authorizedEntityKeys: wikiEntities, generatedWikiPairs: new Set() }), false);
  assert.equal(authorizedGraphRow(wikiRow, { authorizedPageIds: pages,
    authorizedEntityKeys: wikiEntities,
    generatedWikiPairs: new Set(['shared-page:other-visible-page']) }), true);
});

test('generated graph edges inherit authorized endpoints without changing explicit restrictions', () => {
  const entities = new Set(['calendar_event:shared-event', 'wiki_page:shared-page']);
  assert.equal(rowForAudience(row(), entities).visibility, 'PUBLIC');
  assert.equal(rowForAudience(row({ visibility: 'GM_ONLY' }), entities).visibility, 'GM_ONLY');
  assert.equal(rowForAudience(row({ sourceDomain: 'unrecognized' }), entities).visibility, null);
  assert.deepEqual(rowForAudience(row({ sourceDomain: 'wiki_link', payload: { aliasText: 'Hidden alias' } }), entities).payload,
    { kind: 'WIKI_REFERENCE' });
  assert.equal(rowForAudience(row()).visibility, null);
});

test('Party graph payload removes hidden page references before serializing edges', () => {
  const projected = rowForAudience(row({ visibility: 'PARTY', payload: {
    note: '[Secret](/campaigns/red-sands/wiki/secret-page)',
    related: [{ pageId: 'secret-page', description: 'Secret description' },
      { pageId: 'shared-page', label: 'Shared label' }],
  } }), new Set(['calendar_event:shared-event', 'wiki_page:shared-page']), new Set(['shared-page']));
  assert.deepEqual(projected.payload, { note: '', related: [{ pageId: 'shared-page', label: 'Shared label' }] });
  assert.equal(projected.sourceRecordKey, projected.id);
});
