import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  EDITOR_HIGHLIGHT_COLOR_ORDER,
  EDITOR_TEXT_COLOR_ORDER,
  editorHighlightVar,
  editorTextVar,
  isEditorHighlightColorId,
  isEditorTextColorId,
} from './editorColorTokens.js';

describe('editorColorTokens', () => {
  it('validates text color ids', () => {
    assert.equal(isEditorTextColorId('rose'), true);
    assert.equal(isEditorTextColorId('pink'), true);
    assert.equal(isEditorTextColorId('yellow'), false);
    assert.equal(isEditorTextColorId(''), false);
  });

  it('validates highlight color ids', () => {
    assert.equal(isEditorHighlightColorId('violet'), true);
    assert.equal(isEditorHighlightColorId('amber'), true);
    assert.equal(isEditorHighlightColorId('rose'), false);
    assert.equal(isEditorHighlightColorId('yellow'), false);
  });

  it('orders expressive colors before neutrals for text', () => {
    assert.deepEqual(EDITOR_TEXT_COLOR_ORDER.slice(0, 4), [
      'rose',
      'pink',
      'violet',
      'blue',
    ]);
    assert.deepEqual(EDITOR_TEXT_COLOR_ORDER.slice(-3), ['gray', 'slate', 'brown']);
  });

  it('orders expressive colors before gray for highlights', () => {
    assert.deepEqual(EDITOR_HIGHLIGHT_COLOR_ORDER.slice(0, 3), [
      'pink',
      'violet',
      'blue',
    ]);
    assert.equal(EDITOR_HIGHLIGHT_COLOR_ORDER.at(-1), 'gray');
  });

  it('maps token ids to css variable names', () => {
    assert.equal(editorTextVar('pink'), '--editor-text-pink');
    assert.equal(editorHighlightVar('violet'), '--editor-highlight-violet');
  });
});
