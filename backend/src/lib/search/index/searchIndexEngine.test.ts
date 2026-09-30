import assert from 'node:assert/strict';
import test from 'node:test';
import {
  decodeCursor,
  encodeCursor,
} from './searchIndexEngine.js';
import { buildSimplePrefixTsQuery } from './postgresTsvectorEngine.js';

test('encodeCursor / decodeCursor round-trip and reject foreign engines', () => {
  const cursor = encodeCursor('postgres-tsvector', 2, {
    titleHit: 1,
    updatedAtMs: 1_700_000_000_000,
    id: 'abc',
  });
  const decoded = decodeCursor<{
    titleHit: number;
    updatedAtMs: number;
    id: string;
  }>('postgres-tsvector', 2, cursor);
  assert.deepEqual(decoded, {
    titleHit: 1,
    updatedAtMs: 1_700_000_000_000,
    id: 'abc',
  });

  assert.equal(
    decodeCursor('portable-like', 2, cursor),
    null,
    'foreign engine cursor must be rejected',
  );
  assert.equal(decodeCursor('postgres-tsvector', 1, cursor), null);
  assert.equal(decodeCursor('postgres-tsvector', 2, null), null);
  assert.equal(decodeCursor('postgres-tsvector', 2, 'not-valid'), null);
});

test('buildSimplePrefixTsQuery ANDs prefix terms and escapes quotes', () => {
  assert.equal(buildSimplePrefixTsQuery(['yuna', 'besaid']), "'yuna':* & 'besaid':*");
  assert.equal(buildSimplePrefixTsQuery(["o'brien"]), "'o''brien':*");
  assert.equal(buildSimplePrefixTsQuery(['']), '');
  assert.equal(buildSimplePrefixTsQuery(['well-known']), "'well-known':*");
  assert.equal(buildSimplePrefixTsQuery(['ベサイド', 'yūna']), "'ベサイド':* & 'yūna':*");
});
