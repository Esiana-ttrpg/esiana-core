/** Display text only: consumers must render this as text, never as HTML. */
export function sessionSnippet(markdown: string): string {
  let text = markdown;
  let previous: string;
  // Removals can expose new comment delimiters. Every changed pass is shorter.
  do {
    previous = text;
    text = text
      .replace(/<!--[\s\S]*?-->/g, '')
      .replace(/#{1,6}\s+/g, '')
      .replace(/\*\*|__/g, '')
      .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1');
  } while (text !== previous);

  return text.replace(/\s+/g, ' ').trim().slice(0, 200);
}
