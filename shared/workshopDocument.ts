/**
 * Workshop draft documents — draft state, not draft category.
 * @see docs/plans/authoring-workflow.md
 */

import type { AuthoringContextKind } from './authoringContext.js';

export const WORKSHOP_DRAFTS_ROOT_TITLE = '_Workshop Drafts';

export const WORKSHOP_DRAFT_STATUSES = ['active', 'formalized', 'discarded'] as const;
export type WorkshopDraftStatus = (typeof WORKSHOP_DRAFT_STATUSES)[number];

export const WORKSHOP_FORMALIZE_TARGETS = [
  'character',
  'quest',
  'thread',
  'scene',
  'lore_note',
] as const;
export type WorkshopFormalizeTarget = (typeof WORKSHOP_FORMALIZE_TARGETS)[number];

export interface FormalizeWorkshopDraftInput {
  target: WorkshopFormalizeTarget;
  title: string;
  summary?: string | null;
  /** lore_note only — World child folder page id */
  loreParentId?: string | null;
  /** scene only */
  linkedQuestPageId?: string | null;
}

export interface WorkshopDraftMetadata {
  isDraft: true;
  draftOrigin: 'workshop';
  draftStatus: WorkshopDraftStatus;
  draftOriginSurface: 'progression';
  authorUserId: string;
  anchorEntityIds?: string[];
  sourceKind?: AuthoringContextKind;
  formalizedAt?: string | null;
  formalizedPageId?: string | null;
  hidden: true;
}

export interface WorkshopDocument {
  id: string;
  campaignId: string;
  authorUserId: string;
  title: string;
  bodyMarkdown: string;
  anchorEntityIds?: string[];
  sourceKind?: AuthoringContextKind;
  createdAt: string;
  updatedAt: string;
  lastTouchedAt: string;
  formalizedPageId?: string | null;
  formalizedAt?: string | null;
  draftStatus: WorkshopDraftStatus;
}

export function isWorkshopDraftMetadata(metadata: unknown): metadata is WorkshopDraftMetadata {
  if (!metadata || typeof metadata !== 'object') return false;
  const raw = metadata as Record<string, unknown>;
  return raw.isDraft === true && raw.draftOrigin === 'workshop';
}

export function isWorkshopDraftsRootMetadata(metadata: unknown): boolean {
  if (!metadata || typeof metadata !== 'object') return false;
  const raw = metadata as Record<string, unknown>;
  return raw.workshopDraftsRoot === true;
}

export function buildWorkshopDraftMetadata(input: {
  authorUserId: string;
  anchorEntityIds?: string[];
  sourceKind?: AuthoringContextKind;
}): WorkshopDraftMetadata {
  return {
    isDraft: true,
    draftOrigin: 'workshop',
    draftStatus: 'active',
    draftOriginSurface: 'progression',
    authorUserId: input.authorUserId,
    anchorEntityIds: input.anchorEntityIds?.length ? input.anchorEntityIds : undefined,
    sourceKind: input.sourceKind,
    formalizedAt: null,
    formalizedPageId: null,
    hidden: true,
  };
}

export function buildWorkshopDraftsRootMetadata(): Record<string, unknown> {
  return {
    workshopDraftsRoot: true,
    hidden: true,
  };
}
