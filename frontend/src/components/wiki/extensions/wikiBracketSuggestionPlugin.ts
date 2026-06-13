import { Extension } from '@tiptap/core';
import { Plugin, PluginKey } from '@tiptap/pm/state';
import type { EditorView } from '@tiptap/pm/view';

export {
  filterWikiLinkIndex,
  insertWikiLinkFromSuggestion,
  insertWikiReference,
  openWikiSuggestion,
  resolveWikiSuggestion,
  trackRecentReference,
  getRecentReferencePageIds,
} from './wikiReferenceInsertion';

export const wikiBracketPluginKey = new PluginKey('wikiBracketSuggestion');

export type BracketSuggestionState = {
  active: boolean;
  query: string;
  from: number;
  to: number;
  top: number;
  left: number;
};

export type BracketSuggestionOptions = {
  onStateChange?: (state: BracketSuggestionState | null) => void;
};

export function findBracketQuery(view: EditorView): BracketSuggestionState | null {
  const { from } = view.state.selection;
  const $pos = view.state.doc.resolve(from);
  const textBefore = $pos.parent.textBetween(
    0,
    $pos.parentOffset,
    undefined,
    '\ufffc',
  );
  const match = /\[\[([^\]]*)$/.exec(textBefore);
  if (!match) return null;
  const query = match[1];
  const bracketStart = from - query.length - 2;
  const coords = view.coordsAtPos(from);
  return {
    active: true,
    query,
    from: bracketStart,
    to: from,
    top: coords.bottom + 4,
    left: coords.left,
  };
}

export const WikiBracketSuggestionExtension = Extension.create<BracketSuggestionOptions>({
  name: 'wikiBracketSuggestion',

  addOptions() {
    return {
      onStateChange: undefined,
    };
  },

  addProseMirrorPlugins() {
    const onStateChange = this.options.onStateChange;
    return [
      new Plugin({
        key: wikiBracketPluginKey,
        view() {
          return {
            update(view, prevState) {
              if (
                view.state.doc === prevState.doc &&
                view.state.selection.eq(prevState.selection)
              ) {
                return;
              }
              onStateChange?.(findBracketQuery(view));
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
