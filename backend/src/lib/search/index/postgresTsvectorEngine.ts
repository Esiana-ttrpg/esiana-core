import { Prisma } from '@prisma/client';
import { prisma } from '../../prisma.js';
import {
  decodeCursor,
  encodeCursor,
  type FindCandidatesInput,
  type FindCandidatesResult,
  type SearchIndexEngine,
} from './searchIndexEngine.js';

type Tx = Prisma.TransactionClient | typeof prisma;

const ENGINE_ID = 'postgres-tsvector' as const;
const CURSOR_VERSION = 1;

interface PostgresCursor {
  titleHit: number;
  rank: number;
  id: string;
  [key: string]: unknown;
}

/**
 * Escape a normalized token for to_tsquery('simple', …) prefix matching.
 * Tokens are already normalized (letters/digits/hyphen/apostrophe only).
 */
export function buildSimplePrefixTsQuery(tokens: string[]): string {
  const parts: string[] = [];
  for (const tok of tokens) {
    if (!tok) continue;
    // Strip anything that could break tsquery syntax; keep alphanumerics.
    const safe = tok.replace(/[^a-z0-9'-]/gi, '');
    if (!safe) continue;
    // Quote to handle hyphens/apostrophes safely, then append prefix operator.
    const quoted = `'${safe.replace(/'/g, "''")}'`;
    parts.push(`${quoted}:*`);
  }
  return parts.join(' & ');
}

export const postgresTsvectorEngine: SearchIndexEngine = {
  id: ENGINE_ID,

  async afterUpsert(tx: Tx, docId: string): Promise<void> {
    await tx.$executeRaw(Prisma.sql`
      UPDATE "SearchIndexDocument"
      SET
        "partyVector" = setweight(to_tsvector('simple', coalesce("titleNorm", '')), 'A')
          || setweight(to_tsvector('simple', coalesce("aliasText", '')), 'B')
          || setweight(to_tsvector('simple', coalesce("metadataText", '')), 'C')
          || setweight(to_tsvector('simple', coalesce("customFieldText", '')), 'C')
          || setweight(to_tsvector('simple', coalesce("bodyText", '')), 'D'),
        "elevatedVector" = setweight(to_tsvector('simple', coalesce("elevatedText", '')), 'D')
      WHERE "id" = ${docId}
    `);
  },

  async findCandidates(input: FindCandidatesInput): Promise<FindCandidatesResult> {
    if (input.tokens.length === 0) {
      return { candidates: [], nextCursor: null };
    }

    const tsQuery = buildSimplePrefixTsQuery(input.tokens);
    if (!tsQuery) {
      return { candidates: [], nextCursor: null };
    }

    const visibilityClause =
      input.visibilityIn == null || input.visibilityIn.length === 0
        ? Prisma.empty
        : Prisma.sql`AND d."visibility" IN (${Prisma.join(input.visibilityIn)})`;

    const typeClause =
      input.typeKeys == null || input.typeKeys.length === 0
        ? Prisma.empty
        : Prisma.sql`AND d."typeKey" IN (${Prisma.join(input.typeKeys)})`;

    // Elevated viewers search the concatenated party+elevated vector so
    // multi-token queries can span tiers (AND across the combined document).
    const matchClause = input.isElevated
      ? Prisma.sql`(
          coalesce(d."partyVector", ''::tsvector)
          || coalesce(d."elevatedVector", ''::tsvector)
        ) @@ to_tsquery('simple', ${tsQuery})`
      : Prisma.sql`d."partyVector" @@ to_tsquery('simple', ${tsQuery})`;

    const titleHitExpr = Prisma.sql`(
      CASE WHEN to_tsvector('simple', coalesce(d."titleNorm", ''))
        @@ to_tsquery('simple', ${tsQuery})
      THEN 1 ELSE 0 END
    )`;

    const rankExpr = input.isElevated
      ? Prisma.sql`ts_rank_cd(
          coalesce(d."partyVector", ''::tsvector) || coalesce(d."elevatedVector", ''::tsvector),
          to_tsquery('simple', ${tsQuery})
        )`
      : Prisma.sql`ts_rank_cd(
          coalesce(d."partyVector", ''::tsvector),
          to_tsquery('simple', ${tsQuery})
        )`;

    const cursor = decodeCursor<PostgresCursor>(
      ENGINE_ID,
      CURSOR_VERSION,
      input.cursor,
    );

    // Materialize rank in a subquery so keyset compares the sorted value.
    const cursorClause = cursor
      ? Prisma.sql`AND (
          ranked."titleHit" < ${cursor.titleHit}
          OR (
            ranked."titleHit" = ${cursor.titleHit}
            AND ranked."rank" < ${cursor.rank}
          )
          OR (
            ranked."titleHit" = ${cursor.titleHit}
            AND ranked."rank" = ${cursor.rank}
            AND ranked."id" < ${cursor.id}
          )
        )`
      : Prisma.empty;

    const rows = await prisma.$queryRaw<
      Array<{
        sourceId: string;
        id: string;
        titleHit: number;
        rank: number;
      }>
    >(Prisma.sql`
      SELECT * FROM (
        SELECT
          d."sourceId" AS "sourceId",
          d."id" AS id,
          ${titleHitExpr} AS "titleHit",
          ${rankExpr} AS "rank"
        FROM "SearchIndexDocument" d
        WHERE d."campaignId" = ${input.campaignId}
          AND d."sourceKind" = 'wiki-page'
          ${visibilityClause}
          ${typeClause}
          AND ${matchClause}
      ) ranked
      WHERE TRUE
        ${cursorClause}
      ORDER BY
        ranked."titleHit" DESC,
        ranked."rank" DESC,
        ranked."id" DESC
      LIMIT ${input.batchSize}
    `);

    const candidates = rows.map((r) => ({
      sourceId: r.sourceId,
      titleHit: Number(r.titleHit) === 1,
    }));

    let nextCursor: string | null = null;
    if (rows.length === input.batchSize) {
      const last = rows[rows.length - 1]!;
      nextCursor = encodeCursor(ENGINE_ID, CURSOR_VERSION, {
        titleHit: Number(last.titleHit),
        rank: Number(last.rank),
        id: last.id,
      } satisfies PostgresCursor);
    }

    return { candidates, nextCursor };
  },
};
