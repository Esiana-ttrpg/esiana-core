import { Prisma } from '@prisma/client';
import { prisma } from '../../prisma.js';
import { buildCandidateLikePattern } from '../searchCandidateSql.js';
import {
  decodeCursor,
  encodeCursor,
  type FindCandidatesInput,
  type FindCandidatesResult,
  type SearchIndexEngine,
} from './searchIndexEngine.js';

type Tx = Prisma.TransactionClient | typeof prisma;

const ENGINE_ID = 'portable-like' as const;
const CURSOR_VERSION = 1;

interface PortableCursor {
  titleHit: number;
  updatedAtMs: number;
  id: string;
  [key: string]: unknown;
}

/** Concatenated party-tier haystack (already normalized lowercase). */
function partyHaystackSql(): Prisma.Sql {
  return Prisma.sql`(
    d."titleNorm" || ' ' || d."aliasText" || ' ' || d."metadataText" || ' ' ||
    d."customFieldText" || ' ' || d."bodyText"
  )`;
}

function elevatedHaystackSql(): Prisma.Sql {
  return Prisma.sql`(
    d."titleNorm" || ' ' || d."aliasText" || ' ' || d."metadataText" || ' ' ||
    d."customFieldText" || ' ' || d."bodyText" || ' ' || d."elevatedText"
  )`;
}

export const portableLikeEngine: SearchIndexEngine = {
  id: ENGINE_ID,

  async afterUpsert(_tx: Tx, _docId: string): Promise<void> {
    // No inverted index on SQLite in Pass 5.
  },

  async findCandidates(input: FindCandidatesInput): Promise<FindCandidatesResult> {
    if (input.tokens.length === 0) {
      return { candidates: [], nextCursor: null };
    }

    const haystack = input.isElevated ? elevatedHaystackSql() : partyHaystackSql();
    const tokenClauses = input.tokens.map((tok) => {
      const pattern = buildCandidateLikePattern(tok);
      return Prisma.sql`${haystack} LIKE ${pattern} ESCAPE '\\'`;
    });

    const visibilityClause =
      input.visibilityIn == null || input.visibilityIn.length === 0
        ? Prisma.empty
        : Prisma.sql`AND d."visibility" IN (${Prisma.join(input.visibilityIn)})`;

    const typeClause =
      input.typeKeys == null || input.typeKeys.length === 0
        ? Prisma.empty
        : Prisma.sql`AND d."typeKey" IN (${Prisma.join(input.typeKeys)})`;

    const cursor = decodeCursor<PortableCursor>(
      ENGINE_ID,
      CURSOR_VERSION,
      input.cursor,
    );

    const titleTokenClauses = input.tokens.map((tok) => {
      const pattern = buildCandidateLikePattern(tok);
      return Prisma.sql`d."titleNorm" LIKE ${pattern} ESCAPE '\\'`;
    });
    const titleHitExpr = Prisma.sql`(
      CASE WHEN ${Prisma.join(titleTokenClauses, ' AND ')} THEN 1 ELSE 0 END
    )`;

    const cursorClause = cursor
      ? Prisma.sql`AND (
          (${titleHitExpr}) < ${cursor.titleHit}
          OR (
            (${titleHitExpr}) = ${cursor.titleHit}
            AND d."sourceUpdatedAt" < ${new Date(cursor.updatedAtMs)}
          )
          OR (
            (${titleHitExpr}) = ${cursor.titleHit}
            AND d."sourceUpdatedAt" = ${new Date(cursor.updatedAtMs)}
            AND d."id" < ${cursor.id}
          )
        )`
      : Prisma.empty;

    const matchClause = Prisma.join(tokenClauses, ' AND ');

    const rows = await prisma.$queryRaw<
      Array<{
        sourceId: string;
        id: string;
        titleHit: number;
        sourceUpdatedAt: Date;
      }>
    >(Prisma.sql`
      SELECT
        d."sourceId" AS "sourceId",
        d."id" AS id,
        ${titleHitExpr} AS "titleHit",
        d."sourceUpdatedAt" AS "sourceUpdatedAt"
      FROM "SearchIndexDocument" d
      WHERE d."campaignId" = ${input.campaignId}
        AND d."sourceKind" = 'wiki-page'
        ${visibilityClause}
        ${typeClause}
        AND (${matchClause})
        ${cursorClause}
      ORDER BY
        "titleHit" DESC,
        d."sourceUpdatedAt" DESC,
        d."id" DESC
      LIMIT ${input.batchSize}
    `);

    const candidates = rows.map((r) => ({
      sourceId: r.sourceId,
      titleHit: Number(r.titleHit) === 1,
    }));

    let nextCursor: string | null = null;
    if (rows.length === input.batchSize) {
      const last = rows[rows.length - 1]!;
      const updatedAt =
        last.sourceUpdatedAt instanceof Date
          ? last.sourceUpdatedAt
          : new Date(last.sourceUpdatedAt);
      nextCursor = encodeCursor(ENGINE_ID, CURSOR_VERSION, {
        titleHit: Number(last.titleHit),
        updatedAtMs: updatedAt.getTime(),
        id: last.id,
      } satisfies PortableCursor);
    }

    return { candidates, nextCursor };
  },
};
