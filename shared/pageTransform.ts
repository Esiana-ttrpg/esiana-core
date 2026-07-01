import type { PageSurfaceKey } from './pageModuleScope.js';

function newBlockId(): string {
  return globalThis.crypto.randomUUID();
}

export type TransformTargetModule =
  | 'characters'
  | 'bestiary'
  | 'quests'
  | 'threads';

export type TransformTarget = {
  moduleKey: TransformTargetModule;
  label: string;
  surfaceKey: PageSurfaceKey;
};

export type WikiBlockLike = {
  id: string;
  type: string;
  title?: string;
  x: number;
  y: number;
  w: number;
  h: number;
  content?: Record<string, unknown>;
  isPrivate?: boolean;
  visibility?: string;
};

const TRANSFORM_MATRIX: Partial<Record<PageSurfaceKey, TransformTargetModule[]>> = {
  character: ['bestiary'],
  bestiary: ['characters'],
  thread: ['quests'],
  quest: ['threads'],
  'event-lore': ['quests'],
};

const TARGET_LABELS: Record<TransformTargetModule, string> = {
  characters: 'Character',
  bestiary: 'Bestiary creature',
  quests: 'Quest',
  threads: 'Narrative thread',
};

const TARGET_SURFACE: Record<TransformTargetModule, PageSurfaceKey> = {
  characters: 'character',
  bestiary: 'bestiary',
  quests: 'quest',
  threads: 'thread',
};

export function getTransformOptions(surfaceKey: PageSurfaceKey): TransformTarget[] {
  const targets = TRANSFORM_MATRIX[surfaceKey] ?? [];
  return targets.map((moduleKey) => ({
    moduleKey,
    label: TARGET_LABELS[moduleKey],
    surfaceKey: TARGET_SURFACE[moduleKey],
  }));
}

export function isAllowedTransform(
  sourceSurfaceKey: PageSurfaceKey,
  targetModuleKey: string,
): boolean {
  return (TRANSFORM_MATRIX[sourceSurfaceKey] ?? []).includes(
    targetModuleKey as TransformTargetModule,
  );
}

function createBlock(
  type: string,
  x: number,
  y: number,
  w: number,
  h: number,
  content: Record<string, unknown> = {},
): WikiBlockLike {
  return {
    id: newBlockId(),
    type,
    x,
    y,
    w,
    h,
    content,
    isPrivate: false,
    visibility: 'Party',
  };
}

function extractMarkdown(blocks: WikiBlockLike[], types: string[]): string {
  for (const block of blocks) {
    if (!types.includes(block.type)) continue;
    const markdown = block.content?.markdown;
    if (typeof markdown === 'string' && markdown.trim()) return markdown;
  }
  return '';
}

function copyInfoboxFields(blocks: WikiBlockLike[]): Record<string, unknown>[] {
  const infobox = blocks.find((block) => block.type === 'wiki-infobox');
  const fields = infobox?.content?.fields;
  return Array.isArray(fields) ? [...fields] : [];
}

function buildCharacterBlocks(
  blocks: WikiBlockLike[],
  biographyMarkdown: string,
): WikiBlockLike[] {
  const hero = blocks.find((block) => block.type === 'entity-bestiary-hero');
  const heroContent = hero?.content ?? {};
  const fields = copyInfoboxFields(blocks);

  return [
    createBlock('entity-hero', 0, 0, 3, 1, { ...heroContent }),
    createBlock('text-biography', 0, 1, 2, 2, { markdown: biographyMarkdown }),
    createBlock('wiki-infobox', 2, 1, 1, 2, { fields }),
    createBlock('entity-appearance', 0, 3, 3, 1),
    createBlock('wiki-backlinks', 0, 4, 3, 1),
  ];
}

function buildBestiaryBlocks(
  blocks: WikiBlockLike[],
  loreMarkdown: string,
): WikiBlockLike[] {
  const hero = blocks.find((block) => block.type === 'entity-hero');
  const heroContent = hero?.content ?? {};
  const fields = copyInfoboxFields(blocks);

  return [
    createBlock('entity-bestiary-hero', 0, 0, 3, 1, { ...heroContent }),
    createBlock('text-tiptap', 0, 1, 2, 2, { markdown: loreMarkdown }),
    createBlock('wiki-infobox', 2, 1, 1, 2, { fields }),
    createBlock('entity-appearance', 0, 3, 3, 1),
    createBlock('wiki-backlinks', 0, 4, 3, 1),
  ];
}

function buildQuestBlocks(loreMarkdown: string): WikiBlockLike[] {
  return [
    createBlock('entity-quest-properties', 0, 0, 3, 1),
    createBlock('text-tiptap', 0, 1, 2, 2, { markdown: loreMarkdown }),
    createBlock('wiki-infobox', 2, 1, 1, 2, { fields: [] }),
  ];
}

function buildThreadBlocks(loreMarkdown: string): WikiBlockLike[] {
  return [
    createBlock('entity-thread-properties', 0, 0, 3, 1),
    createBlock('text-tiptap', 0, 1, 2, 2, { markdown: loreMarkdown }),
    createBlock('wiki-infobox', 2, 1, 1, 2, { fields: [] }),
  ];
}

function stripThreadMetadata(metadata: Record<string, unknown>): Record<string, unknown> {
  const next = { ...metadata };
  for (const key of [
    'threadMetadataVersion',
    'threadKind',
    'threadStatus',
    'narrativeWeight',
    'relatedPageIds',
    'introducedSessionId',
    'lastAdvancedSessionId',
    'resolvedSessionId',
    'payoffPageId',
    'playerSubmitted',
    'sortOrder',
    'emotionalResidueKind',
  ]) {
    delete next[key];
  }
  return next;
}

function stripQuestMetadata(metadata: Record<string, unknown>): Record<string, unknown> {
  const next = { ...metadata };
  for (const key of [
    'questStatus',
    'boardOrder',
    'questType',
    'questDate',
    'questGiverId',
    'factionId',
    'rewardsText',
    'dmRewardsText',
    'ledgerReward',
  ]) {
    delete next[key];
  }
  return next;
}

export type TransformedPagePayload = {
  blocks: WikiBlockLike[];
  metadata: Record<string, unknown>;
  templateType: string;
  targetModuleKey: TransformTargetModule;
};

export function buildTransformedPagePayload(input: {
  sourceSurfaceKey: PageSurfaceKey;
  targetModuleKey: TransformTargetModule;
  blocks: WikiBlockLike[];
  metadata: unknown;
}): TransformedPagePayload {
  const baseMetadata =
    input.metadata && typeof input.metadata === 'object'
      ? { ...(input.metadata as Record<string, unknown>) }
      : {};

  const prose = extractMarkdown(input.blocks, [
    'text-tiptap',
    'text-biography',
  ]);

  if (input.targetModuleKey === 'characters') {
    return {
      blocks: buildCharacterBlocks(input.blocks, prose),
      metadata: {
        ...stripQuestMetadata(stripThreadMetadata(baseMetadata)),
        entityCategory: 'characters',
      },
      templateType: 'DEFAULT',
      targetModuleKey: 'characters',
    };
  }

  if (input.targetModuleKey === 'bestiary') {
    return {
      blocks: buildBestiaryBlocks(input.blocks, prose),
      metadata: {
        ...stripQuestMetadata(stripThreadMetadata(baseMetadata)),
        entityCategory: 'bestiary',
      },
      templateType: 'DEFAULT',
      targetModuleKey: 'bestiary',
    };
  }

  if (input.targetModuleKey === 'quests') {
    return {
      blocks: buildQuestBlocks(prose),
      metadata: {
        ...stripThreadMetadata(baseMetadata),
        entityCategory: 'quests',
        questStatus: 'AVAILABLE',
      },
      templateType: 'QUEST',
      targetModuleKey: 'quests',
    };
  }

  return {
    blocks: buildThreadBlocks(prose),
    metadata: {
      ...stripQuestMetadata(baseMetadata),
      entityCategory: 'threads',
      threadMetadataVersion: 'thread-metadata-v1',
      threadKind: 'mystery',
      threadStatus: 'OPEN',
      narrativeWeight: 'major',
      relatedPageIds: [],
      introducedSessionId: null,
      lastAdvancedSessionId: null,
      resolvedSessionId: null,
      payoffPageId: null,
      playerSubmitted: false,
      sortOrder: null,
      emotionalResidueKind: null,
    },
    templateType: 'DEFAULT',
    targetModuleKey: 'threads',
  };
}

export function buildEventLorePromoteStubMarkdown(
  questPageId: string,
  questTitle: string,
): string {
  return `Promoted to quest: [[${questTitle}|${questPageId}]]`;
}

export function buildEventLoreQuestBlocks(
  title: string,
  loreMarkdown: string,
): WikiBlockLike[] {
  return buildQuestBlocks(loreMarkdown || `# ${title}\n`);
}
