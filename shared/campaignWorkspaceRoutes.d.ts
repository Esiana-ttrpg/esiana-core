import { CampaignWorkspace, type CampaignWorkspace as CampaignWorkspaceType } from './campaignWorkspace.js';
export { CampaignWorkspace };
export type { CampaignWorkspaceType as CampaignWorkspaceValue };
import { isCategoryIndexPage, resolveWorkspaceForPage, type WikiPageWorkspaceInput } from './wikiWorkspaceResolve.js';
import { asPublicPagePath, type PublicPagePath } from './publicPagePath.js';
export type { PublicPagePath };
export { asPublicPagePath };
export type WorkspaceKind = 'hub' | 'entity' | 'system';
export type WorkspaceIndexResolver = {
    type: 'wikiTitle';
    title: string;
} | {
    type: 'systemCategoryKey';
    key: string;
} | {
    type: 'none';
};
export interface CampaignWorkspaceRoute {
    workspace?: CampaignWorkspaceType;
    segment: string;
    kind: WorkspaceKind;
    title: string;
    sidebarId?: string;
    systemCategoryKey?: string;
    indexResolver: WorkspaceIndexResolver;
    hasEntityRoutes?: boolean;
}
/** Reserved URL segments — not valid pathKeys. */
export declare const RESERVED_PATH_KEY_SEGMENTS: Set<string>;
export declare const CAMPAIGN_WORKSPACE_ROUTES: readonly CampaignWorkspaceRoute[];
export declare const WORKSPACE_INDEX_SEGMENTS: string[];
export declare const WORKSPACE_ENTITY_SEGMENTS: string[];
export declare function workspaceToSegment(workspace: CampaignWorkspaceType): string | null;
export declare function segmentToWorkspace(segment: string): CampaignWorkspaceType | null;
export declare function resolveWorkspaceRoute(segment: string): CampaignWorkspaceRoute | null;
export declare function resolveWorkspaceRouteByEnum(workspace: CampaignWorkspaceType): CampaignWorkspaceRoute | null;
export declare function campaignPath(handle: string, ...segments: string[]): string;
export declare function campaignWorkspaceIndexPath(handle: string, segment: string): string;
export declare function campaignWorkspaceEntityPath(handle: string, segment: string, pathKey: string): string;
export declare function campaignFreeformPagePath(handle: string, pathKey: string): string;
export declare function resolveWorkspaceIndexPathForFolderTitle(handle: string, title: string): PublicPagePath | null;
export declare function resolveCanonicalPagePath(handle: string, page: WikiPageWorkspaceInput & {
    workspace?: CampaignWorkspaceType | string | null;
    pathKey?: string | null;
}, flatPages: readonly WikiPageWorkspaceInput[]): PublicPagePath;
export { isCategoryIndexPage, resolveWorkspaceForPage };
//# sourceMappingURL=campaignWorkspaceRoutes.d.ts.map