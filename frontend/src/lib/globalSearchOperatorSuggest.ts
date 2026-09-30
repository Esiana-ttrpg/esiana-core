/**
 * Lightweight operator autocomplete for type:/in:/from: while typing.
 * Static for type/in; members list (fetched once) for from:.
 */

import {
  listInScopeSuggestions,
  listTypeSuggestions,
} from '@shared/globalSearchTypes';
import type { CampaignMemberIdentity } from '@/lib/campaignMemberIdentity';
import { memberDisplayLabel } from '@/lib/campaignMemberIdentity';

export type OperatorSuggestKind = 'type' | 'in' | 'from';

export interface OperatorContext {
  operator: OperatorSuggestKind;
  /** Partial value after the colon (may be empty). */
  partial: string;
  /** Character range in the draft to replace on accept. */
  replaceRange: { start: number; end: number };
}

export interface OperatorSuggestion {
  /** Text inserted after the operator (quoted if needed). */
  insertValue: string;
  /** Primary label shown in the list. */
  label: string;
  /** Optional secondary disambiguation (role / identity) — not inserted. */
  detail?: string;
}

export interface OperatorSuggestState {
  open: boolean;
  activeIndex: number;
  suggestions: OperatorSuggestion[];
  context: OperatorContext | null;
}

export type OperatorSuggestAction =
  | { type: 'ArrowDown' }
  | { type: 'ArrowUp' }
  | { type: 'Enter' }
  | { type: 'Escape' }
  | { type: 'set'; suggestions: OperatorSuggestion[]; context: OperatorContext | null }
  | { type: 'close' };

export type OperatorSuggestEffect =
  | { type: 'none' }
  | { type: 'close' }
  | { type: 'accept'; suggestion: OperatorSuggestion };

const OPERATOR_RE = /\b(type|in|from):("[^"]*"?|[^\s]*)$/i;

/**
 * Detect whether the caret is currently completing a recognized operator.
 */
export function detectOperatorContext(
  draft: string,
  caretIndex: number,
): OperatorContext | null {
  const before = draft.slice(0, Math.max(0, Math.min(caretIndex, draft.length)));
  const match = OPERATOR_RE.exec(before);
  if (!match) return null;
  const operator = match[1]!.toLowerCase() as OperatorSuggestKind;
  let partial = match[2] ?? '';
  if (partial.startsWith('"')) {
    partial = partial.slice(1).replace(/"$/, '');
  }
  const start = before.length - match[0].length;
  return {
    operator,
    partial,
    replaceRange: { start, end: caretIndex },
  };
}

function quoteIfNeeded(value: string): string {
  return /\s/.test(value) ? `"${value}"` : value;
}

export function buildOperatorSuggestions(
  context: OperatorContext,
  options: {
    members?: CampaignMemberIdentity[];
  } = {},
): OperatorSuggestion[] {
  const partial = context.partial.trim().toLowerCase();

  if (context.operator === 'type') {
    return listTypeSuggestions()
      .filter(
        (t) =>
          !partial ||
          t.key.includes(partial) ||
          t.label.toLowerCase().includes(partial),
      )
      .map((t) => ({ insertValue: t.key, label: t.label }));
  }

  if (context.operator === 'in') {
    return listInScopeSuggestions()
      .filter(
        (s) =>
          !partial ||
          s.scope.includes(partial) ||
          s.label.toLowerCase().includes(partial),
      )
      .map((s) => ({ insertValue: s.scope, label: s.label }));
  }

  // from:
  const members = options.members ?? [];
  const nameCounts = new Map<string, number>();
  for (const member of members) {
    const name = memberDisplayLabel(member);
    nameCounts.set(name.toLowerCase(), (nameCounts.get(name.toLowerCase()) ?? 0) + 1);
  }

  return members
    .map((member) => {
      const name = memberDisplayLabel(member);
      const detailParts: string[] = [];
      if (member.role) detailParts.push(member.role);
      if (member.playerContext || member.label) {
        detailParts.push(
          (member.playerContext || member.label || '').trim(),
        );
      }
      const dup = (nameCounts.get(name.toLowerCase()) ?? 0) > 1;
      return {
        insertValue: quoteIfNeeded(name),
        label: name,
        detail: dup || detailParts.length > 0 ? detailParts.filter(Boolean).join(' · ') : undefined,
        _sort: name.toLowerCase(),
      };
    })
    .filter(
      (s) =>
        !partial ||
        s._sort.includes(partial) ||
        (s.detail?.toLowerCase().includes(partial) ?? false),
    )
    .sort((a, b) => a._sort.localeCompare(b._sort))
    .map(({ insertValue, label, detail }) => ({ insertValue, label, detail }));
}

/**
 * Apply a suggestion into the draft at the operator's replace range.
 */
export function applyOperatorSuggestion(
  draft: string,
  context: OperatorContext,
  suggestion: OperatorSuggestion,
): { draft: string; caret: number } {
  const insertion = `${context.operator}:${suggestion.insertValue} `;
  const next =
    draft.slice(0, context.replaceRange.start) +
    insertion +
    draft.slice(context.replaceRange.end);
  return {
    draft: next,
    caret: context.replaceRange.start + insertion.length,
  };
}

export function reduceSuggestionKeyboard(
  state: OperatorSuggestState,
  action: OperatorSuggestAction,
): { state: OperatorSuggestState; effect: OperatorSuggestEffect } {
  if (action.type === 'close' || action.type === 'Escape') {
    return {
      state: { ...state, open: false, activeIndex: 0, context: null },
      effect: { type: 'close' },
    };
  }
  if (action.type === 'set') {
    const suggestions = action.suggestions;
    return {
      state: {
        open: suggestions.length > 0 && action.context != null,
        activeIndex: 0,
        suggestions,
        context: action.context,
      },
      effect: { type: 'none' },
    };
  }
  if (!state.open || state.suggestions.length === 0) {
    return { state, effect: { type: 'none' } };
  }
  if (action.type === 'ArrowDown') {
    return {
      state: {
        ...state,
        activeIndex: (state.activeIndex + 1) % state.suggestions.length,
      },
      effect: { type: 'none' },
    };
  }
  if (action.type === 'ArrowUp') {
    return {
      state: {
        ...state,
        activeIndex:
          (state.activeIndex - 1 + state.suggestions.length) %
          state.suggestions.length,
      },
      effect: { type: 'none' },
    };
  }
  if (action.type === 'Enter') {
    const suggestion = state.suggestions[state.activeIndex];
    if (!suggestion) return { state, effect: { type: 'none' } };
    return {
      state: { ...state, open: false, activeIndex: 0, context: null },
      effect: { type: 'accept', suggestion },
    };
  }
  return { state, effect: { type: 'none' } };
}
