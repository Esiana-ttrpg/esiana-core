/**
 * Layer 5 — narrative scaffolds (genre starters for Authoring Workshop).
 * Distinct from wiki page block layouts — these seed Workshop drafts only.
 */
import type { StoryboardPreset } from './storyboardProjection.js';

export type NarrativeScaffoldId =
  | 'mystery-investigation'
  | 'three-act-campaign'
  | 'session-five-beat';

export interface NarrativeScaffoldPageSeed {
  /** Suggested wiki title (user may edit before create). */
  title: string;
  /** Metadata fields merged into new page. */
  metadata: Record<string, unknown>;
  /** Optional markdown body for default text-tiptap block. */
  bodyMarkdown?: string;
  /** Parent hint: quests root, scenes root, threads root. */
  parentHint: 'quests' | 'scenes' | 'threads';
}

export interface NarrativeScaffoldDefinition {
  id: NarrativeScaffoldId;
  label: string;
  description: string;
  storyboardPresetId: StoryboardPreset['id'];
  overlayIds: Array<'mystery-structure' | 'open-threads' | 'arc-progress' | 'three-act-pacing'>;
  pages: NarrativeScaffoldPageSeed[];
}

export const NARRATIVE_SCAFFOLDS: NarrativeScaffoldDefinition[] = [
  {
    id: 'mystery-investigation',
    label: 'Mystery investigation',
    description:
      'Discovery, analysis, and confrontation lanes with clue threads and a central mystery arc.',
    storyboardPresetId: 'mystery-investigation',
    overlayIds: ['mystery-structure', 'open-threads'],
    pages: [
      {
        title: 'Mystery arc',
        parentHint: 'quests',
        metadata: {
          arcMetadataVersion: 'arc-metadata-v1',
          arcKind: 'campaign_arc',
          containedPageIds: [],
          actIndex: null,
          pacingTarget: 'mystery',
        },
        bodyMarkdown: '## Premise\n\nDescribe the central mystery.\n',
      },
      {
        title: 'Discovery clues',
        parentHint: 'threads',
        metadata: {
          threadKind: 'clue',
          threadStatus: 'OPEN',
          narrativeWeight: 'major',
        },
        bodyMarkdown: 'Initial discoveries players can encounter.\n',
      },
      {
        title: 'Opening scene',
        parentHint: 'scenes',
        metadata: {
          sceneStatus: 'PLANNED',
          beatType: 'hook',
          narrativeWeight: 'major',
        },
        bodyMarkdown: 'How the mystery surfaces to the party.\n',
      },
    ],
  },
  {
    id: 'three-act-campaign',
    label: 'Three-act campaign',
    description: 'Setup, confrontation, and resolution arc scaffold.',
    storyboardPresetId: 'three-act-campaign',
    overlayIds: ['three-act-pacing', 'arc-progress'],
    pages: [
      {
        title: 'Campaign arc',
        parentHint: 'quests',
        metadata: {
          arcMetadataVersion: 'arc-metadata-v1',
          arcKind: 'campaign_arc',
          containedPageIds: [],
          actIndex: 0,
          pacingTarget: 'three-act',
        },
        bodyMarkdown: '## Act I — Setup\n\n',
      },
    ],
  },
  {
    id: 'session-five-beat',
    label: 'Five-beat session',
    description: 'Hook through button for a single session prep workspace.',
    storyboardPresetId: 'session-five-beat',
    overlayIds: ['arc-progress'],
    pages: [
      {
        title: 'Session prep',
        parentHint: 'scenes',
        metadata: {
          sceneStatus: 'PLANNED',
          beatType: 'hook',
          narrativeWeight: 'standard',
        },
        bodyMarkdown: '## Hook\n\n',
      },
    ],
  },
];

export function getNarrativeScaffold(id: NarrativeScaffoldId): NarrativeScaffoldDefinition | undefined {
  return NARRATIVE_SCAFFOLDS.find((s) => s.id === id);
}
