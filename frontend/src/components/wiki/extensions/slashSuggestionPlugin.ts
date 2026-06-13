import { Extension } from '@tiptap/core';
import { Plugin, PluginKey } from '@tiptap/pm/state';
import type { EditorView } from '@tiptap/pm/view';

export const wikiSlashPluginKey = new PluginKey('wikiSlashSuggestion');

export type SlashSuggestionState = {
  active: boolean;
  query: string;
  from: number;
  to: number;
  top: number;
  left: number;
};

export type SlashSuggestionOptions = {
  onStateChange?: (state: SlashSuggestionState | null) => void;
};

function isInCodeBlock(view: EditorView): boolean {
  const { from } = view.state.selection;
  const $pos = view.state.doc.resolve(from);
  for (let depth = $pos.depth; depth > 0; depth--) {
    if ($pos.node(depth).type.spec.code) return true;
  }
  return false;
}

export function findSlashQuery(view: EditorView): SlashSuggestionState | null {
  if (isInCodeBlock(view)) return null;

  const { from } = view.state.selection;
  const $pos = view.state.doc.resolve(from);
  const textBefore = $pos.parent.textBetween(
    0,
    $pos.parentOffset,
    undefined,
    '\ufffc',
  );

  const match = /(?:^|\s)\/([^\s/]*)$/.exec(textBefore);
  if (!match) return null;

  const query = match[1];
  const slashStart = from - query.length - 1;
  const coords = view.coordsAtPos(from);

  return {
    active: true,
    query,
    from: slashStart,
    to: from,
    top: coords.bottom + 4,
    left: coords.left,
  };
}

export const WikiSlashSuggestionExtension = Extension.create<SlashSuggestionOptions>({
  name: 'wikiSlashSuggestion',

  addOptions() {
    return {
      onStateChange: undefined,
    };
  },

  addProseMirrorPlugins() {
    const onStateChange = this.options.onStateChange;
    return [
      new Plugin({
        key: wikiSlashPluginKey,
        view() {
          return {
            update(view, prevState) {
              if (
                view.state.doc === prevState.doc &&
                view.state.selection.eq(prevState.selection)
              ) {
                return;
              }
              onStateChange?.(findSlashQuery(view));
            },
            destroy() {
              onStateChange?.(null);
            },
          };
        },
      }),
    ];
  },
});
