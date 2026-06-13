import { NarrativeLifecycleStates } from '@shared/narrativeLifecycle';
import { DOWNTIME_HAVEN_TEMPLATE_TYPE } from '@shared/havenMetadata';
import type { EventConsequenceKind } from '@shared/eventConsequence';
import { isPageUnderNarrativeScenesCategory } from '@/lib/adventureLayout';
import { filterRegionLocationPages } from '@/lib/locationMetadata';
import { isPageUnderQuestsCategory } from '@/lib/questHubLayout';
import {
  isPageUnderNarrativeThreadsCategory,
  resolveNarrativeThreadsRootId,
} from '@/lib/threadHubLayout';
import { createThreadPage, createWikiPage } from '@/lib/wiki';
import { parseSystemCategoryKey } from '@/lib/wikiSystemCategory';
import type { WikiTreeNode } from '@/types/wiki';

const WIKILINK_ID_REGEX = /data-type="(?:wikiLink|mention)"[^>]*data-id="([^"]*)"/g;
const BRACKET_WIKILINK_REGEX = /\[\[([^[\]]+)\]\]/g;

function walkBlocks(blocks: unknown[], visit: (value: string) => void): void {
  for (const block of blocks) {
    if (!block || typeof block !== 'object') continue;
    const record = block as Record<string, unknown>;
    const content = record.content;
    if (content && typeof content === 'object') {
      const markdown = (content as { markdown?: unknown }).markdown;
      if (typeof markdown === 'string' && markdown.trim()) {
        visit(markdown);
      }
    }
    if (typeof record.markdown === 'string' && record.markdown.trim()) {
      visit(record.markdown);
    }
    for (const key of ['children', 'blocks', 'items']) {
      const nested = record[key];
      if (Array.isArray(nested)) walkBlocks(nested, visit);
    }
  }
}

export function extractLoreLinkedPageIds(
  loreBlocks: unknown[],
  flatPages: readonly WikiTreeNode[],
): string[] {
  const ids = new Set<string>();
  const titleByLower = new Map(
    flatPages.map((page) => [page.title.trim().toLowerCase(), page.id]),
  );

  walkBlocks(loreBlocks, (text) => {
    for (const match of text.matchAll(WIKILINK_ID_REGEX)) {
      const id = match[1]?.trim();
      if (id) ids.add(id);
    }
    for (const match of text.matchAll(BRACKET_WIKILINK_REGEX)) {
      const title = match[1]?.trim().toLowerCase();
      if (!title) continue;
      const pageId = titleByLower.get(title);
      if (pageId) ids.add(pageId);
    }
  });

  return [...ids];
}

function sortWithLoreFirst(
  pages: WikiTreeNode[],
  loreLinkedIds: Set<string>,
): WikiTreeNode[] {
  return [...pages].sort((a, b) => {
    const aLore = loreLinkedIds.has(a.id) ? 0 : 1;
    const bLore = loreLinkedIds.has(b.id) ? 0 : 1;
    if (aLore !== bLore) return aLore - bLore;
    return a.title.localeCompare(b.title, undefined, { sensitivity: 'base' });
  });
}

export function suggestPagesForConsequenceKind(
  kind: EventConsequenceKind,
  flatPages: readonly WikiTreeNode[],
  loreBlocks: unknown[],
  limit = 6,
): WikiTreeNode[] {
  const loreLinkedIds = new Set(extractLoreLinkedPageIds(loreBlocks, flatPages));
  const loreLinked = flatPages.filter((page) => {
    if (!loreLinkedIds.has(page.id)) return false;
    if (kind === 'quest_hook') return isOpportunityPickerEligible(page);
    return true;
  });

  let pool: WikiTreeNode[] = [];
  switch (kind) {
    case 'quest_hook':
      pool = flatPages.filter(
        (page) =>
          isOpportunityPickerEligible(page) &&
          isPreferredOpportunityPage(page, flatPages),
      );
      break;
    case 'alter_location':
    case 'route_change':
      pool = filterRegionLocationPages([...flatPages]);
      break;
    case 'haven_threat':
      pool = flatPages.filter((page) => page.templateType === DOWNTIME_HAVEN_TEMPLATE_TYPE);
      break;
    default:
      pool = [...flatPages];
  }

  const merged = sortWithLoreFirst(
    [...new Map([...loreLinked, ...pool].map((page) => [page.id, page])).values()],
    loreLinkedIds,
  );
  return merged.slice(0, limit);
}

export function buildPageTitleLookup(
  flatPages: readonly WikiTreeNode[],
): Record<string, string> {
  return Object.fromEntries(flatPages.map((page) => [page.id, page.title]));
}

function sortPages(pages: WikiTreeNode[]): WikiTreeNode[] {
  return [...pages].sort((a, b) =>
    a.title.localeCompare(b.title, undefined, { sensitivity: 'base' }),
  );
}

/** System hub folders (Quests, Ancestries, Threads, etc.) — not link targets. */
export function isWikiSystemCategoryPage(page: WikiTreeNode): boolean {
  return parseSystemCategoryKey(page.metadata) != null;
}

/** Top-level sidebar roots (e.g. Ancestries, Characters) — not link targets. */
export function isTopLevelWikiPage(page: WikiTreeNode): boolean {
  return page.parentId == null;
}

export function isOpportunityPickerEligible(page: WikiTreeNode): boolean {
  return !isWikiSystemCategoryPage(page) && !isTopLevelWikiPage(page);
}

function opportunityPriority(page: WikiTreeNode, flatPages: readonly WikiTreeNode[]): number {
  if (page.templateType === 'QUEST') return 0;
  if (page.templateType === 'SCENE') return 1;
  if (isPageUnderQuestsCategory(page.id, [...flatPages])) return 2;
  if (isPageUnderNarrativeScenesCategory(page.id, [...flatPages])) return 3;
  if (isPageUnderNarrativeThreadsCategory(page.id, flatPages)) return 4;
  return 5;
}

function sortOpportunityPages(
  pages: WikiTreeNode[],
  flatPages: readonly WikiTreeNode[],
): WikiTreeNode[] {
  return [...pages].sort((a, b) => {
    const priorityDelta = opportunityPriority(a, flatPages) - opportunityPriority(b, flatPages);
    if (priorityDelta !== 0) return priorityDelta;
    return a.title.localeCompare(b.title, undefined, { sensitivity: 'base' });
  });
}

/** Quests and scenes first; excludes top-level hubs and system category folders. */
export function buildOpportunitySearchOptions(
  flatPages: readonly WikiTreeNode[],
): WikiTreeNode[] {
  return sortOpportunityPages(
    flatPages.filter(isOpportunityPickerEligible),
    flatPages,
  );
}

export function isPreferredOpportunityPage(
  page: WikiTreeNode,
  flatPages: readonly WikiTreeNode[],
): boolean {
  return opportunityPriority(page, flatPages) <= 4;
}

export async function createOpportunityWikiPage(
  campaignHandle: string,
  flatPages: readonly WikiTreeNode[],
  title: string,
): Promise<WikiTreeNode> {
  const trimmed = title.trim();
  if (!trimmed) {
    throw new Error('Page title is required');
  }

  const threadsRootId = resolveNarrativeThreadsRootId(flatPages);
  if (threadsRootId) {
    return createThreadPage(campaignHandle, threadsRootId, {
      title: trimmed,
      threadKind: 'mystery',
      initialLifecycle: NarrativeLifecycleStates.DISCOVERED,
    });
  }

  return createWikiPage(campaignHandle, {
    title: trimmed,
    parentId: null,
    templateType: 'QUEST',
  });
}
