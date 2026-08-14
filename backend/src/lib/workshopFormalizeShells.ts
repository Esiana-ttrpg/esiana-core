import { randomUUID } from 'node:crypto';
import type { WorkshopFormalizeTarget } from '../../../shared/workshopDocument.js';
import { getWorkshopFormalizeTargetDef } from '../../../shared/workshopFormalize.js';
import {
  buildDefaultBlocks,
  buildQuestDefaultBlocks,
  buildSceneDefaultBlocks,
  buildThreadDefaultBlocks,
} from './pageTemplates.js';
import { emptySceneMetadata } from './sceneMetadata.js';

function block(
  type: string,
  x: number,
  y: number,
  w: number,
  h: number,
  content: Record<string, unknown> = {},
): Record<string, unknown> {
  return {
    id: randomUUID(),
    type,
    title: type,
    x,
    y,
    w,
    h,
    content,
    isPrivate: false,
    visibility: 'Party',
  };
}

const PROSE_BLOCK_TYPES = new Set(['text-tiptap', 'text-biography']);

function injectProseIntoBlocks(
  blocks: Array<Record<string, unknown>>,
  prose: string,
): Array<Record<string, unknown>> {
  return blocks.map((b) => {
    if (!PROSE_BLOCK_TYPES.has(String(b.type))) return b;
    const content =
      b.content && typeof b.content === 'object'
        ? { ...(b.content as Record<string, unknown>) }
        : {};
    return {
      ...b,
      content: { ...content, markdown: prose },
    };
  });
}

function entityCategoryShell(
  entityCategory: string,
  prose: string,
  templateType: string,
  extraMetadata: Record<string, unknown> = {},
): {
  templateType: string;
  blocks: Array<Record<string, unknown>>;
  metadata: Record<string, unknown>;
} {
  const now = new Date().toISOString();
  const seeds = buildDefaultBlocks(templateType, entityCategory);
  return {
    templateType,
    blocks: injectProseIntoBlocks(seeds as Array<Record<string, unknown>>, prose),
    metadata: {
      formalizedFromWorkshopDraft: true,
      formalizedAt: now,
      entityCategory,
      ...extraMetadata,
    },
  };
}

export function buildFormalizeShell(input: {
  target: WorkshopFormalizeTarget;
  bodyMarkdown: string;
  summary?: string | null;
  linkedQuestPageId?: string | null;
}): { templateType: string; blocks: Array<Record<string, unknown>>; metadata: Record<string, unknown> } {
  const now = new Date().toISOString();
  const baseMeta = {
    formalizedFromWorkshopDraft: true,
    formalizedAt: now,
  };
  const summary = input.summary?.trim() || null;
  const prose = input.bodyMarkdown.trim();
  const def = getWorkshopFormalizeTargetDef(input.target);

  switch (input.target) {
    case 'character':
      return {
        templateType: 'DEFAULT',
        blocks: [
          block('entity-hero', 0, 0, 3, 1),
          block('text-biography', 0, 1, 3, 2, { markdown: prose }),
        ],
        metadata: { ...baseMeta, entityCategory: 'characters' },
      };
    case 'quest': {
      const seeds = buildQuestDefaultBlocks({ markdown: prose });
      return {
        templateType: 'DEFAULT',
        blocks: seeds as Array<Record<string, unknown>>,
        metadata: {
          ...baseMeta,
          questStatus: 'planned',
          summary,
        },
      };
    }
    case 'thread': {
      const seeds = buildThreadDefaultBlocks({ markdown: prose });
      return {
        templateType: 'DEFAULT',
        blocks: seeds as Array<Record<string, unknown>>,
        metadata: {
          ...baseMeta,
          threadKind: 'plot',
          threadStatus: 'OPEN',
          narrativeWeight: 'major',
          relatedPageIds: [],
        },
      };
    }
    case 'scene': {
      const linked = input.linkedQuestPageId?.trim();
      const seeds = buildSceneDefaultBlocks({ markdown: prose });
      return {
        templateType: 'SCENE',
        blocks: seeds as Array<Record<string, unknown>>,
        metadata: {
          ...emptySceneMetadata(),
          ...baseMeta,
          summary: summary || prose.slice(0, 500) || null,
          sceneStatus: 'PLANNED',
          ...(linked ? { linkedQuestPageIds: [linked] } : {}),
        },
      };
    }
    case 'lore_note':
      return {
        templateType: 'DEFAULT',
        blocks: [block('text-tiptap', 0, 0, 2, 2, { markdown: prose })],
        metadata: baseMeta,
      };
    default: {
      if (!def.entityCategory) {
        throw new Error('Unsupported formalize target.');
      }
      return entityCategoryShell(def.entityCategory, prose, def.templateType);
    }
  }
}

/** Non-prose blocks + metadata for shadow drafts (fields lane before formalize). */
export function buildFieldShadowShell(input: {
  target: WorkshopFormalizeTarget;
}): { templateType: string; blocks: Array<Record<string, unknown>>; metadata: Record<string, unknown> } {
  const shell = buildFormalizeShell({
    target: input.target,
    bodyMarkdown: '',
  });
  const nonProse = shell.blocks.filter(
    (b) => !PROSE_BLOCK_TYPES.has(String(b.type)),
  );
  return {
    templateType: shell.templateType,
    blocks: nonProse,
    metadata: shell.metadata,
  };
}
