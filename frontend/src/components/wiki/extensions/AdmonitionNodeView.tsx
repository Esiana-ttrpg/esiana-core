import { META_SECTION_LABEL_CLASS } from '@/lib/surfaceLayout';
import {
  getWikiAdmonitionVariant,
  normalizeWikiAdmonitionVariant,
  WIKI_ADMONITION_VARIANTS_LIST,
  type WikiAdmonitionVariant,
} from '@shared/wikiAdmonition';
import type { NodeViewProps } from '@tiptap/react';
import { NodeViewContent, NodeViewWrapper } from '@tiptap/react';

export function AdmonitionNodeView({ node, updateAttributes, selected }: NodeViewProps) {
  const variant = normalizeWikiAdmonitionVariant(node.attrs.variant);
  const meta = getWikiAdmonitionVariant(variant);

  const handleVariantChange = (next: WikiAdmonitionVariant) => {
    updateAttributes({ variant: next });
  };

  return (
    <NodeViewWrapper
      as="aside"
      className={`wiki-admonition wiki-admonition--${variant} wiki-admonition--profile-${meta.visualProfile}`}
      data-admonition={variant}
    >
      <div className="wiki-admonition__header">
        {selected ? (
          <select
            className="wiki-admonition__variant-select"
            value={variant}
            onChange={(event) =>
              handleVariantChange(event.target.value as WikiAdmonitionVariant)
            }
            aria-label="Callout type"
          >
            {WIKI_ADMONITION_VARIANTS_LIST.map((entry) => (
              <option key={entry.id} value={entry.id}>
                {entry.label}
              </option>
            ))}
          </select>
        ) : (
          <span className={META_SECTION_LABEL_CLASS}>{meta.label}</span>
        )}
      </div>
      <NodeViewContent className="wiki-admonition__content" />
    </NodeViewWrapper>
  );
}
