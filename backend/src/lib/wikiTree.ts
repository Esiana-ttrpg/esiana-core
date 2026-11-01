import type { WikiPage } from './prismaClient.js';
import type { WikiTreeNode } from '../types/api.js';
import { isWorkshopInfrastructurePage } from './workshopDraftService.js';
import { compareWikiTitles } from './wikiSort.js';
import { CampaignCapabilities } from '../../../shared/campaignPolicy/capabilities.js';
import { roleCapabilitiesFor } from '../../../shared/campaignPolicy/roleGrants.js';
import { canViewVisibilityFromCaps } from '../../../shared/campaignPolicy/resourceAccess.js';
import { isMembershipRole } from '../../../shared/campaignPolicy/membershipRoles.js';
import type { CampaignMemberRole } from '../types/domain.js';
import type { CampaignContext } from '../types/api.js';

type FlatWikiPage = Pick<
  WikiPage,
  | 'id'
  | 'campaignId'
  | 'title'
  | 'parentId'
  | 'visibility'
  | 'featuredImageId'
  | 'templateType'
  | 'metadata'
  | 'workspace'
  | 'pathKey'
  | 'createdAt'
  | 'updatedAt'
>;

export type WikiVisibilityViewer =
  | CampaignMemberRole
  | null
  | ReadonlySet<string>
  | { capabilities: Iterable<string> }
  | Pick<CampaignContext, 'capabilities' | 'actor'>;

function capsFromViewer(
  viewer: WikiVisibilityViewer,
): ReadonlySet<(typeof CampaignCapabilities)[keyof typeof CampaignCapabilities]> {
  if (viewer && typeof viewer === 'object') {
    if ('capabilities' in viewer && viewer.capabilities) {
      return new Set(
        [...viewer.capabilities] as Array<
          (typeof CampaignCapabilities)[keyof typeof CampaignCapabilities]
        >,
      );
    }
    if (viewer instanceof Set) {
      return viewer as ReadonlySet<
        (typeof CampaignCapabilities)[keyof typeof CampaignCapabilities]
      >;
    }
  }
  const role =
    typeof viewer === 'string' && isMembershipRole(viewer) ? viewer : null;
  if (!role) {
    return new Set([CampaignCapabilities.CAMPAIGN_VIEW]);
  }
  return roleCapabilitiesFor(role);
}

export function canViewWikiPage(
  visibility: string,
  viewer: WikiVisibilityViewer,
): boolean {
  return canViewVisibilityFromCaps(capsFromViewer(viewer), visibility);
}

export function buildWikiTree(
  pages: FlatWikiPage[],
  viewer: WikiVisibilityViewer,
): WikiTreeNode[] {
  const visible = pages.filter(
    (p) => canViewWikiPage(p.visibility, viewer) && !isWorkshopInfrastructurePage(p.metadata),
  );

  const nodeMap = new Map<string, WikiTreeNode>();
  for (const page of visible) {
    nodeMap.set(page.id, {
      id: page.id,
      campaignId: page.campaignId,
      title: page.title,
      parentId: page.parentId,
      visibility: page.visibility,
      featuredImageId: page.featuredImageId,
      templateType: page.templateType,
      workspace: page.workspace,
      pathKey: page.pathKey,
      metadata:
        page.metadata && typeof page.metadata === 'object'
          ? (page.metadata as Record<string, unknown>)
          : null,
      children: [],
      createdAt: page.createdAt.toISOString(),
      updatedAt: page.updatedAt.toISOString(),
    });
  }

  const roots: WikiTreeNode[] = [];
  for (const node of nodeMap.values()) {
    if (node.parentId && nodeMap.has(node.parentId)) {
      nodeMap.get(node.parentId)!.children.push(node);
    } else {
      roots.push(node);
    }
  }

  const sortNodes = (nodes: WikiTreeNode[], parentTitle: string | null): void => {
    nodes.sort((a, b) => compareWikiTitles(a.title, b.title, parentTitle));
    for (const n of nodes) {
      sortNodes(n.children, n.title);
    }
  };
  sortNodes(roots, null);

  return roots;
}
