/**
 * Thread creation wizard copy, body seeds, and contextual kind suggestions.
 */
import type { ThreadKind } from './threadMetadata.js';

export interface ThreadKindCreateCopy {
  label: string;
  example: string;
  description: string;
}

export const THREAD_KIND_CREATE_COPY: Record<ThreadKind, ThreadKindCreateCopy> = {
  mystery: {
    label: 'Mystery',
    example: 'Who poisoned the king?',
    description: 'Unanswered questions or hidden truths.',
  },
  promise: {
    label: 'Promise',
    example: 'The duke vowed repayment.',
    description: 'Obligations, vows, or expected future developments.',
  },
  foreshadowing: {
    label: 'Foreshadowing',
    example: 'Ash falling from clear skies.',
    description: 'Signals or omens hinting at future events.',
  },
  clue: {
    label: 'Clue',
    example: 'A torn cult ledger.',
    description: 'Specific investigative evidence or discoveries.',
  },
  theory: {
    label: 'Theory',
    example: 'Players suspect the bishop.',
    description: 'Player speculation or interpretations (non-canonical).',
  },
};

export function buildThreadBodyMarkdown(kind: ThreadKind): string {
  switch (kind) {
    case 'mystery':
      return `## What is unknown?

## Who is affected?

## What clues exist?
`;
    case 'promise':
      return `## What was promised?

## Who expects fulfillment?

## What happens if ignored?
`;
    case 'foreshadowing':
      return `## What future event is hinted at?

## How subtle is the signal?

## What signs have appeared already?
`;
    case 'clue':
      return `## What does this point toward?

## Is the clue trustworthy?

## Who discovered it?
`;
    case 'theory':
      return `## Who proposed this theory?

## Supporting evidence

## Contradictions
`;
    default:
      return '';
  }
}

/** Suggest a default kind when creating from an entity wiki page context. */
export function suggestThreadKindFromContext(
  entityCategoryKey: string | null | undefined,
): ThreadKind {
  const key = (entityCategoryKey ?? '').trim().toLowerCase();
  if (key === 'quest' || key === 'quests') return 'foreshadowing';
  if (key === 'character' || key === 'characters' || key === 'npc') return 'mystery';
  if (key === 'location' || key === 'locations') return 'mystery';
  if (key === 'organization' || key === 'organizations') return 'promise';
  return 'mystery';
}
