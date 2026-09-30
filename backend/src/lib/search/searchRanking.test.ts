import assert from 'node:assert/strict';
import test from 'node:test';
import {
  compareRankedResults,
  isExactNameTier,
  rankSearchDocument,
  TIER,
  type SearchDocument,
} from './searchRanking.js';

function doc(partial: Partial<SearchDocument> & { title: string }): SearchDocument {
  return {
    fields: [],
    inboundLinkCount: 0,
    ...partial,
  };
}

test('rankSearchDocument prefers exact title over body match', () => {
  const yuna = doc({
    title: 'Yuna',
    fields: [{ kind: 'body', label: 'Body', text: 'raised on the island of Besaid' }],
  });
  const besaid = doc({
    title: 'Besaid',
    fields: [{ kind: 'body', label: 'Body', text: 'small island village' }],
  });

  const yunaByName = rankSearchDocument(yuna, ['yuna'], 'yuna');
  const besaidByName = rankSearchDocument(besaid, ['besaid'], 'besaid');
  const yunaByBody = rankSearchDocument(yuna, ['besaid'], 'besaid');

  assert.ok(yunaByName);
  assert.equal(yunaByName!.matchedOn, 'title');
  assert.ok(besaidByName);
  assert.equal(besaidByName!.matchedOn, 'title');
  assert.ok(yunaByBody);
  assert.equal(yunaByBody!.matchedOn, 'body');
  assert.ok(yunaByName!.score > yunaByBody!.score);
  assert.ok(besaidByName!.score > yunaByBody!.score);
});

test('rankSearchDocument ranks title prefix above alias and body', () => {
  const titled = doc({ title: 'Besaid Village' });
  const aliased = doc({
    title: 'Isle of Stars',
    fields: [{ kind: 'alias', label: 'Alias', text: 'Besaid' }],
  });
  const bodied = doc({
    title: 'Yuna',
    fields: [{ kind: 'body', label: 'Body', text: '...Besaid...' }],
  });

  const a = rankSearchDocument(titled, ['besaid'], 'besaid')!;
  const b = rankSearchDocument(aliased, ['besaid'], 'besaid')!;
  const c = rankSearchDocument(bodied, ['besaid'], 'besaid')!;
  assert.ok(a.score > b.score);
  assert.ok(b.score > c.score);
  assert.equal(a.matchedOn, 'title');
  assert.equal(b.matchedOn, 'alias');
  assert.equal(c.matchedOn, 'body');
});

test('rankSearchDocument requires all tokens', () => {
  const page = doc({
    title: 'Yuna',
    fields: [{ kind: 'body', label: 'Body', text: 'Besaid island' }],
  });
  assert.equal(rankSearchDocument(page, ['besaid', 'zanarkand'], 'besaid zanarkand'), null);
  assert.ok(rankSearchDocument(page, ['besaid', 'island'], 'besaid island'));
});

test('compareRankedResults sorts by score then title', () => {
  const rows = [
    { score: 10, title: 'B' },
    { score: 20, title: 'Z' },
    { score: 10, title: 'A' },
  ];
  rows.sort(compareRankedResults);
  assert.deepEqual(
    rows.map((r) => r.title),
    ['Z', 'A', 'B'],
  );
});

test('title specificity prefers shorter exact-ish names', () => {
  const yuna = rankSearchDocument(doc({ title: 'Yuna', typeKey: 'character' }), ['yun'], 'yun')!;
  const yunalesca = rankSearchDocument(
    doc({ title: 'Yunalesca', typeKey: 'character' }),
    ['yun'],
    'yun',
  )!;
  assert.ok(yuna.score > yunalesca.score);
  assert.ok((yuna.explain?.signals as Record<string, number>).specificity! >
    (yunalesca.explain?.signals as Record<string, number>).specificity!);
});

test('exact-title neutrality: character and session-note titled Yuna score equal on tier+prior', () => {
  const character = rankSearchDocument(
    doc({ title: 'Yuna', typeKey: 'character' }),
    ['yuna'],
    'yuna',
  )!;
  const note = rankSearchDocument(
    doc({ title: 'Yuna', typeKey: 'session-note' }),
    ['yuna'],
    'yuna',
  )!;
  assert.equal(character.matchedOn, 'title');
  assert.equal(note.matchedOn, 'title');
  assert.ok(isExactNameTier(character.score));
  assert.ok(isExactNameTier(note.score));
  // Type prior must not apply on exact title.
  assert.equal((character.explain?.signals as Record<string, number>).typePrior, undefined);
  assert.equal((note.explain?.signals as Record<string, number>).typePrior, undefined);
  assert.equal(character.score, note.score);
});

test('type prior boosts entity prefix over record prefix', () => {
  const character = rankSearchDocument(
    doc({ title: 'Yuna of Spira', typeKey: 'character' }),
    ['yuna'],
    'yuna',
  )!;
  const note = rankSearchDocument(
    doc({ title: 'Yuna session recap', typeKey: 'session-note' }),
    ['yuna'],
    'yuna',
  )!;
  assert.ok(character.score > note.score);
  assert.equal((character.explain?.signals as Record<string, number>).typePrior, 20_000);
  assert.equal((note.explain?.signals as Record<string, number>).typePrior, undefined);
});

test('recency orders body matches', () => {
  const now = Date.UTC(2026, 8, 30);
  const recent = rankSearchDocument(
    doc({
      title: 'Recent Note',
      typeKey: 'session-note',
      fields: [{ kind: 'body', label: 'Body', text: 'Yuna arrived' }],
      recencyAt: new Date(now),
    }),
    ['yuna'],
    'yuna',
    { now },
  )!;
  const old = rankSearchDocument(
    doc({
      title: 'Old Note',
      typeKey: 'session-note',
      fields: [{ kind: 'body', label: 'Body', text: 'Yuna arrived' }],
      recencyAt: new Date(now - 180 * 24 * 60 * 60 * 1000),
    }),
    ['yuna'],
    'yuna',
    { now },
  )!;
  assert.ok(recent.score > old.score);
});

test('occurrence density boosts body matches that repeat the token', () => {
  const dense = rankSearchDocument(
    doc({
      title: 'Dense',
      fields: [
        {
          kind: 'body',
          label: 'Body',
          text: 'Yuna Yuna Yuna Yuna Yuna met Tidus',
        },
      ],
    }),
    ['yuna'],
    'yuna',
  )!;
  const sparse = rankSearchDocument(
    doc({
      title: 'Sparse',
      fields: [{ kind: 'body', label: 'Body', text: 'Yuna met Tidus' }],
    }),
    ['yuna'],
    'yuna',
  )!;
  assert.ok(dense.score > sparse.score);
});

test('fuzzy tiers sit between alias and metadata', () => {
  const fuzzy = rankSearchDocument(
    doc({
      title: 'Besaid',
      typeKey: 'location',
      fuzzy: { similarity: 0.8, on: 'title' },
    }),
    ['besiad'],
    'besiad',
  )!;
  const alias = rankSearchDocument(
    doc({
      title: 'Isle of Stars',
      fields: [{ kind: 'alias', label: 'Alias', text: 'Besaid' }],
    }),
    ['besaid'],
    'besaid',
  )!;
  const meta = rankSearchDocument(
    doc({
      title: 'Other',
      fields: [{ kind: 'metadata', label: 'Region', text: 'Besaid region' }],
    }),
    ['besaid'],
    'besaid',
  )!;
  assert.equal(fuzzy.matchedOn, 'title_fuzzy');
  assert.ok(alias.score > fuzzy.score);
  assert.ok(fuzzy.score > meta.score);
  assert.ok(fuzzy.score >= TIER.fuzzyTitle);
});
