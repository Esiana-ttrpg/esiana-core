/**
 * Lightweight HTML → markdown for import compilers.
 */
export function htmlToMarkdown(html: string): string {
  if (!html?.trim()) return '';

  let text = html;

  text = text.replace(/\r\n/g, '\n');
  text = text.replace(/<br\s*\/?>/gi, '\n');
  text = text.replace(/<\/p>/gi, '\n\n');
  text = text.replace(/<p[^>]*>/gi, '');
  text = text.replace(/<h([1-6])[^>]*>(.*?)<\/h\1>/gis, (_m, level: string, inner: string) => {
    const hashes = '#'.repeat(Math.min(6, Math.max(1, Number.parseInt(level, 10) || 1)));
    return `\n${hashes} ${stripInlineTags(inner).trim()}\n\n`;
  });
  text = text.replace(/<strong[^>]*>(.*?)<\/strong>/gis, '**$1**');
  text = text.replace(/<b[^>]*>(.*?)<\/b>/gis, '**$1**');
  text = text.replace(/<em[^>]*>(.*?)<\/em>/gis, '*$1*');
  text = text.replace(/<i[^>]*>(.*?)<\/i>/gis, '*$1*');
  text = text.replace(/<li[^>]*>\s*<p[^>]*>(.*?)<\/p>\s*<\/li>/gis, '- $1\n');
  text = text.replace(/<li[^>]*>(.*?)<\/li>/gis, '- $1\n');
  text = text.replace(/<\/?ul[^>]*>/gi, '\n');
  text = text.replace(/<\/?ol[^>]*>/gi, '\n');
  text = text.replace(/<img[^>]*src=["']([^"']+)["'][^>]*>/gi, '![]($1)');
  text = text.replace(/<a[^>]*href=["']([^"']+)["'][^>]*>(.*?)<\/a>/gis, '[$2]($1)');
  text = stripInlineTags(text);
  text = text.replace(/\u00a0/g, ' ');
  text = text.replace(/\n{3,}/g, '\n\n');
  return text.trim();
}

function stripInlineTags(value: string): string {
  let text = value;
  let previous = '';
  while (text !== previous) {
    previous = text;
    text = text.replace(/<[^>]+>/g, '');
  }
  return text.replace(/[<>]/g, '').trim();
}
