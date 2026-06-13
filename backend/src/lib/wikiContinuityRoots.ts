import { CATEGORY_INDEX_TITLES, isCategoryIndexTitle } from './wikiCategories.js';
import { resolveWikiCodexType } from './resolveWikiCodexType.js';
import {
  DEFAULT_WIKI_SKELETON,
  type WikiSeedNode,
} from './seedWiki.js';

export type ContinuityRole = 'root' | 'narrative' | 'system' | 'draft';

const NARRATIVE_CODEX_TYPES = new Set([
  'CHARACTER',
  'QUEST',
  'LOCATION',
  'ORGANIZATION',
  'BESTIARY',
  'OBJECT',
  'FAMILY',
  'ANCESTRY',
  'LANGUAGE',
  'RULE_RESOURCE',
]);

function flattenSkeletonTitles(nodes: WikiSeedNode[]): string[] {
  const titles: string[] = [];
  for (const node of nodes) {
    titles.push(node.title);
    if (node.children?.length) {
      titles.push(...flattenSkeletonTitles(node.children));
    }
  }
  return titles;
}

const SKELETON_ROOT_TITLES = new Set(flattenSkeletonTitles(DEFAULT_WIKI_SKELETON));

/** Titles that are intentionally root-level and should not surface as unlinked lore. */
export function getContinuityRootTitles(): ReadonlySet<string> {
  const titles = new Set<string>(SKELETON_ROOT_TITLES);
  for (const title of CATEGORY_INDEX_TITLES) {
    titles.add(title);
  }
  titles.add('Party');
  titles.add('Bookmarks');
  titles.add('Recent changes');
  return titles;
}

export interface WikiContinuityPageInput {
  id: string;
  title: string;
  templateType: string;
  metadata?: unknown;
  parentId?: string | null;
  childCount?: number;
}

export function classifyContinuityRole(
  page: WikiContinuityPageInput,
  parentIdsWithChildren?: ReadonlySet<string>,
): ContinuityRole {
  if (isContinuityRoot(page, parentIdsWithChildren)) {
    return 'root';
  }
  if (isNarrativeEntity(page)) {
    return 'narrative';
  }
  const codex = resolveWikiCodexType({
    templateType: page.templateType,
    metadata: page.metadata,
  });
  if (codex === 'DEFAULT') {
    return 'draft';
  }
  return 'system';
}

export function isContinuityRoot(
  page: WikiContinuityPageInput,
  parentIdsWithChildren?: ReadonlySet<string>,
): boolean {
  if (getContinuityRootTitles().has(page.title)) {
    return true;
  }
  if (isCategoryIndexTitle(page.title)) {
    return true;
  }
  if (parentIdsWithChildren?.has(page.id)) {
    return true;
  }
  if (page.childCount != null && page.childCount > 0) {
    return true;
  }
  return false;
}

export function isNarrativeEntity(page: WikiContinuityPageInput): boolean {
  const codex = resolveWikiCodexType({
    templateType: page.templateType,
    metadata: page.metadata,
  });
  return NARRATIVE_CODEX_TYPES.has(codex);
}

export function isEligibleForUnlinkedEntityIssue(
  page: WikiContinuityPageInput,
  inboundLinkCount: number,
  parentIdsWithChildren?: ReadonlySet<string>,
): boolean {
  if (inboundLinkCount > 0) return false;
  if (isContinuityRoot(page, parentIdsWithChildren)) return false;
  return isNarrativeEntity(page);
}
