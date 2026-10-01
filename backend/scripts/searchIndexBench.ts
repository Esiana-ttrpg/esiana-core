/**
 * Benchmark indexed search recall and latency.
 *
 * Usage (from backend/):
 *   pnpm bench:search
 *   pnpm exec tsx scripts/searchIndexBench.ts --pages 5000
 *
 * Requires a migrated database (DATABASE_URL). Creates a temporary campaign,
 * indexes it, runs queries, then deletes the campaign.
 */
import { randomUUID } from 'node:crypto';
import { prisma } from '../src/lib/prisma.js';
import { WikiVisibility, CampaignMemberRoles } from '../src/types/domain.js';
import { rebuildSearchIndexForCampaign } from '../src/lib/search/index/searchIndexService.js';
import { findSearchIndexCandidates } from '../src/lib/search/index/getSearchIndexEngine.js';
import { normalizeSearchTokens } from '../src/lib/search/index/normalizeSearchText.js';
import {
  buildSearchQueryParts,
  emptyStructuredFilters,
} from '../src/lib/search/searchContext.js';
import { searchCampaign } from '../src/lib/search/searchService.js';
import {
  clearSearchProviders,
  setSearchProvidersForTests,
} from '../src/lib/search/searchProviderRegistry.js';
import { resetSearchProviderBootstrapForTests } from '../src/lib/search/searchService.js';
import { wikiPageSearchProvider } from '../src/lib/search/wikiPageSearchProvider.js';
import { buildCampaignActor } from '../../shared/campaignPolicy/policy.js';
import { clearSearchIndexEnsureMemoForTests } from '../src/lib/search/index/searchIndexService.js';

function parsePages(argv: string[]): number {
  const idx = argv.indexOf('--pages');
  if (idx >= 0 && argv[idx + 1]) return Number(argv[idx + 1]) || 5000;
  return 5000;
}

function percentile(sorted: number[], p: number): number {
  if (sorted.length === 0) return 0;
  const i = Math.min(sorted.length - 1, Math.floor((p / 100) * sorted.length));
  return sorted[i]!;
}

async function timeMs(fn: () => Promise<unknown>): Promise<number> {
  const start = performance.now();
  await fn();
  return performance.now() - start;
}

async function main(): Promise<void> {
  const pageCount = parsePages(process.argv.slice(2));
  const stamp = randomUUID().slice(0, 8);
  const campaignId = `bench-search-${stamp}`;
  const handle = `bench-s-${stamp}`;
  const gmId = `bench-gm-${stamp}`;
  const titleToken = `benchtitle${stamp}`;
  const bodyToken = `benchbody${stamp}`;
  const rareA = `bencha${stamp}`;
  const rareB = `benchb${stamp}`;

  console.log(`Seeding ${pageCount} pages into campaign ${handle}…`);

  await prisma.user.create({
    data: { id: gmId, email: `${gmId}@example.test`, displayName: 'Bench GM' },
  });
  await prisma.campaign.create({
    data: {
      id: campaignId,
      name: `Search Bench ${stamp}`,
      handle,
      campaignOwnerUserId: gmId,
      members: {
        create: [{ userId: gmId, role: CampaignMemberRoles.GAMEMASTER }],
      },
    },
  });

  const BATCH = 200;
  const needleTitleId = `${campaignId}-title-needle`;
  const needleBodyId = `${campaignId}-body-needle`;
  const needlePairId = `${campaignId}-pair-needle`;

  for (let offset = 0; offset < pageCount; offset += BATCH) {
    const n = Math.min(BATCH, pageCount - offset);
    const data = Array.from({ length: n }, (_, i) => {
      const idx = offset + i;
      const id = `${campaignId}-p-${idx}`;
      let title = `Bench Page ${idx}`;
      let markdown = `Generic lore fragment ${idx}.`;
      if (idx === 0) {
        return {
          id: needleTitleId,
          campaignId,
          title: `Needle ${titleToken}`,
          visibility: WikiVisibility.PARTY,
          templateType: 'DEFAULT',
          metadata: { entityCategory: 'locations' },
          blocks: [
            {
              id: 't',
              type: 'text-tiptap',
              visibility: 'Party',
              content: { markdown: 'Title needle page.' },
            },
          ],
        };
      }
      if (idx === 1) {
        return {
          id: needleBodyId,
          campaignId,
          title: `Body Needle ${idx}`,
          visibility: WikiVisibility.PARTY,
          templateType: 'DEFAULT',
          metadata: { entityCategory: 'locations' },
          blocks: [
            {
              id: 't',
              type: 'text-tiptap',
              visibility: 'Party',
              content: { markdown: `Deep body ${bodyToken} content.` },
            },
          ],
        };
      }
      if (idx === 2) {
        return {
          id: needlePairId,
          campaignId,
          title: `Pair Needle ${idx}`,
          visibility: WikiVisibility.PARTY,
          templateType: 'DEFAULT',
          metadata: { entityCategory: 'locations' },
          blocks: [
            {
              id: 't',
              type: 'text-tiptap',
              visibility: 'Party',
              content: { markdown: `Has ${rareA} and ${rareB}.` },
            },
          ],
        };
      }
      if (idx % 17 === 0) markdown = `${markdown} Also ${bodyToken}.`;
      if (idx % 23 === 0) markdown = `${markdown} Token ${rareA}.`;
      if (idx % 29 === 0) markdown = `${markdown} Token ${rareB}.`;
      return {
        id,
        campaignId,
        title,
        visibility: WikiVisibility.PARTY,
        templateType: 'DEFAULT',
        metadata: { entityCategory: 'locations' },
        blocks: [
          {
            id: 't',
            type: 'text-tiptap',
            visibility: 'Party',
            content: { markdown },
          },
        ],
      };
    });
    await prisma.wikiPage.createMany({ data: data as never });
  }

  console.log('Rebuilding search index…');
  const indexStart = performance.now();
  const indexed = await rebuildSearchIndexForCampaign(campaignId);
  console.log(
    `Indexed ${indexed} docs in ${(performance.now() - indexStart).toFixed(0)}ms`,
  );

  clearSearchProviders();
  setSearchProvidersForTests([wikiPageSearchProvider]);
  resetSearchProviderBootstrapForTests();
  clearSearchIndexEnsureMemoForTests();

  const actor = buildCampaignActor({
    kind: 'member',
    userId: gmId,
    membershipRole: CampaignMemberRoles.GAMEMASTER,
    campaignOwnerUserId: gmId,
    discoverability: 'private',
    allowPlayerChronologyManagement: false,
  });

  async function runQuery(q: string) {
    return searchCampaign({
      campaignId,
      campaignHandle: handle,
      role: CampaignMemberRoles.GAMEMASTER,
      actor,
      isElevated: true,
      query: buildSearchQueryParts(q),
      limit: 20,
      types: null,
      filters: emptyStructuredFilters(),
    });
  }

  const cases: Array<{ name: string; query: string; expectId: string }> = [
    { name: 'title', query: titleToken, expectId: needleTitleId },
    { name: 'body', query: bodyToken, expectId: needleBodyId },
    { name: 'two-token', query: `${rareA} ${rareB}`, expectId: needlePairId },
  ];

  for (const c of cases) {
    const samples: number[] = [];
    let lastIds: string[] = [];
    for (let i = 0; i < 7; i += 1) {
      samples.push(await timeMs(async () => {
        const res = await runQuery(c.query);
        lastIds = res.results.map((r) => r.entityId);
      }));
    }
    samples.sort((a, b) => a - b);
    const warmed = samples.slice(2); // drop coldest
    warmed.sort((a, b) => a - b);

    const tokens = normalizeSearchTokens(c.query.split(/\s+/));
    let scanned = 0;
    let cursor: string | null = null;
    const candidateIds: string[] = [];
    for (;;) {
      const page = await findSearchIndexCandidates({
        campaignId,
        tokens,
        isElevated: true,
        visibilityIn: null,
        typeKeys: null,
        cursor,
        batchSize: 100,
      });
      scanned += page.candidates.length;
      for (const cand of page.candidates) candidateIds.push(cand.sourceId);
      cursor = page.nextCursor;
      if (!cursor) break;
    }

    // Brute-force recall: scan all docs for token presence in concatenated text.
    const docs = await prisma.searchIndexDocument.findMany({
      where: { campaignId },
      select: {
        sourceId: true,
        titleNorm: true,
        aliasText: true,
        metadataText: true,
        customFieldText: true,
        bodyText: true,
        elevatedText: true,
      },
    });
    const brute = docs
      .filter((d) => {
        const hay = [
          d.titleNorm,
          d.aliasText,
          d.metadataText,
          d.customFieldText,
          d.bodyText,
          d.elevatedText,
        ]
          .join(' ')
          .toLowerCase();
        return tokens.every((tok) => hay.includes(tok));
      })
      .map((d) => d.sourceId)
      .sort();
    const retrieved = [...candidateIds].sort();
    const missing = brute.filter((id) => !retrieved.includes(id));

    console.log(
      JSON.stringify({
        case: c.name,
        query: c.query,
        p50Ms: Number(percentile(warmed, 50).toFixed(2)),
        p95Ms: Number(percentile(warmed, 95).toFixed(2)),
        candidatesScanned: scanned,
        resultIncludesNeedle: lastIds.includes(c.expectId),
        bruteForceMatches: brute.length,
        recallMissing: missing.length,
      }),
    );
  }

  // Fuzzy name phase: introduce a one-edit typo of the title needle.
  {
    const typo =
      titleToken.length >= 4
        ? `${titleToken.slice(0, 2)}${titleToken[3]}${titleToken[2]}${titleToken.slice(4)}`
        : `${titleToken}x`;
    const samples: number[] = [];
    let lastIds: string[] = [];
    let lastDiagnostics: Record<string, unknown> | undefined;
    for (let i = 0; i < 7; i += 1) {
      samples.push(
        await timeMs(async () => {
          const res = await searchCampaign({
            campaignId,
            campaignHandle: handle,
            role: CampaignMemberRoles.GAMEMASTER,
            actor,
            isElevated: true,
            query: buildSearchQueryParts(typo),
            limit: 20,
            types: null,
            filters: emptyStructuredFilters(),
            explain: true,
          });
          lastIds = res.results.map((r) => r.entityId);
          lastDiagnostics = res.diagnostics;
        }),
      );
    }
    samples.sort((a, b) => a - b);
    const warmed = samples.slice(2);
    warmed.sort((a, b) => a - b);

    // Brute-force fuzzy recall against titleNorm/aliasText via collectFuzzyCandidates.
    const { collectFuzzyCandidates } = await import(
      '../src/lib/search/fuzzyNameMatch.js'
    );
    const { normalizeSearchTokens: normTok } = await import(
      '../src/lib/search/index/normalizeSearchText.js'
    );
    const nameDocs = await prisma.searchIndexDocument.findMany({
      where: { campaignId },
      select: { sourceId: true, titleNorm: true, aliasText: true },
    });
    const bruteFuzzy = collectFuzzyCandidates(normTok([typo]), nameDocs, {
      forwardCap: 10_000,
    });
    const foundNeedle = lastIds.includes(needleTitleId);
    const bruteHasNeedle = bruteFuzzy.some((h) => h.sourceId === needleTitleId);

    console.log(
      JSON.stringify({
        case: 'fuzzy-typo',
        query: typo,
        p50Ms: Number(percentile(warmed, 50).toFixed(2)),
        p95Ms: Number(percentile(warmed, 95).toFixed(2)),
        resultIncludesNeedle: foundNeedle,
        bruteForceFuzzyHasNeedle: bruteHasNeedle,
        bruteForceFuzzyCount: bruteFuzzy.length,
        nameRows: nameDocs.length,
        fuzzyStatus: lastDiagnostics?.fuzzy ?? null,
        fuzzyMs: lastDiagnostics?.fuzzyMs ?? null,
      }),
    );
  }

  await prisma.campaign.delete({ where: { id: campaignId } });
  await prisma.user.delete({ where: { id: gmId } });
  console.log('Done.');
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
