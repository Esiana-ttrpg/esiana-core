export type { PublicPagePath } from '@shared/publicPagePath';
export { asPublicPagePath } from '@shared/publicPagePath';
export {
  CAMPAIGN_WORKSPACE_ROUTES,
  RESERVED_PATH_KEY_SEGMENTS,
  WORKSPACE_ENTITY_SEGMENTS,
  WORKSPACE_INDEX_SEGMENTS,
  campaignFreeformPagePath,
  campaignPath,
  campaignWorkspaceEntityPath,
  campaignWorkspaceIndexPath,
  resolveCanonicalPagePath,
  resolveWorkspaceForPage,
  resolveWorkspaceIndexPathForFolderTitle,
  resolveWorkspaceRoute,
  resolveWorkspaceRouteByEnum,
  isCategoryIndexPage,
  segmentToWorkspace,
  workspaceToSegment,
  type CampaignWorkspaceRoute,
  type WorkspaceKind,
} from '@shared/campaignWorkspaceRoutes';

export { CampaignWorkspace } from '@shared/campaignWorkspace';
