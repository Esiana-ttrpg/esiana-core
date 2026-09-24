import { Mark, Node, mergeAttributes } from '@tiptap/core';
import { Plugin } from '@tiptap/pm/state';
import { decodeSourceReference, encodeSourceReference, type SourceReference } from '../../../../../shared/sourceReferences';

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    sourceReference: {
      applySourceReference: (reference: SourceReference) => ReturnType;
      removeSourceReference: () => ReturnType;
      insertSourceReferenceAtom: (reference: SourceReference) => ReturnType;
    };
  }
}

const MARK_RE = /^<span data-esiana-source="([^"]+)">([\s\S]*?)<\/span>/;
const ATOM_RE = /^<span data-esiana-source-atom="([^"]+)"><\/span>/;
const CLIPBOARD_MIME = 'application/x-esiana-source-reference';
export const SOURCE_REFERENCE_INTERACT_EVENT = 'esiana:source-reference-interact';

export const SourceReferenceMark = Mark.create({
  name: 'sourceReference',
  inclusive: false,
  excludes: 'sourceReference',
  addAttributes() { return { payload: { default: null } }; },
  parseHTML() { return [{ tag: 'span[data-esiana-source]', getAttrs: (node) => decodeSourceReference((node as HTMLElement).getAttribute('data-esiana-source') ?? '') ? { payload: (node as HTMLElement).getAttribute('data-esiana-source') } : false }]; },
  renderHTML({ HTMLAttributes }) {
    const reference = decodeSourceReference(String(HTMLAttributes.payload ?? ''));
    if (!reference) return ['span', {}, 0];
    return ['span', mergeAttributes({ 'data-esiana-source': HTMLAttributes.payload, class: 'source-reference-mark', title: `${reference.metadata.title}${reference.locator ? ` — ${reference.locator.label}` : ''}` }, {}), 0];
  },
  renderMarkdown(node, h) {
    const inner = h.renderChildren(node);
    const payload = node.attrs?.payload;
    return payload && decodeSourceReference(payload) ? `<span data-esiana-source="${payload}">${inner}</span>` : inner;
  },
  markdownTokenizer: {
    name: 'sourceReference', level: 'inline', start: (src: string) => src.indexOf('<span data-esiana-source='),
    tokenize(src, _, h) {
      const match = MARK_RE.exec(src); if (!match) return undefined;
      if (!decodeSourceReference(match[1])) return { type: 'text', raw: match[0], text: match[2] };
      return { type: 'sourceReference', raw: match[0], tokens: h.inlineTokens(match[2]), attrs: { payload: match[1] } };
    },
  },
  parseMarkdown(token, h) { return h.applyMark('sourceReference', h.parseInline((token as { tokens?: never[] }).tokens ?? []), (token as { attrs?: object }).attrs); },
  addCommands() {
    return {
      applySourceReference: (reference) => ({ chain }) => chain().unsetMark(this.name).setMark(this.name, { payload: encodeSourceReference(reference) }).run(),
      removeSourceReference: () => ({ commands }) => commands.unsetMark(this.name),
      insertSourceReferenceAtom: (reference) => ({ commands }) => commands.insertContent({ type: 'sourceReferenceAtom', attrs: { payload: encodeSourceReference(reference) } }),
    };
  },
  addProseMirrorPlugins() {
    return [new Plugin({ props: {
      clipboardTextSerializer: (slice) => slice.content.textBetween(0, slice.content.size, '\n', ''),
      handleDOMEvents: { copy: (_view, event) => { event.clipboardData?.setData(CLIPBOARD_MIME, 'v1'); return false; } },
      handleClick: (view, pos, event) => {
        const element = (event.target as HTMLElement | null)?.closest?.('[data-esiana-source], [data-esiana-source-atom]') as HTMLElement | null;
        if (!element) return false;
        const payload = element.getAttribute('data-esiana-source') ?? element.getAttribute('data-esiana-source-atom') ?? '';
        const reference = decodeSourceReference(payload);
        if (!reference) return false;
        window.dispatchEvent(new CustomEvent(SOURCE_REFERENCE_INTERACT_EVENT, { detail: { editorView: view, pos: view.posAtDOM(element, 0), payload, reference, atom: element.hasAttribute('data-esiana-source-atom'), rect: element.getBoundingClientRect() } }));
        return true;
      },
      handlePaste: (view, event) => {
        const html = event.clipboardData?.getData('text/html') ?? '';
        if (!html.includes('data-esiana-source') || event.clipboardData?.getData(CLIPBOARD_MIME) === 'v1') return false;
        const container = document.createElement('div'); container.innerHTML = html;
        container.querySelectorAll('[data-esiana-source-atom]').forEach((node) => node.remove());
        container.querySelectorAll('[data-esiana-source]').forEach((node) => node.replaceWith(...Array.from(node.childNodes)));
        view.dispatch(view.state.tr.replaceSelectionWith(view.state.schema.text(container.textContent ?? '')));
        return true;
      },
    } })];
  },
});

export const SourceReferenceAtom = Node.create({
  name: 'sourceReferenceAtom', group: 'inline', inline: true, atom: true, selectable: true,
  addAttributes() { return { payload: { default: null } }; },
  parseHTML() { return [{ tag: 'span[data-esiana-source-atom]', getAttrs: (node) => decodeSourceReference((node as HTMLElement).getAttribute('data-esiana-source-atom') ?? '') ? { payload: (node as HTMLElement).getAttribute('data-esiana-source-atom') } : false }]; },
  renderHTML({ HTMLAttributes }) {
    const reference = decodeSourceReference(String(HTMLAttributes.payload ?? ''));
    return ['span', { 'data-esiana-source-atom': HTMLAttributes.payload, class: 'source-reference-atom', role: 'button', tabindex: '0', title: reference ? `${reference.metadata.title}${reference.locator ? ` — ${reference.locator.label}` : ''}` : 'Citation' }, '◈'];
  },
  renderMarkdown(node) { const payload = node.attrs?.payload; return payload && decodeSourceReference(payload) ? `<span data-esiana-source-atom="${payload}"></span>` : ''; },
  markdownTokenizer: { name: 'sourceReferenceAtom', level: 'inline', start: (src: string) => src.indexOf('<span data-esiana-source-atom='), tokenize(src) { const match = ATOM_RE.exec(src); return match && decodeSourceReference(match[1]) ? { type: 'sourceReferenceAtom', raw: match[0], attrs: { payload: match[1] } } : undefined; } },
  parseMarkdown(token) { return { type: 'sourceReferenceAtom', attrs: (token as { attrs?: object }).attrs ?? {} }; },
});
