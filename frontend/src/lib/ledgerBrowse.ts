import type { LedgerTransactionLine } from '@shared/downtimeHub';
import {
  LEDGER_CATEGORIES,
  LEDGER_ENTRY_KINDS,
  formatLedgerCategoryLabel,
  type LedgerCategory,
  type LedgerEntryKind,
} from '@shared/ledgerMetadata';

export type LedgerSortMode = 'newest' | 'oldest' | 'amountDesc' | 'amountAsc';

export type LedgerBrowseState = {
  search: string;
  categories: LedgerCategory[];
  entryKinds: LedgerEntryKind[];
};

export const DEFAULT_LEDGER_BROWSE_STATE: LedgerBrowseState = {
  search: '',
  categories: [],
  entryKinds: [],
};

export const LEDGER_SORT_OPTIONS: { id: LedgerSortMode; label: string }[] = [
  { id: 'newest', label: 'Newest' },
  { id: 'oldest', label: 'Oldest' },
  { id: 'amountDesc', label: 'Amount high' },
  { id: 'amountAsc', label: 'Amount low' },
];

const ENTRY_KIND_LABELS: Record<LedgerEntryKind, string> = {
  credit: 'Credit',
  debit: 'Debit',
  debt_open: 'Debt opened',
  debt_payment: 'Debt payment',
};

export function ledgerEntryKindLabel(kind: LedgerEntryKind): string {
  return ENTRY_KIND_LABELS[kind] ?? kind;
}

export function hasActiveLedgerBrowse(state: LedgerBrowseState): boolean {
  return (
    state.search.trim().length > 0 ||
    state.categories.length > 0 ||
    state.entryKinds.length > 0
  );
}

function normalizeSearch(value: string): string {
  return value.trim().toLowerCase();
}

function lineMatchesSearch(line: LedgerTransactionLine, query: string): boolean {
  if (!query) return true;
  const haystack = [
    line.title,
    line.narrative ?? '',
    line.contributorTitle ?? '',
    line.categoryLabel,
  ]
    .join('\n')
    .toLowerCase();
  return haystack.includes(query);
}

function compareLedgerLines(
  a: LedgerTransactionLine,
  b: LedgerTransactionLine,
  sort: LedgerSortMode,
): number {
  switch (sort) {
    case 'oldest':
      return a.dateLabel.localeCompare(b.dateLabel);
    case 'amountDesc':
      return b.amount - a.amount || a.title.localeCompare(b.title);
    case 'amountAsc':
      return a.amount - b.amount || a.title.localeCompare(b.title);
    case 'newest':
    default:
      return b.dateLabel.localeCompare(a.dateLabel);
  }
}

export function projectLedgerFeed(
  lines: LedgerTransactionLine[],
  state: LedgerBrowseState,
  sort: LedgerSortMode = 'newest',
): LedgerTransactionLine[] {
  const query = normalizeSearch(state.search);
  const categorySet =
    state.categories.length > 0 ? new Set(state.categories) : null;
  const kindSet = state.entryKinds.length > 0 ? new Set(state.entryKinds) : null;

  const filtered = lines.filter((line) => {
    if (categorySet && !categorySet.has(line.category)) return false;
    if (kindSet && !kindSet.has(line.entryKind)) return false;
    return lineMatchesSearch(line, query);
  });

  if (sort === 'newest') {
    return filtered;
  }

  return [...filtered].sort((a, b) => compareLedgerLines(a, b, sort));
}

export type LedgerRefineChip = {
  id: string;
  label: string;
};

export function listLedgerRefineChips(state: LedgerBrowseState): LedgerRefineChip[] {
  const chips: LedgerRefineChip[] = [];
  for (const category of state.categories) {
    chips.push({
      id: `category:${category}`,
      label: formatLedgerCategoryLabel(category),
    });
  }
  for (const kind of state.entryKinds) {
    chips.push({
      id: `kind:${kind}`,
      label: ledgerEntryKindLabel(kind),
    });
  }
  if (state.search.trim()) {
    chips.push({
      id: 'search',
      label: `Search: ${state.search.trim()}`,
    });
  }
  return chips;
}

export function clearLedgerRefineChip(
  state: LedgerBrowseState,
  chipId: string,
): LedgerBrowseState {
  if (chipId === 'search') {
    return { ...state, search: '' };
  }
  if (chipId.startsWith('category:')) {
    const category = chipId.slice('category:'.length) as LedgerCategory;
    return {
      ...state,
      categories: state.categories.filter((value) => value !== category),
    };
  }
  if (chipId.startsWith('kind:')) {
    const kind = chipId.slice('kind:'.length) as LedgerEntryKind;
    return {
      ...state,
      entryKinds: state.entryKinds.filter((value) => value !== kind),
    };
  }
  return state;
}

export function resetLedgerBrowse(): LedgerBrowseState {
  return { ...DEFAULT_LEDGER_BROWSE_STATE };
}

export function toggleLedgerCategory(
  state: LedgerBrowseState,
  category: LedgerCategory,
): LedgerBrowseState {
  const has = state.categories.includes(category);
  return {
    ...state,
    categories: has
      ? state.categories.filter((value) => value !== category)
      : [...state.categories, category],
  };
}

export function toggleLedgerEntryKind(
  state: LedgerBrowseState,
  kind: LedgerEntryKind,
): LedgerBrowseState {
  const has = state.entryKinds.includes(kind);
  return {
    ...state,
    entryKinds: has
      ? state.entryKinds.filter((value) => value !== kind)
      : [...state.entryKinds, kind],
  };
}

export const LEDGER_BROWSE_CATEGORIES = LEDGER_CATEGORIES;
export const LEDGER_BROWSE_ENTRY_KINDS = LEDGER_ENTRY_KINDS;
