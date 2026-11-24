import { extractProseFromBlocks } from './proseExtract.js';

export type WritingSaveBoundary =
  | 'explicit_save'
  | 'apply'
  | 'formalize'
  | 'publication';

export type WritingSourceDefinition = {
  id: string;
  storageLocation: string;
  saveBoundary: WritingSaveBoundary;
  visibilityContext: string;
  /** When false, this source is registered but not yet extracted. */
  implemented: boolean;
  extractProse: (payload: unknown) => string;
};

function wikiBlocksExtractor(payload: unknown): string {
  return extractProseFromBlocks(payload);
}

function unimplementedExtractor(): string {
  return '';
}

/**
 * Platform writing contract. Wiki blocks ship first; independently stored
 * rich-text registers here later instead of becoming hardcoded queries.
 * Custom workspace pages (`CampaignWorkspace.CUSTOM`) use `wiki.page` —
 * they are not a separate table or hardcoded stats query.
 */
export const WRITING_SOURCES: Record<string, WritingSourceDefinition> = {
  'wiki.page': {
    id: 'wiki.page',
    storageLocation: 'WikiPage.blocks',
    saveBoundary: 'explicit_save',
    visibilityContext: 'campaign_wiki',
    implemented: true,
    extractProse: wikiBlocksExtractor,
  },
  'workshop.apply': {
    id: 'workshop.apply',
    storageLocation: 'WikiPage.blocks (published anchor)',
    saveBoundary: 'apply',
    visibilityContext: 'campaign_wiki',
    implemented: true,
    extractProse: wikiBlocksExtractor,
  },
  'workshop.formalize': {
    id: 'workshop.formalize',
    storageLocation: 'WikiPage.blocks (formalized page)',
    saveBoundary: 'formalize',
    visibilityContext: 'campaign_wiki',
    implemented: true,
    extractProse: wikiBlocksExtractor,
  },
  session_note: {
    id: 'session_note',
    storageLocation: 'WikiPage.blocks (SESSION_NOTE)',
    saveBoundary: 'explicit_save',
    visibilityContext: 'campaign_wiki',
    implemented: true,
    extractProse: wikiBlocksExtractor,
  },
  'journal.wiki_page': {
    id: 'journal.wiki_page',
    storageLocation: 'WikiPage.blocks (journal workspace)',
    saveBoundary: 'explicit_save',
    visibilityContext: 'campaign_wiki',
    implemented: true,
    extractProse: wikiBlocksExtractor,
  },
  'journal.publication': {
    id: 'journal.publication',
    storageLocation: 'JournalPublication.contentMarkdown',
    saveBoundary: 'publication',
    visibilityContext: 'journal_publication',
    implemented: false,
    extractProse: unimplementedExtractor,
  },
  'character.tab': {
    id: 'character.tab',
    storageLocation: 'CharacterPageTab.blocks',
    saveBoundary: 'explicit_save',
    visibilityContext: 'character_tab',
    implemented: false,
    extractProse: unimplementedExtractor,
  },
};

export function getWritingSource(id: string): WritingSourceDefinition {
  return WRITING_SOURCES[id] ?? WRITING_SOURCES['wiki.page'];
}

export function listWritingSources(): WritingSourceDefinition[] {
  return Object.values(WRITING_SOURCES);
}

export function extractProseForSource(sourceId: string, payload: unknown): string {
  return getWritingSource(sourceId).extractProse(payload);
}
