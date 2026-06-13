import assert from 'node:assert/strict';
import test from 'node:test';
import {
  EntityRelationKinds,
  EntityRelationSourceDomains,
} from '../../../shared/entityGraph.js';
import {
  extractWikiPageGraphEdges,
  type WikiPageGraphExtractInput,
} from './entityRelationExtractors.js';

test('extractWikiPageGraphEdges writes undirected location pairs', () => {
  const input: WikiPageGraphExtractInput = {
    pageId: 'loc-a',
    title: 'Alpha',
    parentId: null,
    metadata: {
      relatedLocationIds: ['loc-b'],
    },
    wikiLinks: [],
  };
  const rows = extractWikiPageGraphEdges(input);
  const related = rows.filter((row) => row.relationKind === EntityRelationKinds.LOCATION_RELATED);
  assert.equal(related.length, 2);
  assert.ok(related.some((row) => row.sourceRecordKey.endsWith(':forward')));
  assert.ok(related.some((row) => row.sourceRecordKey.endsWith(':reverse')));
});

test('extractWikiPageGraphEdges emits wiki link rows', () => {
  const rows = extractWikiPageGraphEdges({
    pageId: 'p1',
    title: 'Source',
    parentId: null,
    metadata: {},
    wikiLinks: [{ id: 'wl1', targetPageId: 'p2', aliasText: 'Target' }],
  });
  assert.equal(rows.length, 1);
  assert.equal(rows[0]?.sourceDomain, EntityRelationSourceDomains.WIKI_LINK);
  assert.equal(rows[0]?.sourceRecordKey, 'wiki_link:wl1');
});
