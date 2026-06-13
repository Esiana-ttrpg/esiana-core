import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  RELATIONS_RENDER_CAP_DEFAULTS,
  buildRelationsTruncation,
  resolveRelationsRenderCaps,
  truncationUserMessage,
} from './relationsRenderCaps.js';

describe('resolveRelationsRenderCaps', () => {
  it('uses defaults when settings are null', () => {
    assert.deepEqual(resolveRelationsRenderCaps(null), RELATIONS_RENDER_CAP_DEFAULTS);
  });

  it('clamps admin overrides', () => {
    assert.deepEqual(
      resolveRelationsRenderCaps({
        relationsMaxVisibleNodes: 999,
        relationsMaxVisibleEdges: 10,
      }),
      { maxVisibleNodes: 100, maxVisibleEdges: 40 },
    );
  });
});

describe('buildRelationsTruncation', () => {
  it('reports node_cap when nodes are hidden', () => {
    const t = buildRelationsTruncation({
      visibleNodes: 40,
      totalNodes: 58,
      visibleEdges: 10,
      totalEdges: 10,
      caps: RELATIONS_RENDER_CAP_DEFAULTS,
    });
    assert.equal(t.truncationReason, 'node_cap');
    assert.equal(t.hiddenNodes, 18);
    assert.equal(truncationUserMessage(t), '+18 more connections hidden');
  });

  it('reports cluster when provided', () => {
    const t = buildRelationsTruncation({
      visibleNodes: 8,
      totalNodes: 8,
      visibleEdges: 4,
      totalEdges: 51,
      caps: RELATIONS_RENDER_CAP_DEFAULTS,
      reasons: ['cluster'],
    });
    assert.equal(t.truncationReason, 'cluster');
  });
});
