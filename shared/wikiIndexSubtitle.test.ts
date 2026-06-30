import assert from 'node:assert/strict';
import { test } from 'node:test';
import { buildWikiIndexSubtitle } from './wikiIndexSubtitle.js';

test('buildWikiIndexSubtitle joins primary organization fields', () => {
  const subtitle = buildWikiIndexSubtitle(
    {
      fields: [
        { key: 'Type', value: 'Guild' },
        { key: 'World State', value: 'Rising' },
        { key: 'Region', value: 'North' },
      ],
    },
    'Organizations',
  );
  assert.equal(subtitle, 'Guild · Rising');
});

test('buildWikiIndexSubtitle uses character quickInfo fields', () => {
  const subtitle = buildWikiIndexSubtitle(
    {
      quickInfo: [
        { key: 'Role', value: 'Captain' },
        { key: 'Affiliation', value: 'Silver Company' },
      ],
    },
    'Characters',
  );
  assert.equal(subtitle, 'Captain · Silver Company');
});

test('buildWikiIndexSubtitle returns null when no displayable values', () => {
  assert.equal(
    buildWikiIndexSubtitle({ fields: [{ key: 'Type', value: '—' }] }, 'Objects'),
    null,
  );
});
