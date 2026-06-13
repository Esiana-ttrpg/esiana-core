/**
 * Workspace-first browser path under /campaigns/:handle/...
 * Not an API route, pageId, or export archive path.
 */
export type PublicPagePath = string & {
    readonly __brand: 'PublicPagePath';
};
export declare function asPublicPagePath(path: string): PublicPagePath;
//# sourceMappingURL=publicPagePath.d.ts.map