import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  parseOrganizationMetadata,
  resolveOrgRelationsAt,
} from './organizationMetadata.js';
import type { ChronologyDateParts } from './chronologyTypes.js';

const NOW: ChronologyDateParts = { year: 100, month: 1, day: 1 };

function hostileEdgesForPages(
  pages: Array<{ id: string; metadata: unknown }>,
  dm: boolean,
): Array<{ fromId: string; toId: string }> {
  const pageById = new Map(pages.map((page) => [page.id, page]));
  const edges: Array<{ fromId: string; toId: string }> = [];

  for (const page of pages) {
    const org = parseOrganizationMetadata(page.metadata);
    const resolved = resolveOrgRelationsAt(org, NOW);
    for (const { relation, event } of resolved) {
      if (!['HOSTILE', 'SECRET_HOSTILE'].includes(event.stance)) continue;
      if (event.stance === 'SECRET_HOSTILE' && !dm) continue;
      if (!pageById.has(relation.targetOrgId)) continue;
      edges.push({ fromId: page.id, toId: relation.targetOrgId });
    }
  }
  return edges;
}

function pairKey(a: string, b: string): string {
  return a < b ? `${a}:${b}` : `${b}:${a}`;
}

function dedupePairs(edges: Array<{ fromId: string; toId: string }>) {
  const pairMap = new Map<string, { a: string; b: string; mutual: boolean }>();
  for (const edge of edges) {
    const key = pairKey(edge.fromId, edge.toId);
    const hasReverse = edges.some(
      (e) => e.fromId === edge.toId && e.toId === edge.fromId,
    );
    const existing = pairMap.get(key);
    if (!existing) {
      const [a, b] =
        edge.fromId < edge.toId
          ? [edge.fromId, edge.toId]
          : [edge.toId, edge.fromId];
      pairMap.set(key, { a, b, mutual: hasReverse });
    } else if (hasReverse) {
      existing.mutual = true;
    }
  }
  return [...pairMap.values()];
}

test('faction conflict feed dedupes unordered hostile pairs and detects mutual hostility', () => {
  const pages = [
    {
      id: 'guild-a',
      metadata: {
        relations: [
          {
            id: 'rel-a-b',
            targetOrgId: 'guild-b',
            history: [
              {
                id: 'evt-a',
                stance: 'HOSTILE',
                relationType: 'RIVAL',
                visibility: 'PARTY',
                effectiveDate: { year: 90, month: 1, day: 1 },
              },
            ],
          },
        ],
      },
    },
    {
      id: 'guild-b',
      metadata: {
        relations: [
          {
            id: 'rel-b-a',
            targetOrgId: 'guild-a',
            history: [
              {
                id: 'evt-b',
                stance: 'HOSTILE',
                relationType: 'RIVAL',
                visibility: 'PARTY',
                effectiveDate: { year: 91, month: 1, day: 1 },
              },
            ],
          },
        ],
      },
    },
  ];

  const edges = hostileEdgesForPages(pages, true);
  const pairs = dedupePairs(edges);
  assert.equal(pairs.length, 1);
  assert.equal(pairs[0]?.mutual, true);
});

test('faction conflict feed hides secret hostile relations from players', () => {
  const pages = [
    {
      id: 'crown',
      metadata: {
        relations: [
          {
            id: 'rel-crown-rebels',
            targetOrgId: 'rebels',
            history: [
              {
                id: 'evt-secret',
                stance: 'SECRET_HOSTILE',
                relationType: 'RIVAL',
                visibility: 'GM_ONLY',
                effectiveDate: { year: 95, month: 1, day: 1 },
              },
            ],
          },
        ],
      },
    },
    { id: 'rebels', metadata: { relations: [] } },
  ];

  const playerEdges = hostileEdgesForPages(pages, false);
  assert.equal(playerEdges.length, 0);

  const dmEdges = hostileEdgesForPages(pages, true);
  assert.equal(dmEdges.length, 1);
  assert.equal(dmEdges[0]?.toId, 'rebels');
});
