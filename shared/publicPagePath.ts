/**
 * Workspace-first browser path under /campaigns/:handle/...
 * Not an API route, pageId, or export archive path.
 */
export type PublicPagePath = string & { readonly __brand: 'PublicPagePath' };

export function asPublicPagePath(path: string): PublicPagePath {
  return path as PublicPagePath;
}
