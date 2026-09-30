import assert from 'node:assert/strict';
import test from 'node:test';
import {
  dedupeByEntityId,
  selectBestMatches,
  shapeSearchResults,
} from './searchResultShaping.js';
import { TIER, type InternalSearchResult } from './searchRanking.js';

function result(
  partial: Partial<InternalSearchResult> &
    Pick<
      InternalSearchResult,
      'id' | 'entityId' | 'title' | 'type' | 'matchedOn' | 'score'
    >,
): InternalSearchResult {
  return {
    campaignId: 'c1',
    href: '/',
    ...partial,
  };
}

test('dedupeByEntityId keeps highest score', () => {
  const rows = [
    result({
      id: 'character:1',
      entityId: '1',
      title: 'Yuna',
      type: { key: 'character', label: 'Character' },
      matchedOn: 'title',
      score: 100,
    }),
    result({
      id: 'plugin:x:1',
      entityId: '1',
      title: 'Yuna',
      type: { key: 'plugin:x:y', label: 'Plugin' },
      matchedOn: 'body',
      score: 50,
    }),
  ];
  const out = dedupeByEntityId(rows);
  assert.equal(out.length, 1);
  assert.equal(out[0]!.score, 100);
});

test('Yuna + 40 session notes: best + mentions totalCount 40 with limit 20', () => {
  const yuna = result({
    id: 'character:yuna',
    entityId: 'yuna',
    title: 'Yuna',
    type: { key: 'character', label: 'Character' },
    matchedOn: 'title',
    score: TIER.exactTitle + 40_000,
    exactName: true,
  });
  const notes = Array.from({ length: 40 }, (_, i) =>
    result({
      id: `session-note:sn${i}`,
      entityId: `sn${i}`,
      title: `Session ${String(i).padStart(2, '0')}`,
      type: { key: 'session-note', label: 'Session Note' },
      matchedOn: 'body',
      score: TIER.body + (40 - i),
    }),
  );
  const shaped = shapeSearchResults({
    results: [yuna, ...notes],
    limit: 20,
    types: null,
  });
  assert.ok(shaped.sections);
  const best = shaped.sections!.find((s) => s.kind === 'best');
  const mentions = shaped.sections!.find((s) => s.kind === 'mentions');
  assert.ok(best);
  assert.equal(best!.totalCount, 1);
  assert.deepEqual(best!.resultIds, ['character:yuna']);
  assert.ok(mentions);
  assert.equal(mentions!.totalCount, 40);
  assert.equal(mentions!.resultIds.length, 3);
  assert.ok(shaped.results.length <= 20);
  assert.ok(shaped.results.length >= 4); // best + 3 mentions
});

test('exact-tier ties all land in best', () => {
  const character = result({
    id: 'character:yuna',
    entityId: 'yuna',
    title: 'Yuna',
    type: { key: 'character', label: 'Character' },
    matchedOn: 'title',
    score: TIER.exactTitle + 10_000,
    exactName: true,
  });
  const note = result({
    id: 'session-note:yuna',
    entityId: 'sn-yuna',
    title: 'Yuna',
    type: { key: 'session-note', label: 'Session Note' },
    matchedOn: 'title',
    score: TIER.exactTitle + 10_000,
    exactName: true,
  });
  const best = selectBestMatches([character, note]);
  assert.equal(best.length, 2);
});

test('dominant prefix qualifies as best; close prefixes do not', () => {
  const dominant = result({
    id: 'character:yuna',
    entityId: 'yuna',
    title: 'Yuna',
    type: { key: 'character', label: 'Character' },
    matchedOn: 'title',
    score: TIER.titlePrefix + 50_000,
  });
  const weak = result({
    id: 'character:yunalesca',
    entityId: 'yunalesca',
    title: 'Yunalesca',
    type: { key: 'character', label: 'Character' },
    matchedOn: 'title',
    score: TIER.titleContains + 5_000, // >= one tier below
  });
  assert.equal(selectBestMatches([dominant, weak]).length, 1);
  assert.equal(selectBestMatches([dominant, weak])[0]!.id, 'character:yuna');

  const closeA = result({
    id: 'character:a',
    entityId: 'a',
    title: 'Yuna A',
    type: { key: 'character', label: 'Character' },
    matchedOn: 'title',
    score: TIER.titlePrefix + 10_000,
  });
  const closeB = result({
    id: 'character:b',
    entityId: 'b',
    title: 'Yuna B',
    type: { key: 'character', label: 'Character' },
    matchedOn: 'title',
    score: TIER.titlePrefix + 9_000,
  });
  assert.equal(selectBestMatches([closeA, closeB]).length, 0);

  // Sole name hit always qualifies.
  assert.equal(selectBestMatches([dominant]).length, 1);
});

test('no sections under a type filter', () => {
  const shaped = shapeSearchResults({
    results: [
      result({
        id: 'character:1',
        entityId: '1',
        title: 'Yuna',
        type: { key: 'character', label: 'Character' },
        matchedOn: 'title',
        score: TIER.exactTitle,
        exactName: true,
      }),
    ],
    limit: 20,
    types: ['character'],
  });
  assert.equal(shaped.sections, undefined);
  assert.equal(shaped.results.length, 1);
});

test('approximate flag when ceiling hit', () => {
  const shaped = shapeSearchResults({
    results: [
      result({
        id: 'character:1',
        entityId: '1',
        title: 'Yuna',
        type: { key: 'character', label: 'Character' },
        matchedOn: 'title',
        score: TIER.exactTitle,
        exactName: true,
      }),
      result({
        id: 'session-note:1',
        entityId: 'sn1',
        title: 'Note',
        type: { key: 'session-note', label: 'Session Note' },
        matchedOn: 'body',
        score: TIER.body,
      }),
    ],
    limit: 20,
    types: null,
    hitCandidateCeiling: true,
  });
  assert.ok(shaped.sections!.every((s) => s.approximate === true));
});
