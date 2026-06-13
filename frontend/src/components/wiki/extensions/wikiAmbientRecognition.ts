import { Extension } from '@tiptap/core';
import { Plugin, PluginKey } from '@tiptap/pm/state';
import { Decoration, DecorationSet } from '@tiptap/pm/view';
import { normalizeAlias } from '@/lib/normalizeAlias';
import type { WikiLinkIndexEntry } from '@/lib/wikiLoreGraph';

const ambientKey = new PluginKey('wikiAmbientRecognition');

export type AmbientRecognitionOptions = {
  enabled: boolean;
  getIndex: () => WikiLinkIndexEntry[];
};

/** Passive underline for exact title/alias matches — never mutates document. */
export const WikiAmbientRecognitionExtension =
  Extension.create<AmbientRecognitionOptions>({
    name: 'wikiAmbientRecognition',

    addOptions() {
      return {
        enabled: false,
        getIndex: () => [],
      };
    },

    addProseMirrorPlugins() {
      const { enabled, getIndex } = this.options;
      return [
        new Plugin({
          key: ambientKey,
          props: {
            decorations(state) {
              if (!enabled) return DecorationSet.empty;
              const index = getIndex();
              if (index.length === 0) return DecorationSet.empty;

              const labels = index
                .map((e) => ({ label: e.label, norm: e.normalizedLabel }))
                .sort((a, b) => b.label.length - a.label.length);

              const decorations: Decoration[] = [];
              const skipRanges: Array<{ from: number; to: number }> = [];

              state.doc.descendants((node, pos) => {
                if (!node.isText || !node.text) return;
                if (node.marks.some((m) => m.type.name === 'link')) return;

                const parent = state.doc.resolve(pos).parent;
                if (parent.type.name === 'wikiLink' || parent.type.name === 'socialMention') {
                  return;
                }

                const text = node.text;
                for (const { label, norm } of labels) {
                  if (label.length < 3) continue;
                  const re = new RegExp(
                    `\\b${label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`,
                    'gi',
                  );
                  let m: RegExpExecArray | null;
                  // eslint-disable-next-line no-cond-assign
                  while ((m = re.exec(text)) !== null) {
                    const from = pos + m.index;
                    const to = from + m[0].length;
                    if (skipRanges.some((r) => from >= r.from && to <= r.to)) continue;
                    if (normalizeAlias(m[0]) !== norm) continue;
                    decorations.push(
                      Decoration.inline(from, to, {
                        class: 'wiki-ambient-hint',
                        title: `Recognized: ${label}`,
                      }),
                    );
                  }
                }
              });

              return DecorationSet.create(state.doc, decorations);
            },
          },
        }),
      ];
    },
  });
