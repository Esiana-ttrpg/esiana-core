import assert from 'node:assert/strict';
import { afterEach, describe, it } from 'node:test';
import { Editor } from '@tiptap/core';
import StarterKit from '@tiptap/starter-kit';
import { Markdown } from '@tiptap/markdown';
import { WIKI_ADMONITION_VARIANTS } from '@shared/wikiAdmonition';
import { AdmonitionExtension } from './AdmonitionExtension.js';

function createEditor(content: string) {
  return new Editor({
    extensions: [StarterKit, Markdown, AdmonitionExtension],
    content,
    contentType: 'markdown',
  });
}

describe('AdmonitionExtension', () => {
  const editors: Editor[] = [];

  afterEach(() => {
    while (editors.length > 0) {
      editors.pop()?.destroy();
    }
  });

  it('round-trips fenced admonition markdown', () => {
    const input = `:::insight
If the seal is broken, the ward fails quietly.
:::`;

    const editor = createEditor(input);
    editors.push(editor);

    const markdown = editor.getMarkdown();
    assert.match(markdown, /^:::insight\n/);
    assert.match(markdown, /ward fails quietly/);
    assert.match(markdown, /:::\n\n?$/);
  });

  it('round-trips every variant id in fenced syntax', () => {
    for (const variant of WIKI_ADMONITION_VARIANTS) {
      const input = `:::${variant}\nVariant body for ${variant}.\n:::`;
      const editor = createEditor(input);
      editors.push(editor);

      const json = editor.getJSON();
      const admonition = json.content?.[0];
      assert.equal(admonition?.type, 'admonition');
      assert.equal(admonition?.attrs?.variant, variant);

      const markdown = editor.getMarkdown();
      assert.match(markdown, new RegExp(`^:::${variant}\\n`));
    }
  });

  it('preserves nested inline formatting inside admonitions', () => {
    const input = `:::lore
Crossing after dusk is **never** advisable.
:::`;

    const editor = createEditor(input);
    editors.push(editor);

    const admonition = editor.getJSON().content?.[0];
    assert.equal(admonition?.type, 'admonition');
    const inner = admonition?.content?.[0];
    assert.equal(inner?.type, 'paragraph');
    const bold = inner?.content?.find((node) =>
      node.marks?.some((mark) => mark.type === 'bold'),
    );
    assert.ok(bold);
  });

  it('round-trips html aside fallback', () => {
    const input =
      '<aside data-admonition="record">Ledger entry from the Third Ember.</aside>';

    const editor = createEditor(input);
    editors.push(editor);

    const json = editor.getJSON();
    const admonition = json.content?.[0];
    assert.equal(admonition?.type, 'admonition');
    assert.equal(admonition?.attrs?.variant, 'record');

    const markdown = editor.getMarkdown();
    assert.match(markdown, /^:::record\n/);
  });

  it('insertAdmonition command creates block with default paragraph', () => {
    const editor = createEditor('Intro paragraph.');
    editors.push(editor);

    editor.chain().focus('end').insertAdmonition({ variant: 'thread-seed' }).run();

    const json = editor.getJSON();
    const admonition = json.content?.find((node) => node.type === 'admonition');
    assert.equal(admonition?.type, 'admonition');
    assert.equal(admonition?.attrs?.variant, 'thread-seed');
    assert.equal(admonition?.content?.[0]?.type, 'paragraph');
  });

  it('falls back unknown fenced variant to lore', () => {
    const input = `:::not-a-real-type
Mystery content.
:::`;

    const editor = createEditor(input);
    editors.push(editor);

    const admonition = editor.getJSON().content?.[0];
    assert.equal(admonition?.type, 'paragraph');
  });
});
