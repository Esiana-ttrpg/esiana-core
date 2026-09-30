import type {
  GlobalSearchResult,
  GlobalSearchSection,
  GlobalSearchTypeCount,
} from '../../../../shared/globalSearch.js';
import {
  globalSearchTypeLabel,
  isRecordSearchTypeKey,
} from '../../../../shared/globalSearchTypes.js';
import {
  compareRankedResults,
  isContentMatch,
  isExactNameTier,
  isNameMatch,
  TIER_WIDTH,
} from './searchRanking.js';

const BEST_CAP = 3;
const GROUP_VISIBLE_CAP = 3;

export interface ShapeSearchResultsInput {
  results: GlobalSearchResult[];
  limit: number;
  /** When non-null, skip section shaping and return a flat sliced list. */
  types: string[] | null;
  /** True when the wiki provider hit SEARCH_CANDIDATE_CEILING. */
  hitCandidateCeiling?: boolean;
}

export interface ShapeSearchResultsOutput {
  results: GlobalSearchResult[];
  sections?: GlobalSearchSection[];
}

/** Keep the highest-scoring result per entityId. */
export function dedupeByEntityId(results: GlobalSearchResult[]): GlobalSearchResult[] {
  const best = new Map<string, GlobalSearchResult>();
  for (const r of results) {
    const existing = best.get(r.entityId);
    if (!existing || r.score > existing.score) {
      best.set(r.entityId, r);
    }
  }
  return [...best.values()].sort(compareRankedResults);
}

function buildTypeCounts(results: GlobalSearchResult[]): GlobalSearchTypeCount[] {
  const byKey = new Map<string, GlobalSearchTypeCount>();
  for (const result of results) {
    const existing = byKey.get(result.type.key);
    if (existing) {
      existing.count += 1;
    } else {
      byKey.set(result.type.key, {
        key: result.type.key,
        label: result.type.label,
        count: 1,
      });
    }
  }
  return [...byKey.values()].sort((a, b) => {
    if (b.count !== a.count) return b.count - a.count;
    return a.label.localeCompare(b.label);
  });
}

export { buildTypeCounts };

/**
 * Select "best" name matches by confidence / dominance.
 * Exact-tier hits always qualify (cap BEST_CAP). Otherwise a leading name
 * hit qualifies when it dominates the next distinct-entity name hit by
 * TIER_WIDTH, or when it is the only name hit.
 */
export function selectBestMatches(sorted: GlobalSearchResult[]): GlobalSearchResult[] {
  const nameHits = sorted.filter((r) => isNameMatch(r.matchedOn));
  if (nameHits.length === 0) return [];

  const exact = nameHits.filter((r) => isExactNameTier(r.score));
  if (exact.length > 0) {
    return exact.slice(0, BEST_CAP);
  }

  const top = nameHits[0]!;
  const nextOther = nameHits.find((r) => r.entityId !== top.entityId);
  if (!nextOther || top.score - nextOther.score >= TIER_WIDTH) {
    return [top];
  }
  // Sole name hit after filtering duplicates of the same entity.
  if (!nextOther) return [top];
  return [];
}

function pluralizeTypeLabel(typeKey: string, count: number): string {
  const label = globalSearchTypeLabel(typeKey).toLowerCase();
  if (count === 1) return label;
  // Lightweight pluralisation for known labels.
  if (label.endsWith('y')) return `${label.slice(0, -1)}ies`;
  if (label.endsWith('s')) return label;
  return `${label}s`;
}

interface GroupBucket {
  kind: 'best' | 'mentions' | 'type';
  key: string;
  label: string;
  typeKey?: string;
  items: GlobalSearchResult[];
}

/**
 * Two-phase shaping:
 * (a) assign every authorized result to exactly one group; record totalCount
 * (b) pick visible rows and apply the overall limit.
 */
export function shapeSearchResults(
  input: ShapeSearchResultsInput,
): ShapeSearchResultsOutput {
  const deduped = dedupeByEntityId(input.results);

  // Type-filtered view: flat list, no sections.
  if (input.types != null && input.types.length > 0) {
    const filtered = deduped.filter((r) => input.types!.includes(r.type.key));
    return { results: filtered.slice(0, input.limit) };
  }

  if (deduped.length === 0) {
    return { results: [], sections: [] };
  }

  const best = selectBestMatches(deduped);
  const bestIds = new Set(best.map((r) => r.id));
  const remaining = deduped.filter((r) => !bestIds.has(r.id));

  const buckets: GroupBucket[] = [];

  if (best.length > 0) {
    buckets.push({
      kind: 'best',
      key: 'best',
      label: best.length === 1 ? 'Best match' : 'Best matches',
      items: best,
    });
  }

  // Mentions: content-tier record types, only when a best name match exists.
  if (best.length > 0) {
    const mentionCandidates = remaining.filter(
      (r) => isContentMatch(r.matchedOn) && isRecordSearchTypeKey(r.type.key),
    );
    const byType = new Map<string, GlobalSearchResult[]>();
    for (const r of mentionCandidates) {
      const list = byType.get(r.type.key) ?? [];
      list.push(r);
      byType.set(r.type.key, list);
    }
    const mentionTypeKeys = [...byType.keys()].sort((a, b) => {
      const aBest = byType.get(a)![0]!.score;
      const bBest = byType.get(b)![0]!.score;
      return bBest - aBest || a.localeCompare(b);
    });
    const claimed = new Set<string>();
    for (const typeKey of mentionTypeKeys) {
      const items = byType.get(typeKey)!;
      for (const item of items) claimed.add(item.id);
      buckets.push({
        kind: 'mentions',
        key: `mentions:${typeKey}`,
        label: `Mentioned in ${items.length} ${pluralizeTypeLabel(typeKey, items.length)}`,
        typeKey,
        items,
      });
    }
    // Remove claimed mentions from remaining for type groups.
    for (let i = remaining.length - 1; i >= 0; i--) {
      if (claimed.has(remaining[i]!.id)) remaining.splice(i, 1);
    }
  }

  // Type groups for everything else.
  const byType = new Map<string, GlobalSearchResult[]>();
  for (const r of remaining) {
    const list = byType.get(r.type.key) ?? [];
    list.push(r);
    byType.set(r.type.key, list);
  }
  const typeKeys = [...byType.keys()].sort((a, b) => {
    const aBest = byType.get(a)![0]!.score;
    const bBest = byType.get(b)![0]!.score;
    return bBest - aBest || a.localeCompare(b);
  });
  for (const typeKey of typeKeys) {
    const items = byType.get(typeKey)!;
    buckets.push({
      kind: 'type',
      key: `type:${typeKey}`,
      label: globalSearchTypeLabel(typeKey),
      typeKey,
      items,
    });
  }

  // Phase (a): totalCounts from full buckets.
  const sectionsMeta = buckets.map((b) => ({
    kind: b.kind,
    key: b.key,
    label: b.label,
    typeKey: b.typeKey,
    totalCount: b.items.length,
    approximate: input.hitCandidateCeiling === true ? true : undefined,
    items: b.items,
  }));

  // Phase (b): visible rows, fill best → mentions → type, cap per group and overall.
  const visible: GlobalSearchResult[] = [];
  const sections: GlobalSearchSection[] = [];
  let remainingSlots = input.limit;

  for (const meta of sectionsMeta) {
    if (remainingSlots <= 0) {
      // Still emit the section with empty resultIds so totalCount is visible
      // to "+N more" footers — but only if we already showed something in
      // prior sections. Trailing empty sections are omitted.
      break;
    }
    const perGroup =
      meta.kind === 'best'
        ? Math.min(BEST_CAP, meta.items.length, remainingSlots)
        : Math.min(GROUP_VISIBLE_CAP, meta.items.length, remainingSlots);
    if (perGroup <= 0) continue;
    const shown = meta.items.slice(0, perGroup);
    visible.push(...shown);
    remainingSlots -= shown.length;
    sections.push({
      kind: meta.kind,
      key: meta.key,
      label: meta.label,
      ...(meta.typeKey ? { typeKey: meta.typeKey } : {}),
      resultIds: shown.map((r) => r.id),
      totalCount: meta.totalCount,
      ...(meta.approximate ? { approximate: true } : {}),
    });
  }

  return { results: visible, sections };
}
