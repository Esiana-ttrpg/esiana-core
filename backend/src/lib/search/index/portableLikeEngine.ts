import { Prisma } from '../../prismaClient.js';
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
const CURSOR_VERSION = 4;

/**
 * Opaque cursor for the portable LIKE engine.
 *
 * SQLite DateTime text formats from Prisma are not reliable for keyset
 * comparison (julianday/ISO string mismatches), so this adapter pages with a
 * stable OFFSET encoded in the opaque cursor. Ordering remains
 * titleHit DESC, sourceUpdatedAt DESC, id DESC for each page.
 */
interface PortableCursor {
  offset: number;
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

    const decoded = decodeCursor<PortableCursor>(
      ENGINE_ID,
      CURSOR_VERSION,
      input.cursor,
    );
    const offset =
      decoded && Number.isFinite(decoded.offset) && decoded.offset >= 0
        ? Math.floor(decoded.offset)
        : 0;

    const titleTokenClauses = input.tokens.map((tok) => {
      const pattern = buildCandidateLikePattern(tok);
      return Prisma.sql`d."titleNorm" LIKE ${pattern} ESCAPE '\\'`;
    });
    const titleHitExpr = Prisma.sql`(
      CASE WHEN ${Prisma.join(titleTokenClauses, ' AND ')} THEN 1 ELSE 0 END
    )`;

    const matchClause = Prisma.join(tokenClauses, ' AND ');

    const rows = await prisma.$queryRaw<
      Array<{
        sourceId: string;
        titleHit: number;
      }>
    >(Prisma.sql`
      SELECT
        d."sourceId" AS "sourceId",
        ${titleHitExpr} AS "titleHit"
      FROM "SearchIndexDocument" d
      WHERE d."campaignId" = ${input.campaignId}
        AND d."sourceKind" = 'wiki-page'
        ${visibilityClause}
        ${typeClause}
        AND (${matchClause})
      ORDER BY
        "titleHit" DESC,
        d."sourceUpdatedAt" DESC,
        d."id" DESC
      LIMIT ${input.batchSize}
      OFFSET ${offset}
    `);

    const candidates = rows.map((r) => ({
      sourceId: r.sourceId,
      titleHit: Number(r.titleHit) === 1,
    }));

    let nextCursor: string | null = null;
    if (rows.length === input.batchSize) {
      nextCursor = encodeCursor(ENGINE_ID, CURSOR_VERSION, {
        offset: offset + rows.length,
      } satisfies PortableCursor);
    }

    return { candidates, nextCursor };
  },
};
