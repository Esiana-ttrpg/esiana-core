import {
  buildWikiPageGraph,
  isLocationPage,
  type WikiPageGraphNode,
} from './wikiDeletion.js';
import { isStructuralDividerTitle } from './wikiSystemPages.js';

export interface LocationAncestorNode {
  id: string;
  title: string;
}

export interface CategoryLocationTrailResult {
  isCrossNested: boolean;
  locationAncestors: LocationAncestorNode[];
  locationTrailLabel: string | null;
}

export function computeLocationAncestorTrail(
  child: Pick<WikiPageGraphNode, 'id' | 'parentId'>,
  categoryPageId: string,
  graph: Map<string, WikiPageGraphNode>,
): CategoryLocationTrailResult {
  if (!child.parentId || child.parentId === categoryPageId) {
    return {
      isCrossNested: false,
      locationAncestors: [],
      locationTrailLabel: null,
    };
  }

  const locationAncestors: LocationAncestorNode[] = [];
  const visited = new Set<string>();
  let current: string | null = child.parentId;

  while (current && current !== categoryPageId) {
    if (visited.has(current)) break;
    visited.add(current);

    const node = graph.get(current);
    if (!node) break;

    if (isStructuralDividerTitle(node.title)) {
      current = node.parentId;
      continue;
    }

    if (isLocationPage(node)) {
      locationAncestors.unshift({ id: node.id, title: node.title });
    }

    current = node.parentId;
  }

  return {
    isCrossNested: true,
    locationAncestors,
    locationTrailLabel:
      locationAncestors.length > 0
        ? locationAncestors.map((node) => node.title).join(' › ')
        : null,
  };
}

export function buildCategoryLocationTrails(
  children: Array<
    Pick<WikiPageGraphNode, 'id' | 'parentId' | 'title' | 'templateType' | 'metadata'>
  >,
  categoryPageId: string,
  graph: Map<string, WikiPageGraphNode>,
): Map<string, CategoryLocationTrailResult> {
  const results = new Map<string, CategoryLocationTrailResult>();
  for (const child of children) {
    results.set(
      child.id,
      computeLocationAncestorTrail(child, categoryPageId, graph),
    );
  }
  return results;
}

export function graphFromWikiPageRows(
  pages: Array<{
    id: string;
    title: string;
    parentId: string | null;
    templateType: string;
    metadata: unknown;
  }>,
): Map<string, WikiPageGraphNode> {
  return buildWikiPageGraph(
    pages.map((page) => ({
      id: page.id,
      title: page.title,
      parentId: page.parentId,
      templateType: page.templateType,
      metadata: page.metadata,
    })),
  );
}
