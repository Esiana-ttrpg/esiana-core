/**
 * Keyboard interaction contract for wikiLink inline atoms (v0.9).
 *
 * | Key | Cursor adjacent | Node selected (NodeSelection) | Edit unresolved selected |
 * |-----|-----------------|-------------------------------|--------------------------|
 * | ←/→ | Select adjacent wikiLink when moving into it | Exit selection (cursor before/after) | same |
 * | Backspace | Delete link (desktop); touch: select first if not selected | Delete link (edit only) | same |
 * | Delete | Delete link after cursor (desktop); touch: select first | Delete link (edit only) | same |
 * | Enter | — | Read: navigate target; Edit unresolved: open resolve menu | open resolve menu |
 * | Escape | — | Clear selection / dismiss popovers | dismiss resolve menu |
 *
 * Read-only editors: delete keys no-op; Enter navigates when resolved.
 * Touch two-step delete matches iOS token UX (see isTouchDevice).
 */
import type { Editor } from '@tiptap/core';
import { NodeSelection } from '@tiptap/pm/state';
import type { EditorState } from '@tiptap/pm/state';
import { isTouchDevice } from './wikiLinkInteraction';

export function isWikiLinkNodeSelection(state: EditorState): boolean {
  const { selection } = state;
  return (
    selection instanceof NodeSelection &&
    selection.node.type.name === 'wikiLink'
  );
}

export function wikiLinkSelectionPos(state: EditorState): number | null {
  if (!isWikiLinkNodeSelection(state)) return null;
  return (state.selection as NodeSelection).from;
}

/** Move into an adjacent wikiLink or exit when one is selected. */
export function handleWikiLinkArrowLeft(editor: Editor): boolean {
  const { state } = editor;
  const { selection } = state;

  if (isWikiLinkNodeSelection(state)) {
    const from = (selection as NodeSelection).from;
    return editor.commands.setTextSelection(from);
  }

  if (!selection.empty) return false;

  const { $from } = selection;
  const nodeBefore = $from.nodeBefore;
  if (nodeBefore?.type.name !== 'wikiLink') return false;

  return editor.commands.setNodeSelection($from.pos - nodeBefore.nodeSize);
}

export function handleWikiLinkArrowRight(editor: Editor): boolean {
  const { state } = editor;
  const { selection } = state;

  if (isWikiLinkNodeSelection(state)) {
    const sel = selection as NodeSelection;
    return editor.commands.setTextSelection(sel.from + sel.node.nodeSize);
  }

  if (!selection.empty) return false;

  const { $from } = selection;
  const nodeAfter = $from.nodeAfter;
  if (nodeAfter?.type.name !== 'wikiLink') return false;

  return editor.commands.setNodeSelection($from.pos);
}

function deleteWikiLinkRange(editor: Editor, from: number, to: number): boolean {
  if (!editor.isEditable) return false;
  return editor.commands.deleteRange({ from, to });
}

/** Backspace at wikiLink boundary or on selected node. */
export function handleWikiLinkBackspace(editor: Editor): boolean {
  const { state } = editor;
  const { selection } = state;

  if (isWikiLinkNodeSelection(state)) {
    const sel = selection as NodeSelection;
    return deleteWikiLinkRange(editor, sel.from, sel.from + sel.node.nodeSize);
  }

  if (!selection.empty) return false;

  const { $from } = selection;
  const nodeBefore = $from.nodeBefore;
  if (nodeBefore?.type.name !== 'wikiLink') return false;

  const from = $from.pos - nodeBefore.nodeSize;
  const nodeSelected =
    selection instanceof NodeSelection &&
    selection.from === from &&
    selection.node.type.name === 'wikiLink';

  if (isTouchDevice() && !nodeSelected) {
    return editor.commands.setNodeSelection(from);
  }

  return deleteWikiLinkRange(editor, from, $from.pos);
}

/** Delete key at wikiLink boundary or on selected node. */
export function handleWikiLinkDelete(editor: Editor): boolean {
  const { state } = editor;
  const { selection } = state;

  if (isWikiLinkNodeSelection(state)) {
    const sel = selection as NodeSelection;
    return deleteWikiLinkRange(editor, sel.from, sel.from + sel.node.nodeSize);
  }

  if (!selection.empty) return false;

  const { $from } = selection;
  const nodeAfter = $from.nodeAfter;
  if (nodeAfter?.type.name !== 'wikiLink') return false;

  const to = $from.pos + nodeAfter.nodeSize;
  const nodeSelected =
    selection instanceof NodeSelection &&
    selection.from === $from.pos &&
    selection.node.type.name === 'wikiLink';

  if (isTouchDevice() && !nodeSelected) {
    return editor.commands.setNodeSelection($from.pos);
  }

  return deleteWikiLinkRange(editor, $from.pos, to);
}

/** Clear wikiLink NodeSelection (Escape). */
export function handleWikiLinkEscapeSelection(editor: Editor): boolean {
  const { state } = editor;
  if (!isWikiLinkNodeSelection(state)) return false;

  const sel = state.selection as NodeSelection;
  return editor.commands.setTextSelection(sel.from + sel.node.nodeSize);
}

export type WikiLinkKeyboardAction =
  | { type: 'navigate'; pageId: string }
  | { type: 'resolve' };

/** Enter on selected wikiLink — returns action for node view; true if handled. */
export function resolveWikiLinkEnterAction(
  editor: Editor,
): WikiLinkKeyboardAction | null {
  const { state } = editor;
  if (!isWikiLinkNodeSelection(state)) return null;

  const attrs = (state.selection as NodeSelection).node
    .attrs as {
    targetPageId?: string | null;
    resolved?: boolean;
  };

  const pageId = attrs.targetPageId?.trim() ?? '';
  const resolved = Boolean(pageId && attrs.resolved !== false);

  if (!editor.isEditable) {
    return resolved ? { type: 'navigate', pageId } : null;
  }

  if (!resolved) {
    return { type: 'resolve' };
  }

  return null;
}
