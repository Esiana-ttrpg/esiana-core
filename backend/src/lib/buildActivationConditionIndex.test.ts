import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { EntityRelationKinds } from '../../../shared/entityGraph.js';
import { liveGraphEdgeKey } from '../../../shared/narrativeBranchAnalysis.js';
import { buildExpectedSourceRecordKeysFromPages } from './buildActivationConditionIndex.js';

describe('buildExpectedSourceRecordKeysFromPages', () => {
  it('includes wiki_link keys for current outgoing links only', () => {
    const keys = buildExpectedSourceRecordKeysFromPages([
      {
        id: 'page-a',
        title: 'Page A',
        parentId: null,
        metadata: {},
        outgoingLinks: [
          {
            id: 'link-1',
            targetPageId: 'page-b',
            aliasText: null,
            targetPage: { title: 'Page B' },
          },
        ],
      },
    ]);
    assert.ok(keys.has('wiki_link:link-1'));
    assert.ok(!keys.has('wiki_link:deleted-link'));
  });

  it('omits stale wiki_link keys when link row is gone', () => {
    const freshKeys = buildExpectedSourceRecordKeysFromPages([
      {
        id: 'page-a',
        title: 'Page A',
        parentId: null,
        metadata: {},
        outgoingLinks: [],
      },
    ]);
    const staleSourceRecordKey = 'wiki_link:removed-link';
    assert.ok(!freshKeys.has(staleSourceRecordKey));

    const liveGraphEdges = new Set<string>();
    const sourcePageId = 'page-a';
    const targetPageId = 'page-b';
    if (freshKeys.has(staleSourceRecordKey)) {
      liveGraphEdges.add(
        liveGraphEdgeKey(sourcePageId, targetPageId, EntityRelationKinds.WIKI_REFERENCE),
      );
    }
    assert.equal(liveGraphEdges.size, 0);
  });
});
