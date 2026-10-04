import type { SidebarConfig } from '@/lib/sidebarConfig';
import { workspaceSegmentFromCampaignPath } from '@/lib/resolveWikiRoutePageId';
import type {
  ActivePageSnapshot,
  CommandContext,
  CreatePageCategoryTitle,
} from './types.js';

export function resolveCommandContext(input: {
  campaignHandle: string;
  campaignId: string | null;
  pathname: string;
  can: CommandContext['can'];
  resolveCategoryPageId: (
    categoryTitle: CreatePageCategoryTitle,
  ) => string | undefined;
  activePage: ActivePageSnapshot | null;
  sidebarConfig: SidebarConfig;
}): CommandContext {
  const workspaceSegment = workspaceSegmentFromCampaignPath(
    input.pathname,
    input.campaignHandle,
  );

  return {
    campaignHandle: input.campaignHandle,
    campaignId: input.campaignId,
    pathname: input.pathname,
    workspaceSegment,
    can: input.can,
    resolveCategoryPageId: input.resolveCategoryPageId,
    activePage: input.activePage,
    sidebarConfig: input.sidebarConfig,
  };
}
