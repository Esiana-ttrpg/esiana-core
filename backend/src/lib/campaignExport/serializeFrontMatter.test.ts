import assert from 'node:assert/strict';
import test from 'node:test';
import { parseMarkdownFrontMatter } from '../markdownFrontMatter.js';
import {
  composeMarkdownDocument,
  serializeFrontMatter,
} from './serializeFrontMatter.js';

test('serializeFrontMatter emits YAML block with tags list', () => {
  const yaml = serializeFrontMatter({
    title: 'Gandalf',
    tags: ['wizard', 'mentor'],
    customFields: { esiana_id: 'page-1', visibility: 'Party' },
  });

  assert.match(yaml, /^---\n/);
  assert.match(yaml, /title: Gandalf/);
  assert.match(yaml, /tags:/);
  assert.match(yaml, /- wizard/);
});

test('composeMarkdownDocument round-trips core frontmatter fields', () => {
  const doc = composeMarkdownDocument(
    {
      title: 'Test Page',
      blurb: 'A short summary',
      tags: ['lore'],
      customFields: { esiana_id: 'abc123' },
    },
    '# Body\n\nHello world.',
  );

  const parsed = parseMarkdownFrontMatter(doc);
  assert.equal(parsed.frontMatter.title, 'Test Page');
  assert.equal(parsed.frontMatter.blurb, 'A short summary');
  assert.deepEqual(parsed.frontMatter.tags, ['lore']);
  assert.equal(parsed.frontMatter.customFields.esiana_id, 'abc123');
  assert.match(parsed.bodyMarkdown, /Hello world/);
});
