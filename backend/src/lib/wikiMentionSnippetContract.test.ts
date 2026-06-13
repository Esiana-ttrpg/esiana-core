import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, it } from 'node:test';
import { extractMentionSnippetFromBlocks } from './sessionMentionSnippet.js';

const backendRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '..',
);

describe('mention-snippet lazy hydration contract', () => {
  it('extractMentionSnippetFromBlocks returns excerpt for wikiLink blocks', () => {
    const blocks = [
      {
        type: 'text-tiptap',
        content: {
          type: 'doc',
          content: [
            {
              type: 'paragraph',
              content: [
                { type: 'text', text: 'Met ' },
                {
                  type: 'wikiLink',
                  attrs: {
                    targetPageId: 'char-mario',
                    label: 'Mario',
                    resolved: true,
                  },
                },
                { type: 'text', text: ' at the docks.' },
              ],
            },
          ],
        },
      },
    ];
    const snippet = extractMentionSnippetFromBlocks(blocks, 'char-mario');
    assert.ok(snippet);
    assert.match(snippet!, /Mario/);
  });

  it('getWikiBacklinksForPage does not hydrate blocks or contextSnippet', () => {
    const source = readFileSync(
      path.join(backendRoot, 'lib', 'wikiLinkService.ts'),
      'utf8',
    );
    const fnStart = source.indexOf('export async function getWikiBacklinksForPage');
    assert.ok(fnStart >= 0);
    const fnBody = source.slice(fnStart, fnStart + 2500);
    assert.doesNotMatch(fnBody, /\bblocks\b/);
    assert.doesNotMatch(fnBody, /contextSnippet/);
    assert.doesNotMatch(fnBody, /extractMentionSnippetFromBlocks/);
  });
});
