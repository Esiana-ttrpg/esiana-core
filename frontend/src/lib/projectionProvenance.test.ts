import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { buildProjectionProvenance } from './projectionProvenance.ts';

describe('projectionProvenance', () => {
  it('builds serializable provenance objects', () => {
    const provenance = buildProjectionProvenance({
      relationIds: ['rel-1', 'evt-1'],
      lineageIds: ['link-1'],
      resolvedFromDate: { year: 402, month: null, day: null },
    });

    assert.deepEqual(provenance.sourceRelationIds, ['rel-1', 'evt-1']);
    assert.deepEqual(provenance.sourceLineageIds, ['link-1']);
    assert.deepEqual(provenance.resolvedFromDate, { year: 402, month: null, day: null });
    assert.doesNotThrow(() => JSON.parse(JSON.stringify(provenance)));
  });
});
