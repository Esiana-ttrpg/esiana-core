import type { Prisma } from '@prisma/client';
import { z } from 'zod';
import type { WikiBlockSeed } from './pageTemplates.js';
import {
  formatWikiBlockValidationError,
  wikiTemplateBlocksSchema,
} from './wikiBlockSchema.js';

export type TemplateRow = {
  id: string;
  folder: string;
  name: string;
  blocks: unknown;
  isSystemDefault: boolean;
  createdAt: Date;
  updatedAt: Date;
};

export function serializeTemplate(t: TemplateRow) {
  return {
    id: t.id,
    folder: t.folder,
    name: t.name,
    blocks: t.blocks,
    isSystemDefault: Boolean(t.isSystemDefault),
    createdAt: t.createdAt.toISOString(),
    updatedAt: t.updatedAt.toISOString(),
  };
}

export function deepCloneBlocks(blocks: unknown): Prisma.InputJsonValue {
  return JSON.parse(JSON.stringify(blocks)) as Prisma.InputJsonValue;
}

export function blocksToJson(
  blocks: WikiBlockSeed[],
): Prisma.InputJsonValue {
  return deepCloneBlocks(blocks);
}

export type ParseTemplateBlocksResult =
  | { ok: true; blocks: WikiBlockSeed[] }
  | { ok: false; error: string };

export function parseAndValidateTemplateBlocks(
  raw: unknown,
): ParseTemplateBlocksResult {
  const parsed = wikiTemplateBlocksSchema.safeParse(raw);
  if (!parsed.success) {
    return {
      ok: false,
      error: formatWikiBlockValidationError(parsed.error),
    };
  }
  return {
    ok: true,
    blocks: parsed.data as WikiBlockSeed[],
  };
}

export function validateTemplateBlocksOrThrow(raw: unknown): WikiBlockSeed[] {
  const result = parseAndValidateTemplateBlocks(raw);
  if (!result.ok) {
    throw new TemplateBlocksValidationError(result.error);
  }
  return result.blocks;
}

export class TemplateBlocksValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'TemplateBlocksValidationError';
  }
}

export function isTemplateBlocksValidationError(
  err: unknown,
): err is TemplateBlocksValidationError {
  return err instanceof TemplateBlocksValidationError;
}
