import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { EditorState, NodeSelection, TextSelection } from '@tiptap/pm/state';
import { Schema } from '@tiptap/pm/model';
import type { Editor } from '@tiptap/core';
import {
  handleWikiLinkArrowLeft,
  handleWikiLinkArrowRight,
  handleWikiLinkBackspace,
  handleWikiLinkEscapeSelection,
  isWikiLinkNodeSelection,
  resolveWikiLinkEnterAction,
} from './wikiLinkKeyboard.js';

const schema = new Schema({
  nodes: {
    doc: { content: 'block+' },
    paragraph: { group: 'block', content: 'inline*' },
    text: { group: 'inline' },
    wikiLink: {
      inline: true,
      group: 'inline',
      atom: true,
      selectable: true,
      attrs: {
        targetPageId: { default: null },
        label: { default: '' },
        resolved: { default: false },
      },
    },
  },
});

function buildDoc(resolved: boolean) {
  const link = schema.nodes.wikiLink.create({
    targetPageId: resolved ? 'p1' : null,
    label: 'Test',
    resolved,
  });
  const para = schema.nodes.paragraph.create(null, [
    schema.text('before '),
    link,
    schema.text(' after'),
  ]);
  return schema.nodes.doc.create(null, [para]);
}

function wikiLinkPos(doc: ReturnType<typeof buildDoc>): number {
  let pos = 1;
  const para = doc.firstChild!;
  pos += para.child(0).nodeSize;
  return pos;
}

function createMockEditor(
  doc: ReturnType<typeof buildDoc>,
  selectionPos: number,
  nodeSelection: boolean,
  editable = true,
) {
  let state = EditorState.create({
    doc,
    selection: nodeSelection
      ? NodeSelection.create(doc, selectionPos)
      : TextSelection.create(doc, selectionPos),
  });

  const editor = {
    get state() {
      return state;
    },
    get isEditable() {
      return editable;
    },
    commands: {
      setNodeSelection(pos: number) {
        state = state.apply(state.tr.setSelection(NodeSelection.create(state.doc, pos)));
        return true;
      },
      setTextSelection(pos: number) {
        state = state.apply(state.tr.setSelection(TextSelection.create(state.doc, pos)));
        return true;
      },
      deleteRange({ from, to }: { from: number; to: number }) {
        state = state.apply(state.tr.delete(from, to));
        return true;
      },
    },
  } as unknown as Editor;

  return {
    editor,
    get state() {
      return state;
    },
  };
}

describe('wikiLinkKeyboard', () => {
  it('isWikiLinkNodeSelection detects selected wikiLink', () => {
    const doc = buildDoc(true);
    const { state } = createMockEditor(doc, wikiLinkPos(doc), true);
    assert.equal(isWikiLinkNodeSelection(state), true);
  });

  it('handleWikiLinkArrowLeft selects wikiLink when cursor is after it', () => {
    const doc = buildDoc(true);
    const linkPos = wikiLinkPos(doc);
    const afterLink = linkPos + doc.nodeAt(linkPos)!.nodeSize;
    const harness = createMockEditor(doc, afterLink, false);

    assert.equal(handleWikiLinkArrowLeft(harness.editor), true);
    assert.equal(isWikiLinkNodeSelection(harness.state), true);
  });

  it('handleWikiLinkArrowRight exits selection to after the node', () => {
    const doc = buildDoc(true);
    const harness = createMockEditor(doc, wikiLinkPos(doc), true);

    assert.equal(handleWikiLinkArrowRight(harness.editor), true);
    assert.equal(isWikiLinkNodeSelection(harness.state), false);
  });

  it('handleWikiLinkBackspace deletes selected wikiLink in edit mode', () => {
    const doc = buildDoc(true);
    const harness = createMockEditor(doc, wikiLinkPos(doc), true, true);

    assert.equal(handleWikiLinkBackspace(harness.editor), true);
    assert.equal(harness.state.doc.textContent, 'before  after');
  });

  it('handleWikiLinkBackspace no-ops in read-only mode', () => {
    const doc = buildDoc(true);
    const harness = createMockEditor(doc, wikiLinkPos(doc), true, false);

    assert.equal(handleWikiLinkBackspace(harness.editor), false);
    assert.match(harness.state.doc.textContent, /before/);
  });

  it('handleWikiLinkEscapeSelection clears NodeSelection', () => {
    const doc = buildDoc(true);
    const harness = createMockEditor(doc, wikiLinkPos(doc), true);

    assert.equal(handleWikiLinkEscapeSelection(harness.editor), true);
    assert.equal(isWikiLinkNodeSelection(harness.state), false);
  });

  it('resolveWikiLinkEnterAction returns navigate in read mode when resolved', () => {
    const doc = buildDoc(true);
    const harness = createMockEditor(doc, wikiLinkPos(doc), true, false);

    assert.deepEqual(resolveWikiLinkEnterAction(harness.editor), {
      type: 'navigate',
      pageId: 'p1',
    });
  });

  it('resolveWikiLinkEnterAction returns resolve in edit mode when stub', () => {
    const doc = buildDoc(false);
    const harness = createMockEditor(doc, wikiLinkPos(doc), true, true);

    assert.deepEqual(resolveWikiLinkEnterAction(harness.editor), {
      type: 'resolve',
    });
  });
});
