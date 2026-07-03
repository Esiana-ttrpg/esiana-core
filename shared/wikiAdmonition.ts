/**
 * Wiki TipTap admonition variants — semantic callout blocks for lore, narrative, and GM notes.
 * @see docs/plans/tiptap-admonitions (authoring plan)
 */

export const WIKI_ADMONITION_VISUAL_PROFILES = [
  'context',
  'embedded',
  'marker',
  'artifact',
  'utterance',
  'interrupt',
] as const;

/** Layout/weight profile for CSS — tone and border weight, not per-type hue. */
export type WikiAdmonitionVisualProfile =
  (typeof WIKI_ADMONITION_VISUAL_PROFILES)[number];

export const WIKI_ADMONITION_VARIANTS = [
  'lore',
  'insight',
  'warning',
  'record',
  'thread-seed',
  'voice',
  'rule',
] as const;

export type WikiAdmonitionVariant = (typeof WIKI_ADMONITION_VARIANTS)[number];

export const DEFAULT_WIKI_ADMONITION_VARIANT: WikiAdmonitionVariant = 'lore';

export interface WikiAdmonitionVariantDefinition {
  id: WikiAdmonitionVariant;
  label: string;
  /** Picker / switcher one-liner teaching author intent. */
  pickerDescription: string;
  semanticDefinition: string;
  visualProfile: WikiAdmonitionVisualProfile;
}

export const WIKI_ADMONITION_VARIANTS_LIST: readonly WikiAdmonitionVariantDefinition[] =
  [
    {
      id: 'lore',
      label: 'Lore',
      pickerDescription: 'Neutral context, background, and world reference.',
      semanticDefinition: 'Encyclopedia tone — facts and exposition that stand apart from prose.',
      visualProfile: 'context',
    },
    {
      id: 'insight',
      label: 'Insight',
      pickerDescription: 'Interpretive signal — implication, inference, or soft truth.',
      semanticDefinition:
        'GM implication, lore inference, or layered meaning — not a future hook.',
      visualProfile: 'embedded',
    },
    {
      id: 'warning',
      label: 'Warning',
      pickerDescription: 'High-signal risk, stakes, or forbidden knowledge.',
      semanticDefinition: 'Immediate narrative stakes — proceed with caution.',
      visualProfile: 'interrupt',
    },
    {
      id: 'record',
      label: 'Record',
      pickerDescription: 'External artifact — letter, inscription, or stored document.',
      semanticDefinition:
        'In-world object the world produced — not living speech.',
      visualProfile: 'artifact',
    },
    {
      id: 'thread-seed',
      label: 'Thread seed',
      pickerDescription: 'Structural hook — open lead or branching point for later.',
      semanticDefinition:
        'Explicit narrative potential — what will branch, not what it implies.',
      visualProfile: 'marker',
    },
    {
      id: 'voice',
      label: 'Voice',
      pickerDescription: 'Living speech — dialogue, monologue, or recalled utterance.',
      semanticDefinition:
        'What was said or heard — immediacy and presence, not archival text.',
      visualProfile: 'utterance',
    },
    {
      id: 'rule',
      label: 'World rule',
      pickerDescription: 'Stable in-world logic — how something behaves here.',
      semanticDefinition: 'System-agnostic world truth, not game mechanics.',
      visualProfile: 'context',
    },
  ] as const;

const VARIANT_BY_ID = new Map(
  WIKI_ADMONITION_VARIANTS_LIST.map((entry) => [entry.id, entry]),
);

export function isWikiAdmonitionVariant(value: unknown): value is WikiAdmonitionVariant {
  return (
    typeof value === 'string' &&
    (WIKI_ADMONITION_VARIANTS as readonly string[]).includes(value)
  );
}

export function getWikiAdmonitionVariant(
  value: unknown,
): WikiAdmonitionVariantDefinition {
  if (isWikiAdmonitionVariant(value)) {
    return VARIANT_BY_ID.get(value) ?? VARIANT_BY_ID.get(DEFAULT_WIKI_ADMONITION_VARIANT)!;
  }
  return VARIANT_BY_ID.get(DEFAULT_WIKI_ADMONITION_VARIANT)!;
}

export function normalizeWikiAdmonitionVariant(
  value: unknown,
): WikiAdmonitionVariant {
  return isWikiAdmonitionVariant(value)
    ? value
    : DEFAULT_WIKI_ADMONITION_VARIANT;
}

/** Regex fragment for fenced markdown tokenizer — hyphenated ids included. */
export const WIKI_ADMONITION_VARIANT_PATTERN = WIKI_ADMONITION_VARIANTS.join('|');
