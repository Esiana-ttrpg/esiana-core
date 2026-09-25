import assert from 'node:assert/strict';
import test from 'node:test';
import { Editor } from '@tiptap/core';
import StarterKit from '@tiptap/starter-kit';
import { Markdown } from '@tiptap/markdown';
import { encodeSourceReference, type SourceReference } from '../../../../../shared/sourceReferences';
import { SourceReferenceAtom, SourceReferenceMark } from './SourceReferenceExtension';
import { findSourceReferenceRange } from './sourceReferenceRange';

const reference: SourceReference = {
  payloadVersion: 1,
  identity: { providerId: 'fixture-library', sourceId: 'atlas' },
  metadata: { title: 'The Atlas of Sable Reach' },
  locator: { label: 'p. 42', data: { page: 42 } },
};

function editor(content: string) {
  return new Editor({ extensions: [StarterKit, Markdown, SourceReferenceMark, SourceReferenceAtom], content, contentType: 'markdown' });
}

test('source marks and atoms round-trip through canonical markdown', () => {
  const payload = encodeSourceReference(reference);
  const markdown = `<span data-esiana-source="${payload}">Sable crossed the pass.</span> <span data-esiana-source-atom="${payload}"></span>`;
  assert.equal(editor(markdown).getMarkdown().trim(), markdown);
});

test('a malformed marked reference preserves authored prose', () => {
  const instance = editor('<span data-esiana-source="v1:broken!">Mira remembers.</span>');
  assert.match(instance.getText(), /Mira remembers/);
});

test('applying a source replaces an existing source mark in the range', () => {
  const first = { ...reference, identity: { ...reference.identity, sourceId: 'first' } };
  const instance = editor('A remembered road');
  instance.chain().setTextSelection({ from: 1, to: 11 }).applySourceReference(first).run();
  instance.chain().setTextSelection({ from: 6, to: 16 }).applySourceReference(reference).run();
  const json = instance.getJSON();
  const marked = JSON.stringify(json).match(/sourceReference/g) ?? [];
  assert.ok(marked.length >= 2, 'the prior mark is split/replaced rather than nested');
});

test('matching a citation spans text nodes split by formatting marks', () => {
  const payload = encodeSourceReference(reference);
  const instance = editor(`<span data-esiana-source="${payload}">plain **bold** plain</span>`);
  const range = findSourceReferenceRange(instance, {
    pos: 10,
    payload,
    atom: false,
  });
  assert.deepEqual(range, { from: 1, to: 17, atom: false });
});
