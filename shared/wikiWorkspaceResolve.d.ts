import { type CampaignWorkspace as CampaignWorkspaceType } from './campaignWorkspace.js';
export declare const WIKI_SYSTEM_CATEGORY_KEY = "systemCategoryKey";
export declare const SYSTEM_CATEGORY_QUESTS = "quests";
export declare const SYSTEM_CATEGORY_NARRATIVE_THREADS = "narrative_threads";
/** Folder titles that are index hubs — not routable entity URLs. */
export declare const CATEGORY_INDEX_TITLES: Set<string>;
export type WikiPageWorkspaceInput = {
    id: string;
    title: string;
    parentId: string | null;
    templateType: string;
    metadata?: unknown;
};
export declare function isCategoryIndexPage(title: string | null | undefined): boolean;
/** Whether a page should have workspace+pathKey (routable in public URLs). */
export declare function isRoutableWikiPage(page: WikiPageWorkspaceInput): boolean;
/**
 * Resolve stored workspace for a wiki page.
 * Returns null for category folders and non-routable infrastructure pages.
 */
export declare function resolveWorkspaceForPage(page: WikiPageWorkspaceInput, flatPages: readonly WikiPageWorkspaceInput[]): CampaignWorkspaceType | null;
//# sourceMappingURL=wikiWorkspaceResolve.d.ts.map