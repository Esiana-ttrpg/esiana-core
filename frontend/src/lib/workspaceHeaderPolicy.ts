import { isCategoryIndexPage } from '@/lib/wikiCategories';
import type { WikiBreadcrumb } from '@/lib/wikiHierarchy';

/** Hide breadcrumbs on category index roots — sidebar is the nav anchor. */
export function shouldShowHubBreadcrumbs(crumbs: WikiBreadcrumb[]): boolean {
  if (crumbs.length === 0) return false;
  if (crumbs.length === 1 && isCategoryIndexPage(crumbs[0].title)) return false;
  return true;
}

const CATEGORY_COUNT_NOUNS: Record<string, { singular: string; plural?: string }> = {
  Characters: { singular: 'character' },
  Organizations: { singular: 'organization' },
  Bestiary: { singular: 'creature' },
  Ancestries: { singular: 'ancestry', plural: 'ancestries' },
  'Narrative Threads': { singular: 'thread' },
  Threads: { singular: 'thread' },
  Quests: { singular: 'quest' },
  Locations: { singular: 'location' },
  Maps: { singular: 'map' },
  Objects: { singular: 'object' },
  Families: { singular: 'family', plural: 'families' },
  Journals: { singular: 'journal' },
  Tags: { singular: 'tag' },
  Projects: { singular: 'operation', plural: 'operations' },
  Havens: { singular: 'haven' },
  Ledger: { singular: 'entry', plural: 'entries' },
  'Session Notes': { singular: 'note' },
  'World Events': { singular: 'event' },
  Reputation: { singular: 'faction' },
};

export function resolveCategoryCountNouns(categoryTitle: string): {
  singular: string;
  plural?: string;
} {
  const mapped = CATEGORY_COUNT_NOUNS[categoryTitle];
  if (mapped) return mapped;

  const lower = categoryTitle.toLowerCase();
  if (lower.endsWith('ies')) {
    return { singular: `${lower.slice(0, -3)}y`, plural: lower };
  }
  if (lower.endsWith('s')) {
    return { singular: lower.slice(0, -1), plural: lower };
  }
  return { singular: lower, plural: `${lower}s` };
}

/** Operational count label — "1 character" / "317 characters". */
export function formatWorkspaceCountLabel(
  count: number,
  singular: string,
  plural?: string,
): string {
  const resolvedPlural = plural ?? `${singular}s`;
  const noun = count === 1 ? singular : resolvedPlural;
  return `${count} ${noun}`;
}

export interface WorkspaceHubCountHintInput {
  total: number;
  matching: number;
  singular: string;
  plural?: string;
  searchQuery?: string;
  hasActiveRefine?: boolean;
}

/**
 * Unified hub count hint for the action bar.
 * Quiet total when browse is inactive; "Showing X of Y" when filtered.
 */
export function formatWorkspaceHubCountHint({
  total,
  matching,
  singular,
  plural,
  searchQuery = '',
  hasActiveRefine = false,
}: WorkspaceHubCountHintInput): string | null {
  if (total <= 0) return null;

  const hasSearch = searchQuery.trim().length > 0;
  const browseActive = hasSearch || hasActiveRefine;

  if (!browseActive && matching === total) {
    return formatWorkspaceCountLabel(total, singular, plural);
  }

  if (matching === total) {
    return formatWorkspaceCountLabel(total, singular, plural);
  }

  return `Showing ${matching} of ${total}`;
}
