import type { Prisma } from '@prisma/client';
import { prisma } from '../../prisma.js';
import { env } from '../../../config/env.js';
import {
  decodeCursor,
  encodeCursor,
  type FindCandidatesInput,
  type FindCandidatesResult,
  type SearchCandidate,
  type SearchIndexEngine,
  type SearchIndexEngineId,
} from './searchIndexEngine.js';
import { portableLikeEngine } from './portableLikeEngine.js';
import { postgresTsvectorEngine } from './postgresTsvectorEngine.js';

export type {
  FindCandidatesInput,
  FindCandidatesResult,
  SearchCandidate,
  SearchIndexEngine,
  SearchIndexEngineId,
};
export { decodeCursor, encodeCursor };

type Tx = Prisma.TransactionClient | typeof prisma;

let engineOverride: SearchIndexEngine | null = null;

export function getSearchIndexEngine(): SearchIndexEngine {
  if (engineOverride) return engineOverride;
  const provider = process.env.DATABASE_PROVIDER ?? env.databaseProvider;
  return provider === 'sqlite' ? portableLikeEngine : postgresTsvectorEngine;
}

/** Test helper — restore with null. */
export function setSearchIndexEngineForTests(engine: SearchIndexEngine | null): void {
  engineOverride = engine;
}

export async function afterUpsertSearchDocument(
  tx: Tx,
  docId: string,
): Promise<void> {
  await getSearchIndexEngine().afterUpsert(tx as never, docId);
}

export async function findSearchIndexCandidates(
  input: FindCandidatesInput,
): Promise<FindCandidatesResult> {
  return getSearchIndexEngine().findCandidates(input);
}
