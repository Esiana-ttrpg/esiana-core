import { mergeAttributes, Node } from '@tiptap/core';
import { ReactNodeViewRenderer, NodeViewWrapper } from '@tiptap/react';
import type { NodeViewProps } from '@tiptap/react';

export type SocialMentionAttributes = {
  mentionType: 'user' | 'character';
  targetUserId: string | null;
  identityPageId: string | null;
  label: string;
};

function SocialMentionNodeView({ node, selected }: NodeViewProps) {
  const attrs = node.attrs as SocialMentionAttributes;
  return (
    <NodeViewWrapper as="span" className="inline">
      <span
        className={`social-mention-node${selected ? ' social-mention-node--selected' : ''}`}
        data-type="socialMention"
        data-mention-type={attrs.mentionType}
        data-target-user-id={attrs.targetUserId ?? ''}
        data-identity-page-id={attrs.identityPageId ?? ''}
        data-label={attrs.label}
      >
        @{attrs.label}
      </span>
    </NodeViewWrapper>
  );
}

export const SocialMentionExtension = Node.create({
  name: 'socialMention',
  group: 'inline',
  inline: true,
  atom: true,
  selectable: true,

  addAttributes() {
    return {
      mentionType: {
        default: 'user',
        parseHTML: (el) =>
          el.getAttribute('data-mention-type') === 'character' ? 'character' : 'user',
      },
      targetUserId: {
        default: null,
        parseHTML: (el) => el.getAttribute('data-target-user-id') || null,
      },
      identityPageId: {
        default: null,
        parseHTML: (el) => el.getAttribute('data-identity-page-id') || null,
      },
      label: {
        default: '',
        parseHTML: (el) => el.getAttribute('data-label') ?? '',
      },
    };
  },

  parseHTML() {
    return [{ tag: 'span[data-type="socialMention"]' }];
  },

  renderHTML({ node, HTMLAttributes }) {
    const attrs = node.attrs as SocialMentionAttributes;
    return [
      'span',
      mergeAttributes(HTMLAttributes, {
        'data-type': 'socialMention',
        'data-mention-type': attrs.mentionType,
        'data-target-user-id': attrs.targetUserId ?? '',
        'data-identity-page-id': attrs.identityPageId ?? '',
        'data-label': attrs.label,
        class: 'social-mention-node',
      }),
      `@${attrs.label}`,
    ];
  },

  renderMarkdown(node) {
    const attrs = node.attrs as SocialMentionAttributes;
    return `<span data-type="socialMention" data-mention-type="${attrs.mentionType}" data-target-user-id="${attrs.targetUserId ?? ''}" data-identity-page-id="${attrs.identityPageId ?? ''}" data-label="${attrs.label}">@${attrs.label}</span>`;
  },

  addNodeView() {
    return ReactNodeViewRenderer(SocialMentionNodeView);
  },
});

export function buildSocialMentionHtml(attrs: SocialMentionAttributes): string {
  return `<span data-type="socialMention" data-mention-type="${attrs.mentionType}" data-target-user-id="${attrs.targetUserId ?? ''}" data-identity-page-id="${attrs.identityPageId ?? ''}" data-label="${attrs.label}">@${attrs.label}</span>`;
}
