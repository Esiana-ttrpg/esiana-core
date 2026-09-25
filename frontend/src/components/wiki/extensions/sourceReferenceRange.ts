import { getMarkRange } from '@tiptap/core';
import type { Editor } from '@tiptap/react';

export interface SourceRangeTarget {
  pos: number;
  payload: string;
  atom: boolean;
}

export function findSourceReferenceRange(
  editor: Editor,
  target: SourceRangeTarget,
): { from: number; to: number; atom: boolean } | null {
  let found: { from: number; to: number; atom: boolean } | null = null;
  editor.state.doc.descendants((node, pos) => {
    if (found) return false;
    if (
      target.atom &&
      node.type.name === 'sourceReferenceAtom' &&
      node.attrs.payload === target.payload &&
      Math.abs(pos - target.pos) <= 2
    ) {
      found = { from: pos, to: pos + node.nodeSize, atom: true };
      return false;
    }
    if (
      !target.atom &&
      node.isText &&
      node.marks.some(
        (mark) =>
          mark.type.name === 'sourceReference' &&
          mark.attrs.payload === target.payload,
      ) &&
      target.pos >= pos &&
      target.pos <= pos + node.nodeSize
    ) {
      const range = getMarkRange(
        editor.state.doc.resolve(Math.max(1, target.pos)),
        editor.schema.marks.sourceReference,
        { payload: target.payload },
      );
      found = range ? { ...range, atom: false } : null;
      return false;
    }
    return true;
  });
  return found;
}
