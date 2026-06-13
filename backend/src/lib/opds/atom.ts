export interface OpdsAtomLink {
  rel: string;
  href: string;
  type?: string;
  title?: string;
}

export interface OpdsAtomEntry {
  id: string;
  title: string;
  updated: string;
  summary?: string;
  author?: string;
  links: OpdsAtomLink[];
}

export interface OpdsAtomFeed {
  id: string;
  title: string;
  updated: string;
  author?: string;
  links: OpdsAtomLink[];
  entries: OpdsAtomEntry[];
}

export function escapeXml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function renderLinks(links: OpdsAtomLink[]): string {
  return links
    .map((link) => {
      const type = link.type ? ` type="${escapeXml(link.type)}"` : '';
      const title = link.title ? ` title="${escapeXml(link.title)}"` : '';
      return `<link rel="${escapeXml(link.rel)}" href="${escapeXml(link.href)}"${type}${title} />`;
    })
    .join('');
}

function renderEntry(entry: OpdsAtomEntry): string {
  const summary = entry.summary
    ? `<summary>${escapeXml(entry.summary)}</summary>`
    : '';
  const author = entry.author
    ? `<author><name>${escapeXml(entry.author)}</name></author>`
    : '';
  return `<entry>
  <title>${escapeXml(entry.title)}</title>
  <id>${escapeXml(entry.id)}</id>
  <updated>${escapeXml(entry.updated)}</updated>
  ${author}
  ${summary}
  ${renderLinks(entry.links)}
</entry>`;
}

/** OPDS 1.2 catalog feed (Atom XML). */
export function buildOpdsCatalogFeed(feed: OpdsAtomFeed): string {
  const author = feed.author
    ? `<author><name>${escapeXml(feed.author)}</name></author>`
    : '';
  const entries = feed.entries.map(renderEntry).join('\n');

  return `<?xml version="1.0" encoding="utf-8"?>
<feed xmlns="http://www.w3.org/2005/Atom"
      xmlns:opds="http://opds-spec.org/2010/catalog">
  <title>${escapeXml(feed.title)}</title>
  <id>${escapeXml(feed.id)}</id>
  <updated>${escapeXml(feed.updated)}</updated>
  ${author}
  ${renderLinks(feed.links)}
  ${entries}
</feed>`;
}
