import { stripSnippetMarkup } from './snippetMarkup.js';

/** Display text only: consumers must render this as text, never as HTML. */
export function sessionSnippet(markdown: string): string {
  return stripSnippetMarkup(markdown, 'session').replace(/\s+/g, ' ').trim().slice(0, 200);
}
