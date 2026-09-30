import assert from 'node:assert/strict';
import test from 'node:test';
import { buildSearchExcerpt } from './searchExcerpt.js';

test('buildSearchExcerpt returns null for title-only callers (no field)', () => {
  // Excerpt helper itself requires a field; callers omit when matchedOn === title.
  assert.equal(
    buildSearchExcerpt(
      { kind: 'body', label: 'Body', text: '' },
      ['besaid'],
    ),
    null,
  );
});

test('buildSearchExcerpt surrounds the first token hit', () => {
  const text =
    'She was raised on the island of Besaid among the faithful of Yevon before leaving.';
  const excerpt = buildSearchExcerpt(
    { kind: 'body', label: 'Body', text },
    ['besaid'],
  );
  assert.ok(excerpt);
  assert.equal(excerpt!.field, 'Body');
  assert.match(excerpt!.text, /Besaid/i);
  assert.ok(excerpt!.text.length < text.length + 5);
});

test('buildSearchExcerpt uses custom field label', () => {
  const excerpt = buildSearchExcerpt(
    {
      kind: 'custom_field',
      label: 'Custom field · Homeland',
      text: 'Besaid',
    },
    ['besaid'],
  );
  assert.ok(excerpt);
  assert.equal(excerpt!.field, 'Custom field · Homeland');
  assert.equal(excerpt!.text, 'Besaid');
});
