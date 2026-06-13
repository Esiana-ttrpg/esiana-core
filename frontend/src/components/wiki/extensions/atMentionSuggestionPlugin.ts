import { Extension } from '@tiptap/core';
import { Plugin, PluginKey } from '@tiptap/pm/state';
import type { EditorView } from '@tiptap/pm/view';

export type MentionTarget = {
  mentionType: 'user' | 'character';
  label: string;
  targetUserId?: string;
  identityPageId?: string;
};

export type AtSuggestionState = {
  active: boolean;
  query: string;
  from: number;
  to: number;
  top: number;
  left: number;
};

export function findAtQuery(view: EditorView): AtSuggestionState | null {
  const { from } = view.state.selection;
  const $pos = view.state.doc.resolve(from);
  const textBefore = $pos.parent.textBetween(
    0,
    $pos.parentOffset,
    undefined,
    '\ufffc',
  );
  const match = /@([A-Za-z0-9][\w\s'-]{0,40})$/.exec(textBefore);
  if (!match) return null;
  const query = match[1];
  const atStart = from - query.length - 1;
  const coords = view.coordsAtPos(from);
  return {
    active: true,
    query,
    from: atStart,
    to: from,
    top: coords.bottom + 4,
    left: coords.left,
  };
}

export const AtMentionSuggestionExtension = Extension.create<{
  onStateChange?: (state: AtSuggestionState | null) => void;
}>({
  name: 'atMentionSuggestion',

  addOptions() {
    return { onStateChange: undefined };
  },

  addProseMirrorPlugins() {
    const onStateChange = this.options.onStateChange;
    return [
      new Plugin({
        key: new PluginKey('atMentionSuggestion'),
        view() {
          return {
            update(view, prevState) {
              if (
                view.state.doc === prevState.doc &&
                view.state.selection.eq(prevState.selection)
              ) {
                return;
              }
              onStateChange?.(findAtQuery(view));
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

export function insertSocialMention(
  view: EditorView,
  state: AtSuggestionState,
  target: MentionTarget,
): void {
  const nodeType = view.state.schema.nodes.socialMention;
  if (!nodeType) return;
  const node = nodeType.create({
    mentionType: target.mentionType,
    targetUserId: target.targetUserId ?? null,
    identityPageId: target.identityPageId ?? null,
    label: target.label,
  });
  view.dispatch(view.state.tr.replaceWith(state.from, state.to, node));
}

export function filterMentionTargets(
  targets: MentionTarget[],
  query: string,
): MentionTarget[] {
  const q = query.trim().toLowerCase();
  if (!q) return targets.slice(0, 12);
  return targets
    .filter((t) => t.label.toLowerCase().includes(q))
    .slice(0, 12);
}
