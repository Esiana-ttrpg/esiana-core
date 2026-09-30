/**
 * Effective filter state deriving from draft query text + UI tab selection.
 * One normalized filtering system — tabs and type:/in: do not compete.
 */

import {
  buildFilterChips,
  hasTypeOperators,
  parseGlobalSearchQuery,
  setTypeFilterInQuery,
  stripFilterFromQuery,
  type GlobalSearchFilterChip,
  type GlobalSearchParsedQuery,
} from '@shared/globalSearchQuery';

export interface EffectiveSearchState {
  parsed: GlobalSearchParsedQuery;
  /** Type key reflected by the tab strip (null = All). */
  effectiveType: string | null;
  chips: GlobalSearchFilterChip[];
  /** True when type:/in: in the query text owns the type filter. */
  typeFromQuery: boolean;
  /** Params to send to the search API. */
  requestParams: { q: string; type: string | null };
}

/**
 * Derive the single effective filter from draft text and optional UI tab.
 *
 * Rules:
 * - If the query contains type:/in:, those win. URL type is not sent.
 *   Tab mirrors the first type when exactly one; multi-type → All visually
 *   (chips still show).
 * - Otherwise the UI tab is the type filter (Pass 1 behavior).
 */
export function deriveEffectiveSearchState(
  draft: string,
  uiType: string | null,
): EffectiveSearchState {
  const parsed = parseGlobalSearchQuery(draft);
  const chips = buildFilterChips(parsed);
  const typeFromQuery = hasTypeOperators(parsed);

  if (typeFromQuery) {
    const types = parsed.filters.types ?? [];
    const effectiveType = types.length === 1 ? types[0]! : null;
    return {
      parsed,
      effectiveType,
      chips,
      typeFromQuery: true,
      requestParams: { q: parsed.raw, type: null },
    };
  }

  return {
    parsed,
    effectiveType: uiType,
    chips,
    typeFromQuery: false,
    requestParams: { q: parsed.raw || draft.trim(), type: uiType },
  };
}

/**
 * Handle a tab click. When the query already has type operators, rewrite the
 * text so the UI can never say "Characters" while the query says type:location.
 * When it does not, keep Pass 1 behavior (UI-only filter, no text churn).
 */
export function applyTabSelection(
  draft: string,
  typeKey: string | null,
): { draft: string; uiType: string | null } {
  const parsed = parseGlobalSearchQuery(draft);
  if (hasTypeOperators(parsed)) {
    return {
      draft: setTypeFilterInQuery(draft, typeKey),
      uiType: typeKey,
    };
  }
  return { draft, uiType: typeKey };
}

/**
 * Remove a filter chip. Clears UI type when the removed chip was a type/in chip.
 */
export function applyChipRemoval(
  draft: string,
  chip: GlobalSearchFilterChip,
  uiType: string | null,
): { draft: string; uiType: string | null } {
  const nextDraft = stripFilterFromQuery(draft, chip);
  if (chip.kind === 'type' || chip.kind === 'in') {
    const next = deriveEffectiveSearchState(nextDraft, uiType);
    // If no type operators remain, clear UI type so we don't re-impose a filter.
    if (!next.typeFromQuery) {
      return { draft: nextDraft, uiType: null };
    }
    return { draft: nextDraft, uiType: next.effectiveType };
  }
  return { draft: nextDraft, uiType };
}
