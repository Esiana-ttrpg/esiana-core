const MENTION_REGEX =
  /<span[^>]*data-type="mention"[^>]*data-id="([^"]*)"[^>]*data-label="([^"]*)"[^>]*>/g;

const IMG_ASSET_REGEX =
  /<img[^>]*src="(?:\/api\/assets\/([^"?#]+)|\/uploads\/([^"?#]+))"[^>]*>/gi;

const MARKDOWN_IMG_ASSET_REGEX =
  /!\[([^\]]*)\]\((?:\/api\/assets\/([^)?#]+)|\/uploads\/([^)?#]+))\)/gi;

export interface AssetExportLookup {
  /** asset id or upload filename → zip media filename */
  resolveMediaFilename: (assetIdOrFilename: string) => string | null;
}

export interface PageTitleLookup {
  resolveTitle: (pageId: string) => string | null;
}

export function rewriteMentionsToWikilinks(
  markdown: string,
  lookup: PageTitleLookup,
): string {
  return markdown.replace(MENTION_REGEX, (_match, rawId: string, rawLabel: string) => {
    const id = rawId?.trim() ?? '';
    const label = rawLabel?.trim() || lookup.resolveTitle(id) || 'Untitled';
    return `[[${label}]]`;
  });
}

export function rewriteAssetRefsToMediaPaths(
  markdown: string,
  lookup: AssetExportLookup,
): string {
  let result = markdown.replace(IMG_ASSET_REGEX, (_match, assetId: string, uploadName: string) => {
    const key = (assetId || uploadName || '').trim();
    const mediaFile = lookup.resolveMediaFilename(key);
    if (!mediaFile) return _match;
    return `![](media/${mediaFile})`;
  });

  result = result.replace(
    MARKDOWN_IMG_ASSET_REGEX,
    (_match, alt: string, assetId: string, uploadName: string) => {
      const key = (assetId || uploadName || '').trim();
      const mediaFile = lookup.resolveMediaFilename(key);
      if (!mediaFile) return _match;
      const altText = alt?.trim() ?? '';
      return `![${altText}](media/${mediaFile})`;
    },
  );

  return result;
}

export function rewriteMarkdownForExport(
  markdown: string,
  assetLookup: AssetExportLookup,
  pageLookup: PageTitleLookup,
): string {
  const withLinks = rewriteMentionsToWikilinks(markdown, pageLookup);
  return rewriteAssetRefsToMediaPaths(withLinks, assetLookup);
}
