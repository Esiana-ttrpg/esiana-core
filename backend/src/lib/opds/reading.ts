import { marked } from 'marked';
import { parseHTML } from 'linkedom';
import { projectedPageProse } from './pageContent.js';

const tags = new Set('P BR H1 H2 H3 H4 H5 H6 STRONG EM B I U S DEL BLOCKQUOTE PRE CODE UL OL LI TABLE THEAD TBODY TR TH TD HR A'.split(' '));
const escape = (text: string) => text.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;');

/** Static reader HTML: no editor widgets, scripts, embedded assets, or event attributes. */
export function renderReadingPage(page: { title: string; blocks: unknown; metadata?: unknown }, canonical: string): string {
  const prose = projectedPageProse(page.blocks);
  const metadata = page.metadata && typeof page.metadata === 'object' ? page.metadata as Record<string, unknown> : {};
  const description = prose.description ?? (typeof metadata.description === 'string' ? metadata.description : undefined);
  const markdown = [description, ...prose.lore].filter(Boolean).join('\n\n');
  const { document } = parseHTML(`<html><body>${marked.parse(markdown, { async: false })}</body></html>`);
  for (const node of [...document.body.querySelectorAll('*')]) {
    if (['SCRIPT', 'STYLE', 'IFRAME', 'OBJECT', 'EMBED', 'SVG', 'MATH', 'TEMPLATE'].includes(node.tagName)) { node.remove(); continue; }
    const href = node.tagName === 'A' ? node.getAttribute('href') : null;
    for (const attr of [...node.attributes]) node.removeAttribute(attr.name);
    if (!tags.has(node.tagName)) { node.replaceWith(...node.childNodes); continue; }
    if (href && /^(https?:\/\/|mailto:|\/(?!\/)|#)/i.test(href.trim())) node.setAttribute('href', href.trim());
  }
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>${escape(page.title)}</title></head><body><h1>${escape(page.title)}</h1>${document.body.innerHTML}<p><a href="${escape(canonical)}">View in Esiana</a></p></body></html>`;
}
