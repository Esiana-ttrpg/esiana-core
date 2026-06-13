import type { WikiPage } from '@prisma/client';
import type { WikiTreeNode } from '../types/api.js';
import { isWorkshopInfrastructurePage } from './workshopDraftService.js';
import { compareWikiTitles } from './wikiSort.js';
import {
  CampaignMemberRoles,
  WikiVisibility,
  type CampaignMemberRole,
} from '../types/domain.js';

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

export function canViewWikiPage(
  visibility: string,
  role: CampaignMemberRole | null,
): boolean {
  if (
    role === CampaignMemberRoles.GAMEMASTER ||
    role === CampaignMemberRoles.WRITER
  ) {
    return true;
  }

  if (visibility === WikiVisibility.PUBLIC) {
    return true;
  }

  if (visibility === WikiVisibility.PARTY) {
    return (
      role === CampaignMemberRoles.PARTICIPANT ||
      role === CampaignMemberRoles.OBSERVER
    );
  }

  // DM_Only — not visible to players/viewers or anonymous public visitors
  return false;
}

export function buildWikiTree(
  pages: FlatWikiPage[],
  role: CampaignMemberRole | null,
): WikiTreeNode[] {
  const visible = pages.filter(
    (p) => canViewWikiPage(p.visibility, role) && !isWorkshopInfrastructurePage(p.metadata),
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
