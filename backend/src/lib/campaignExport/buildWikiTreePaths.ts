export interface WikiPagePathInput {
  id: string;
  title: string;
  parentId: string | null;
}

function sanitizePathSegment(title: string): string {
  const cleaned = title
    .trim()
    .replace(/[<>:"/\\|?*\u0000-\u001f]/g, '')
    .replace(/\s+/g, ' ')
    .replace(/\.+$/g, '')
    .trim();
  if (!cleaned) return 'untitled';
  return cleaned.slice(0, 120);
}

function sanitizeFileStem(title: string): string {
  const segment = sanitizePathSegment(title);
  return segment.replace(/\s/g, '-').replace(/-+/g, '-').replace(/^-+|-+$/g, '') || 'untitled';
}

export interface WikiPagePathResult {
  pageId: string;
  directoryPath: string;
  fileStem: string;
  relativePath: string;
  isFolderOnly: boolean;
}

export function buildWikiTreePaths(
  pages: WikiPagePathInput[],
  folderOnlyPageIds: Set<string>,
): Map<string, WikiPagePathResult> {
  const byId = new Map(pages.map((page) => [page.id, page]));
  const usedPaths = new Set<string>();
  const results = new Map<string, WikiPagePathResult>();

  for (const page of pages) {
    const segments: string[] = [];
    const visited = new Set<string>();
    let current: WikiPagePathInput | undefined = page;

    while (current?.parentId) {
      if (visited.has(current.parentId)) break;
      visited.add(current.parentId);
      const parent = byId.get(current.parentId);
      if (!parent) break;
      segments.unshift(sanitizePathSegment(parent.title));
      current = parent;
    }

    const directoryPath = segments.join('/');
    let fileStem = sanitizeFileStem(page.title);
    let relativePath = directoryPath
      ? `${directoryPath}/${fileStem}.md`
      : `${fileStem}.md`;

    if (usedPaths.has(relativePath.toLowerCase())) {
      fileStem = `${fileStem}-${page.id.slice(0, 8)}`;
      relativePath = directoryPath
        ? `${directoryPath}/${fileStem}.md`
        : `${fileStem}.md`;
    }
    usedPaths.add(relativePath.toLowerCase());

    const isFolderOnly = folderOnlyPageIds.has(page.id);
    if (isFolderOnly) {
      relativePath = directoryPath
        ? `${directoryPath}/${fileStem}/index.md`
        : `${fileStem}/index.md`;
      usedPaths.add(relativePath.toLowerCase());
    }

    results.set(page.id, {
      pageId: page.id,
      directoryPath,
      fileStem,
      relativePath: `sovereign/wiki/${relativePath.replace(/\\/g, '/')}`,
      isFolderOnly,
    });
  }

  return results;
}
