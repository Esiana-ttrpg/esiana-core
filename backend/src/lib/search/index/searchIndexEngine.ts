import type { Prisma } from '../../prismaClient.js';

export interface SearchCandidate {
  sourceId: string;
  titleHit: boolean;
}

export interface FindCandidatesInput {
  campaignId: string;
  tokens: string[];
  isElevated: boolean;
  visibilityIn: string[] | null;
  typeKeys: string[] | null;
  cursor: string | null;
  batchSize: number;
}

export interface FindCandidatesResult {
  candidates: SearchCandidate[];
  nextCursor: string | null;
}

export type SearchIndexEngineId = 'postgres-tsvector' | 'portable-like';

export interface SearchIndexEngine {
  id: SearchIndexEngineId;
  afterUpsert(tx: unknown, docId: string): Promise<void>;
  findCandidates(input: FindCandidatesInput): Promise<FindCandidatesResult>;
}

/** Opaque cursor payload stamped with engine id + version. */
export interface CursorEnvelope<T extends Record<string, unknown>> {
  e: SearchIndexEngineId;
  v: number;
  p: T;
}

export function encodeCursor(
  engineId: SearchIndexEngineId,
  version: number,
  payload: Record<string, unknown>,
): string {
  const envelope: CursorEnvelope<Record<string, unknown>> = {
    e: engineId,
    v: version,
    p: payload,
  };
  return Buffer.from(JSON.stringify(envelope), 'utf8').toString('base64url');
}

export function decodeCursor<T extends Record<string, unknown>>(
  engineId: SearchIndexEngineId,
  version: number,
  cursor: string | null,
): T | null {
  if (!cursor) return null;
  try {
    const raw = Buffer.from(cursor, 'base64url').toString('utf8');
    const parsed = JSON.parse(raw) as CursorEnvelope<Record<string, unknown>>;
    if (parsed.e !== engineId || parsed.v !== version || !parsed.p) return null;
    return parsed.p as T;
  } catch {
    return null;
  }
}

// Keep Prisma in the import graph for consumers that re-export types.
export type { Prisma };
