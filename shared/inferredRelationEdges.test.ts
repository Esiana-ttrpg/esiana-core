import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { EntityGraphEntityTypes, EntityRelationKinds } from './entityGraph.js';
import { augmentWithInferredRelationEdges } from './inferredRelationEdges.js';

describe('augmentWithInferredRelationEdges', () => {
  it('adds shared_faction ties for co-affiliated characters', () => {
    const edges = augmentWithInferredRelationEdges([
      {
        id: 'aff-a',
        source: { entityType: EntityGraphEntityTypes.WIKI_PAGE, entityId: 'char-a' },
        target: { entityType: EntityGraphEntityTypes.WIKI_PAGE, entityId: 'org-1' },
        relationKind: EntityRelationKinds.CHARACTER_AFFILIATION,
        direction: 'directed',
        startDate: null,
        endDate: null,
        visibility: null,
        payload: { kind: EntityRelationKinds.CHARACTER_AFFILIATION, role: null },
        sourceDomain: 'wiki_metadata',
        sourceRecordKey: 'k1',
        sourcePageId: 'char-a',
      },
      {
        id: 'aff-b',
        source: { entityType: EntityGraphEntityTypes.WIKI_PAGE, entityId: 'char-b' },
        target: { entityType: EntityGraphEntityTypes.WIKI_PAGE, entityId: 'org-1' },
        relationKind: EntityRelationKinds.CHARACTER_AFFILIATION,
        direction: 'directed',
        startDate: null,
        endDate: null,
        visibility: null,
        payload: { kind: EntityRelationKinds.CHARACTER_AFFILIATION, role: null },
        sourceDomain: 'wiki_metadata',
        sourceRecordKey: 'k2',
        sourcePageId: 'char-b',
      },
    ]);
    const inferred = edges.filter((e) => e.id.startsWith('inferred:shared_faction'));
    assert.equal(inferred.length, 1);
    assert.equal(
      inferred[0]?.payload?.kind === EntityRelationKinds.CHARACTER_SOCIAL
        ? inferred[0].payload.semantics?.inferenceSource
        : null,
      'shared_faction',
    );
  });
});
