import { z } from 'zod';
import { WIKI_GRID_COLS } from './pageTemplates.js';

export const WIKI_BLOCK_TYPES = [
  'text-tiptap',
  'text-biography',
  'image-display',
  'stat-block',
  'wiki-infobox',
  'wiki-backlinks',
  'entity-hero',
  'entity-appearance',
  'entity-relationships',
  'entity-timeline',
  'entity-discovery',
  'entity-org-hero',
  'entity-family-hero',
  'entity-location-hero',
  'entity-document',
  'entity-thread-properties',
  'entity-scene-properties',
] as const;

export type WikiBlockType = (typeof WIKI_BLOCK_TYPES)[number];

const wikiBlockVisibilitySchema = z.enum(['Public', 'Party', 'DM_Only']);

export const wikiBlockSchema = z
  .object({
    id: z.string().min(1),
    type: z.enum(WIKI_BLOCK_TYPES),
    title: z.string().optional(),
    x: z.number().int().min(0).max(WIKI_GRID_COLS - 1),
    y: z.number().int().min(0),
    w: z.number().int().min(1),
    h: z.number().int().min(1),
    content: z.record(z.string(), z.unknown()),
    isPrivate: z.boolean(),
    visibility: wikiBlockVisibilitySchema.optional(),
  })
  .superRefine((block, ctx) => {
    if (block.x + block.w > WIKI_GRID_COLS) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `Block width exceeds ${WIKI_GRID_COLS}-column grid`,
        path: ['w'],
      });
    }
  });

export const wikiTemplateBlocksSchema = z
  .array(wikiBlockSchema)
  .min(1, 'Template must include at least one block')
  .superRefine((blocks, ctx) => {
    const hasBodyBlock = blocks.some(
      (b) => b.type === 'text-tiptap' || b.type === 'text-biography',
    );
    if (!hasBodyBlock) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Template must include at least one narrative body block',
      });
    }
  });

export type ValidatedWikiBlock = z.infer<typeof wikiBlockSchema>;

export function formatWikiBlockValidationError(error: z.ZodError): string {
  const first = error.issues[0];
  if (!first) return 'Invalid template blocks';
  const path = first.path.length > 0 ? `${first.path.join('.')}: ` : '';
  return `${path}${first.message}`;
}
