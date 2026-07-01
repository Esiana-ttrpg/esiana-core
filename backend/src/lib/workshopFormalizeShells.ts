import { randomUUID } from 'node:crypto';
import type { WorkshopFormalizeTarget } from '../../../shared/workshopDocument.js';
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

function proseTiptap(markdown: string): Array<Record<string, unknown>> {
  return [block('text-tiptap', 0, 0, 2, 2, { markdown })];
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
    case 'quest':
      return {
        templateType: 'DEFAULT',
        blocks: proseTiptap(prose),
        metadata: {
          ...baseMeta,
          questStatus: 'planned',
          summary,
        },
      };
    case 'thread':
      return {
        templateType: 'DEFAULT',
        blocks: proseTiptap(prose),
        metadata: {
          ...baseMeta,
          threadKind: 'plot',
          threadStatus: 'OPEN',
          narrativeWeight: 'major',
          relatedPageIds: [],
        },
      };
    case 'scene': {
      const linked = input.linkedQuestPageId?.trim();
      return {
        templateType: 'SCENE',
        blocks: proseTiptap(prose),
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
        blocks: proseTiptap(prose),
        metadata: baseMeta,
      };
    default:
      throw new Error('Unsupported formalize target.');
  }
}
