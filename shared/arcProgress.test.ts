import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { computeArcNodeProgress } from './arcProgress.js';
import type { ArcHierarchyNode } from './arcHierarchyProjection.js';

describe('computeArcNodeProgress', () => {
  it('returns percent from objective completion', () => {
    const node: ArcHierarchyNode = {
      kind: 'quest',
      id: 'q1',
      title: 'Quest',
      children: [
        {
          kind: 'objective',
          id: 'o1',
          title: 'A',
          objectiveStatus: 'COMPLETED',
          children: [],
        },
        {
          kind: 'objective',
          id: 'o2',
          title: 'B',
          objectiveStatus: 'ACTIVE',
          children: [],
        },
      ],
    };
    const progress = computeArcNodeProgress(node);
    assert.equal(progress?.percent, 50);
    assert.equal(progress?.completed, 1);
    assert.equal(progress?.total, 2);
  });
});
