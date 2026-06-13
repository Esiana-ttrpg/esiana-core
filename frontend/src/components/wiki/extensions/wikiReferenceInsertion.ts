/**
 * Shared wiki reference insertion pipeline for [[ and / trigger adapters.
 *
 * Canonical identity = ProseMirror node attrs (targetPageId, label, resolved).
 * Markdown/HTML persistence uses data-stub spans for unresolved links;
 * bare [[Label]] on import parses as unresolved stub. Stubs never auto-resolve
 * by label matching on rename. Resolved labels update via propagatePageTitleRename.
 *
 * Future-ready: semanticReferences should eventually prefer node attrs over regex.
 */
import type { EditorView } from '@tiptap/pm/view';
import type { Node as ProseMirrorNode } from '@tiptap/pm/model';
import { normalizeAlias } from '@/lib/normalizeAlias';
import type { WikiLinkIndexEntry } from '@/lib/wikiLoreGraph';

export type WikiSuggestionTrigger = 'bracket' | 'slash';

export type WikiSuggestionContext = {
  active: boolean;
  query: string;
  from: number;
  to: number;
  top: number;
  left: number;
  trigger: WikiSuggestionTrigger;
};

export type WikiSuggestionRangeInput = {
  active: boolean;
  query: string;
  from: number;
  to: number;
  top: number;
  left: number;
  trigger?: WikiSuggestionTrigger;
};

export type ResolveWikiSuggestionOptions = {
  limit?: number;
  recentPageIds?: readonly string[];
  currentPageLinkedIds?: readonly string[];
  pinnedPageIds?: readonly string[];
};

export type WikiSuggestionSectionKey =
  | 'recent'
  | 'onPage'
  | 'pinned'
  | 'frequent';

export type WikiSuggestionSection = {
  key: WikiSuggestionSectionKey;
  label: string;
  entries: WikiLinkIndexEntry[];
};

export type WikiReferenceInsertTarget =
  | WikiLinkIndexEntry
  | { label: string; resolved: false };

const DEFAULT_LIMIT = 12;
const SECTION_LIMIT = 8;
const MAX_RECENT_TRACKED = 32;

const SECTION_LABELS: Record<WikiSuggestionSectionKey, string> = {
  recent: 'Recent',
  onPage: 'On this page',
  pinned: 'Pinned',
  frequent: 'Frequently referenced',
};

export function openWikiSuggestion(
  state: WikiSuggestionRangeInput,
): WikiSuggestionContext {
  return {
    ...state,
    trigger: state.trigger ?? 'bracket',
  };
}

function entriesForIds(
  ids: readonly string[],
  byPageId: Map<string, WikiLinkIndexEntry>,
  cap: number,
): WikiLinkIndexEntry[] {
  const out: WikiLinkIndexEntry[] = [];
  const seen = new Set<string>();
  for (const id of ids) {
    if (seen.has(id)) continue;
    const entry = byPageId.get(id);
    if (!entry) continue;
    seen.add(id);
    out.push(entry);
    if (out.length >= cap) break;
  }
  return out;
}

function primaryEntryByPageId(
  entries: WikiLinkIndexEntry[],
): Map<string, WikiLinkIndexEntry> {
  const map = new Map<string, WikiLinkIndexEntry>();
  for (const entry of entries) {
    if (!map.has(entry.pageId)) {
      map.set(entry.pageId, entry);
    }
  }
  return map;
}

function frequentlyReferencedIds(
  entries: WikiLinkIndexEntry[],
  cap: number,
): string[] {
  const byPage = primaryEntryByPageId(entries);
  return [...byPage.values()]
    .sort(
      (a, b) => (b.inboundLinkCount ?? 0) - (a.inboundLinkCount ?? 0),
    )
    .slice(0, cap)
    .map((e) => e.pageId);
}

/** Tiered sections for empty-query slash menu (and bracket browse). */
export function resolveWikiSuggestionSections(
  query: string,
  entries: WikiLinkIndexEntry[],
  options?: ResolveWikiSuggestionOptions,
): WikiSuggestionSection[] {
  const q = normalizeAlias(query);
  if (q) {
    return [
      {
        key: 'recent',
        label: 'Matches',
        entries: resolveWikiSuggestion(query, entries, options),
      },
    ];
  }

  const byPageId = primaryEntryByPageId(entries);
  const cap = options?.limit ?? SECTION_LIMIT;
  const tiers: Array<{ key: WikiSuggestionSectionKey; ids: readonly string[] }> =
    [
      { key: 'recent', ids: options?.recentPageIds ?? [] },
      { key: 'onPage', ids: options?.currentPageLinkedIds ?? [] },
      { key: 'pinned', ids: options?.pinnedPageIds ?? [] },
      {
        key: 'frequent',
        ids: frequentlyReferencedIds(entries, cap),
      },
    ];

  const used = new Set<string>();
  const sections: WikiSuggestionSection[] = [];

  for (const tier of tiers) {
    const tierEntries: WikiLinkIndexEntry[] = [];
    for (const id of tier.ids) {
      if (used.has(id)) continue;
      const entry = byPageId.get(id);
      if (!entry) continue;
      used.add(id);
      tierEntries.push(entry);
      if (tierEntries.length >= cap) break;
    }
    if (tierEntries.length > 0) {
      sections.push({
        key: tier.key,
        label: SECTION_LABELS[tier.key],
        entries: tierEntries,
      });
    }
  }

  if (sections.length === 0) {
    return [
      {
        key: 'frequent',
        label: SECTION_LABELS.frequent,
        entries: entries.slice(0, cap),
      },
    ];
  }

  return sections;
}

/** Single ranking/filter path for codex index suggestions. */
export function resolveWikiSuggestion(
  query: string,
  entries: WikiLinkIndexEntry[],
  options?: ResolveWikiSuggestionOptions,
): WikiLinkIndexEntry[] {
  const limit = options?.limit ?? DEFAULT_LIMIT;
  const q = normalizeAlias(query);

  if (!q) {
    const flat = resolveWikiSuggestionSections(query, entries, options);
    const merged: WikiLinkIndexEntry[] = [];
    const seen = new Set<string>();
    for (const section of flat) {
      for (const entry of section.entries) {
        if (seen.has(entry.pageId)) continue;
        seen.add(entry.pageId);
        merged.push(entry);
        if (merged.length >= limit) return merged;
      }
    }
    return merged;
  }

  return entries
    .filter(
      (e) =>
        e.normalizedLabel.includes(q) || normalizeAlias(e.title).includes(q),
    )
    .slice(0, limit);
}

/** Collect resolved wikiLink target ids from an open editor document. */
export function collectWikiLinkTargetIdsFromDoc(
  doc: ProseMirrorNode,
): string[] {
  const ids = new Set<string>();
  doc.descendants((node) => {
    if (node.type.name !== 'wikiLink') return;
    const pageId = node.attrs.targetPageId as string | null | undefined;
    if (pageId?.trim()) ids.add(pageId);
  });
  return [...ids];
}

/** Collect from TipTap editor view when available. */
export function collectWikiLinkTargetIdsFromEditor(
  editor: { state: { doc: ProseMirrorNode } } | null,
): string[] {
  if (!editor) return [];
  return collectWikiLinkTargetIdsFromDoc(editor.state.doc);
}

export function insertWikiReference(
  view: EditorView,
  range: { from: number; to: number },
  target: WikiReferenceInsertTarget,
): void {
  const { schema } = view.state;
  const nodeType = schema.nodes.wikiLink;
  if (!nodeType) return;

  const isEntry = 'pageId' in target;
  const node = nodeType.create({
    targetPageId: isEntry ? target.pageId : null,
    label: isEntry ? target.label : target.label,
    resolved: isEntry,
  });

  const tr = view.state.tr.replaceWith(range.from, range.to, node);
  view.dispatch(tr);

  if (isEntry) {
    trackRecentReference(target.pageId);
  }
}

const recentPageIds: string[] = [];

export function trackRecentReference(pageId: string): void {
  if (!pageId.trim()) return;
  const next = [pageId, ...recentPageIds.filter((id) => id !== pageId)];
  recentPageIds.length = 0;
  recentPageIds.push(...next.slice(0, MAX_RECENT_TRACKED));
}

export function getRecentReferencePageIds(): readonly string[] {
  return recentPageIds;
}

export function resetRecentReferencesForTests(): void {
  recentPageIds.length = 0;
}

export function insertWikiLinkFromSuggestion(
  view: EditorView,
  state: { from: number; to: number },
  entry: WikiLinkIndexEntry,
): void {
  insertWikiReference(view, state, entry);
}

export function filterWikiLinkIndex(
  entries: WikiLinkIndexEntry[],
  query: string,
): WikiLinkIndexEntry[] {
  return resolveWikiSuggestion(query, entries);
}
