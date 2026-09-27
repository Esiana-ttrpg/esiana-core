import assert from 'node:assert/strict';
import test from 'node:test';
import { decodeSourceReference, encodeSourceReference, type SourceReference } from './sourceReferences.js';

const reference: SourceReference = {
  payloadVersion: 1,
  identity: { providerId: 'fixture-library', sourceId: 'book:juniper' },
  metadata: { title: 'Juniper’s Atlas', authors: ['Mira Vale'], year: 2026, kind: 'book' },
  locator: { label: 'p. 42', data: { page: 42 } },
  extensions: { future: { retained: true } },
};

test('source references round-trip Unicode and opaque extensions', () => {
  assert.deepEqual(decodeSourceReference(encodeSourceReference(reference)), reference);
});

test('unknown versions and malformed payloads are inert', () => {
  assert.equal(decodeSourceReference('v2:AAAA'), null);
  assert.equal(decodeSourceReference('v1:not!base64'), null);
});

test('same source may produce distinct citation instances', () => {
  const other = { ...reference, locator: { label: 'Ch. 7', data: { chapter: 7 } } };
  assert.notDeepEqual(decodeSourceReference(encodeSourceReference(reference)), decodeSourceReference(encodeSourceReference(other)));
});
