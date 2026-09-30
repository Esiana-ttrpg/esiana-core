import assert from 'node:assert/strict';
import test from 'node:test';
import {
  compareRankedResults,
  rankSearchDocument,
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
