import type { SimulationClock } from './simulationClock.js';

export type SeedOpKind =
  | 'createPage'
  | 'patchLayout'
  | 'patchMetadata'
  | 'addAlias'
  | 'createCalendarEvent';

export interface TemporalMeta {
  createdAt: string;
  updatedAt?: string;
}

export interface SeedOpBase {
  kind: SeedOpKind;
  actorUserId: string;
  temporal: TemporalMeta;
}

export interface SeedTagInput {
  name: string;
}

export interface CreatePageOp extends SeedOpBase {
  kind: 'createPage';
  clientKey: string;
  parentKey?: string;
  title: string;
  metadata?: Record<string, unknown>;
  blocks?: unknown[];
  templateType?: string;
  tags?: SeedTagInput[];
  visibility?: 'Public' | 'Party' | 'DM_Only';
}

export interface PatchLayoutOp extends SeedOpBase {
  kind: 'patchLayout';
  pageKey: string;
  blocks: unknown[];
}

export interface PatchMetadataOp extends SeedOpBase {
  kind: 'patchMetadata';
  pageKey: string;
  patch: Record<string, unknown>;
}

export interface AddAliasOp extends SeedOpBase {
  kind: 'addAlias';
  pageKey: string;
  alias: string;
}

export interface CreateCalendarEventOp extends SeedOpBase {
  kind: 'createCalendarEvent';
  title: string;
  description?: string | null;
  dayOffset?: number;
}

export type SeedOp =
  | CreatePageOp
  | PatchLayoutOp
  | PatchMetadataOp
  | AddAliasOp
  | CreateCalendarEventOp;

export interface SeedPlan {
  ops: SeedOp[];
  seed: string;
  density: string;
}

export function temporalFromClock(clock: SimulationClock): TemporalMeta {
  const t = clock.now().toISOString();
  return { createdAt: t, updatedAt: t };
}

export function markdownBlock(markdown: string): Record<string, unknown> {
  return {
    id: `block-${Math.random().toString(36).slice(2, 9)}`,
    type: 'text-tiptap',
    x: 0,
    y: 0,
    w: 12,
    h: 10,
    isPrivate: false,
    visibility: 'Party',
    content: { markdown },
  };
}

export function wikiLinkSpan(label: string, targetKey: string, resolved = true): string {
  const id = resolved ? `{{${targetKey}}}` : '';
  const stub = resolved ? '' : ' data-stub="true"';
  return `<span data-type="wikiLink" data-id="${id}" data-label="${label}"${stub}>[[${label}]]</span>`;
}
