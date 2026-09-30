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
/** v2: keyset on (titleHit, sourceUpdatedAt, id) — float ts_rank is not stable for ties. */
const CURSOR_VERSION = 2;

interface PostgresCursor {
  titleHit: number;
  /** Epoch ms of sourceUpdatedAt */
  updatedAtMs: number;
  id: string;
  [key: string]: unknown;
}

/**
 * Escape a normalized token for to_tsquery('simple', …) prefix matching.
 * Preserves Unicode letters/digits; allows apostrophes and hyphens.
 */
export function buildSimplePrefixTsQuery(tokens: string[]): string {
  const parts: string[] = [];
  for (const tok of tokens) {
    if (!tok) continue;
    // Strip tsquery metacharacters; keep letters (any script), digits, ' and -.
    const safe = tok.replace(/[^\p{L}\p{N}'-]/gu, '');
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
    // partyVector = party-visible tiers only.
    // elevatedVector = full document (party + elevated) so elevated viewers can
    // AND across tiers with a single @@ query against elevatedVector alone.
    await tx.$executeRaw(Prisma.sql`
      UPDATE "SearchIndexDocument"
      SET
        "partyVector" = setweight(to_tsvector('simple', coalesce("titleNorm", '')), 'A')
          || setweight(to_tsvector('simple', coalesce("aliasText", '')), 'B')
          || setweight(to_tsvector('simple', coalesce("metadataText", '')), 'C')
          || setweight(to_tsvector('simple', coalesce("customFieldText", '')), 'C')
          || setweight(to_tsvector('simple', coalesce("bodyText", '')), 'D'),
        "elevatedVector" = setweight(to_tsvector('simple', coalesce("titleNorm", '')), 'A')
          || setweight(to_tsvector('simple', coalesce("aliasText", '')), 'B')
          || setweight(to_tsvector('simple', coalesce("metadataText", '')), 'C')
          || setweight(to_tsvector('simple', coalesce("customFieldText", '')), 'C')
          || setweight(to_tsvector('simple', coalesce("bodyText", '')), 'D')
          || setweight(to_tsvector('simple', coalesce("elevatedText", '')), 'D')
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

    // Elevated viewers query elevatedVector alone (populated with the full
    // document). Party viewers query partyVector only.
    const matchClause = input.isElevated
      ? Prisma.sql`d."elevatedVector" @@ to_tsquery('simple', ${tsQuery})`
      : Prisma.sql`d."partyVector" @@ to_tsquery('simple', ${tsQuery})`;

    const titleHitExpr = Prisma.sql`(
      CASE WHEN to_tsvector('simple', coalesce(d."titleNorm", ''))
        @@ to_tsquery('simple', ${tsQuery})
      THEN 1 ELSE 0 END
    )`;

    const cursor = decodeCursor<PostgresCursor>(
      ENGINE_ID,
      CURSOR_VERSION,
      input.cursor,
    );

    // Keyset on titleHit + sourceUpdatedAt + id (same tie-break as portable).
    // Do not keyset on ts_rank: equal ranks + float round-trip make the next
    // page empty when many docs share the same match weight.
    const cursorClause = cursor
      ? Prisma.sql`AND (
          ranked."titleHit" < ${cursor.titleHit}
          OR (
            ranked."titleHit" = ${cursor.titleHit}
            AND ranked."updatedAtMs" < ${cursor.updatedAtMs}
          )
          OR (
            ranked."titleHit" = ${cursor.titleHit}
            AND ranked."updatedAtMs" = ${cursor.updatedAtMs}
            AND ranked."id" < ${cursor.id}
          )
        )`
      : Prisma.empty;

    const rows = await prisma.$queryRaw<
      Array<{
        sourceId: string;
        id: string;
        titleHit: number;
        updatedAtMs: number | bigint | string;
      }>
    >(Prisma.sql`
      SELECT * FROM (
        SELECT
          d."sourceId" AS "sourceId",
          d."id" AS id,
          ${titleHitExpr} AS "titleHit",
          (EXTRACT(EPOCH FROM d."sourceUpdatedAt") * 1000)::bigint AS "updatedAtMs"
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
        ranked."updatedAtMs" DESC,
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
        updatedAtMs: Number(last.updatedAtMs),
        id: last.id,
      } satisfies PostgresCursor);
    }

    return { candidates, nextCursor };
  },
};
