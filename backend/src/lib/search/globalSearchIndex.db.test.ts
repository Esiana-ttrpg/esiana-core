import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import test from 'node:test';
import { prisma } from '../prisma.js';
import { buildCampaignActor } from '../../../../shared/campaignPolicy/policy.js';
import { CampaignMemberRoles, WikiVisibility } from '../../types/domain.js';
import {
  buildSearchQueryParts,
  emptyStructuredFilters,
} from './searchContext.js';
import {
  clearSearchProviders,
  setSearchProvidersForTests,
} from './searchProviderRegistry.js';
import {
  resetSearchProviderBootstrapForTests,
  searchCampaign,
} from './searchService.js';
import { wikiPageSearchProvider } from './wikiPageSearchProvider.js';
import type { SearchContext } from './searchContext.js';
import {
  clearSearchIndexEnsureMemoForTests,
  rebuildSearchIndexForCampaign,
  upsertWikiPageDocument,
  deleteDocumentsForPages,
} from './index/searchIndexService.js';
import { findSearchIndexCandidates } from './index/getSearchIndexEngine.js';
import { normalizeSearchTokens } from './index/normalizeSearchText.js';
import { encodeCursor } from './index/searchIndexEngine.js';

async function makeCtx(input: {
  campaignId: string;
  campaignHandle: string;
  ownerUserId: string;
  userId: string;
  role: string;
  query: string;
  limit?: number;
}): Promise<SearchContext> {
  const actor = buildCampaignActor({
    kind: 'member',
    userId: input.userId,
    membershipRole: input.role,
    campaignOwnerUserId: input.ownerUserId,
    discoverability: 'private',
    allowPlayerChronologyManagement: false,
  });
  return {
    campaignId: input.campaignId,
    campaignHandle: input.campaignHandle,
    role: input.role as SearchContext['role'],
    actor,
    isElevated:
      input.role === CampaignMemberRoles.GAMEMASTER ||
      input.role === CampaignMemberRoles.WRITER,
    query: buildSearchQueryParts(input.query),
    limit: input.limit ?? 20,
    types: null,
    filters: emptyStructuredFilters(),
  };
}

test('indexed search: recall past LIMIT 200, multi-token, tier, edit, delete', async (t) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
  } catch {
    t.skip('Database is not reachable');
    return;
  }

  // Ensure SearchIndexDocument model exists (migration applied).
  try {
    await prisma.searchIndexDocument.count();
  } catch {
    t.skip('SearchIndexDocument table is not available (run migrations)');
    return;
  }

  const stamp = randomUUID().slice(0, 8);
  const bodyToken = `idxbody${stamp}`;
  const aliasToken = `idxalias${stamp}`;
  const rareA = `idxrara${stamp}`;
  const rareB = `idxrarb${stamp}`;
  const dmToken = `idxdm${stamp}`;
  const gmId = `idx-gm-${stamp}`;
  const playerId = `idx-player-${stamp}`;
  const campaignId = `idx-campaign-${stamp}`;
  const handle = `idx-${stamp}`;
  const aliasPageId = `idx-alias-page-${stamp}`;
  const pairPageId = `idx-pair-${stamp}`;
  const dmPageId = `idx-dm-${stamp}`;
  const editPageId = `idx-edit-${stamp}`;
  const fillerPrefix = `idx-filler-${stamp}-`;

  clearSearchProviders();
  setSearchProvidersForTests([wikiPageSearchProvider]);
  resetSearchProviderBootstrapForTests();
  clearSearchIndexEnsureMemoForTests();

  t.after(async () => {
    await prisma.campaign.delete({ where: { id: campaignId } }).catch(() => undefined);
    await prisma.user.deleteMany({
      where: { id: { in: [gmId, playerId] } },
    }).catch(() => undefined);
    clearSearchProviders();
    resetSearchProviderBootstrapForTests();
    clearSearchIndexEnsureMemoForTests();
  });

  await prisma.user.createMany({
    data: [
      { id: gmId, email: `${gmId}@example.test`, displayName: 'GM' },
      { id: playerId, email: `${playerId}@example.test`, displayName: 'Player' },
    ],
  });

  await prisma.campaign.create({
    data: {
      id: campaignId,
      name: `Index Search ${stamp}`,
      handle,
      campaignOwnerUserId: gmId,
      members: {
        create: [
          { userId: gmId, role: CampaignMemberRoles.GAMEMASTER },
          { userId: playerId, role: CampaignMemberRoles.PARTICIPANT },
        ],
      },
    },
  });

  // ~250 recent body-only filler pages sharing bodyToken (would saturate old LIMIT 200).
  const FILLER = 250;
  const now = Date.now();
  for (let i = 0; i < FILLER; i += 1) {
    const id = `${fillerPrefix}${i}`;
    await prisma.wikiPage.create({
      data: {
        id,
        campaignId,
        title: `Filler ${i}`,
        visibility: WikiVisibility.PARTY,
        templateType: 'DEFAULT',
        metadata: { entityCategory: 'locations' },
        blocks: [
          {
            id: `b-${i}`,
            type: 'text-tiptap',
            visibility: 'Party',
            content: { markdown: `Body mentions ${bodyToken} filler ${i}.` },
          },
        ],
        updatedAt: new Date(now - i * 1000),
      },
    });
  }

  // Older page whose only match is an alias containing aliasToken.
  await prisma.wikiPage.create({
    data: {
      id: aliasPageId,
      campaignId,
      title: `Quiet Grove ${stamp}`,
      visibility: WikiVisibility.PARTY,
      templateType: 'DEFAULT',
      metadata: { entityCategory: 'locations' },
      blocks: [],
      updatedAt: new Date(now - FILLER * 2000),
      aliases: {
        create: {
          campaignId,
          alias: `Place of ${aliasToken}`,
          normalizedAlias: `place of ${aliasToken}`,
        },
      },
    },
  });

  // Multi-token: each rare token appears alone on many pages; together only on pairPage.
  for (let i = 0; i < 50; i += 1) {
    await prisma.wikiPage.create({
      data: {
        id: `${fillerPrefix}a-${i}`,
        campaignId,
        title: `Only A ${i}`,
        visibility: WikiVisibility.PARTY,
        templateType: 'DEFAULT',
        metadata: { entityCategory: 'locations' },
        blocks: [
          {
            id: 't',
            type: 'text-tiptap',
            visibility: 'Party',
            content: { markdown: `Has ${rareA} alone.` },
          },
        ],
      },
    });
    await prisma.wikiPage.create({
      data: {
        id: `${fillerPrefix}b-${i}`,
        campaignId,
        title: `Only B ${i}`,
        visibility: WikiVisibility.PARTY,
        templateType: 'DEFAULT',
        metadata: { entityCategory: 'locations' },
        blocks: [
          {
            id: 't',
            type: 'text-tiptap',
            visibility: 'Party',
            content: { markdown: `Has ${rareB} alone.` },
          },
        ],
      },
    });
  }

  await prisma.wikiPage.create({
    data: {
      id: pairPageId,
      campaignId,
      title: `Paired Token Page ${stamp}`,
      visibility: WikiVisibility.PARTY,
      templateType: 'DEFAULT',
      metadata: { entityCategory: 'locations' },
      blocks: [
        {
          id: 't',
          type: 'text-tiptap',
          visibility: 'Party',
          content: { markdown: `Contains both ${rareA} and ${rareB}.` },
        },
      ],
    },
  });

  await prisma.wikiPage.create({
    data: {
      id: dmPageId,
      campaignId,
      title: `Visible Shell ${stamp}`,
      visibility: WikiVisibility.PARTY,
      templateType: 'DEFAULT',
      metadata: { entityCategory: 'characters', profession: 'Scout' },
      blocks: [
        {
          id: 'pub',
          type: 'text-tiptap',
          visibility: 'Party',
          content: { markdown: 'Public blurb.' },
        },
        {
          id: 'sec',
          type: 'text-tiptap',
          visibility: 'DM_Only',
          content: { markdown: `DM secret ${dmToken}` },
        },
      ],
    },
  });

  await prisma.wikiPage.create({
    data: {
      id: editPageId,
      campaignId,
      title: `Editable Before ${stamp}`,
      visibility: WikiVisibility.PARTY,
      templateType: 'DEFAULT',
      metadata: { entityCategory: 'locations', region: 'Old Region' },
      blocks: [],
    },
  });

  await rebuildSearchIndexForCampaign(campaignId);

  const gmCtx = await makeCtx({
    campaignId,
    campaignHandle: handle,
    ownerUserId: gmId,
    userId: gmId,
    role: CampaignMemberRoles.GAMEMASTER,
    query: aliasToken,
    limit: 20,
  });
  const aliasHits = await searchCampaign(gmCtx);
  assert.ok(
    aliasHits.results.some((r) => r.entityId === aliasPageId),
    'alias-only match must be found despite many newer body hits',
  );

  const pairCtx = await makeCtx({
    campaignId,
    campaignHandle: handle,
    ownerUserId: gmId,
    userId: gmId,
    role: CampaignMemberRoles.GAMEMASTER,
    query: `${rareA} ${rareB}`,
    limit: 20,
  });
  const pairHits = await searchCampaign(pairCtx);
  assert.ok(
    pairHits.results.some((r) => r.entityId === pairPageId),
    'two-token AND must find the page that has both tokens',
  );
  assert.ok(
    !pairHits.results.some((r) => r.entityId.startsWith(`${fillerPrefix}a-`)),
    'pages with only one token must not match two-token query',
  );

  const playerDmCtx = await makeCtx({
    campaignId,
    campaignHandle: handle,
    ownerUserId: gmId,
    userId: playerId,
    role: CampaignMemberRoles.PARTICIPANT,
    query: dmToken,
    limit: 20,
  });
  const playerDmHits = await searchCampaign(playerDmCtx);
  assert.equal(
    playerDmHits.results.filter((r) => r.entityId === dmPageId).length,
    0,
    'player must not see DM-only block matches',
  );

  const gmDmCtx = await makeCtx({
    campaignId,
    campaignHandle: handle,
    ownerUserId: gmId,
    userId: gmId,
    role: CampaignMemberRoles.GAMEMASTER,
    query: dmToken,
    limit: 20,
  });
  const gmDmHits = await searchCampaign(gmDmCtx);
  assert.ok(
    gmDmHits.results.some((r) => r.entityId === dmPageId),
    'GM must find DM-only block token',
  );

  // Title edit reflected immediately via upsert.
  const newTitle = `Editable After ${stamp}`;
  await prisma.wikiPage.update({
    where: { id: editPageId },
    data: { title: newTitle },
  });
  await upsertWikiPageDocument(prisma, campaignId, editPageId);

  const editCtx = await makeCtx({
    campaignId,
    campaignHandle: handle,
    ownerUserId: gmId,
    userId: gmId,
    role: CampaignMemberRoles.GAMEMASTER,
    query: `Editable After ${stamp}`,
    limit: 20,
  });
  const editHits = await searchCampaign(editCtx);
  assert.ok(
    editHits.results.some((r) => r.entityId === editPageId && r.title === newTitle),
    'title edit must be indexed immediately',
  );

  // Delete removes from index.
  await prisma.wikiPage.update({
    where: { id: editPageId },
    data: { deletedAt: new Date() },
  });
  await deleteDocumentsForPages(prisma, [editPageId]);
  const deletedHits = await searchCampaign(editCtx);
  assert.ok(
    !deletedHits.results.some((r) => r.entityId === editPageId),
    'soft-deleted page must disappear from search',
  );

  // Cursor pagination contract: page through bodyToken with batchSize=5.
  const tokens = normalizeSearchTokens([bodyToken]);
  const allIds: string[] = [];
  let cursor: string | null = null;
  for (let i = 0; i < 100; i += 1) {
    const page = await findSearchIndexCandidates({
      campaignId,
      tokens,
      isElevated: true,
      visibilityIn: null,
      typeKeys: null,
      cursor,
      batchSize: 5,
    });
    for (const c of page.candidates) allIds.push(c.sourceId);
    cursor = page.nextCursor;
    if (!cursor) break;
  }
  const unpaged: string[] = [];
  {
    let c: string | null = null;
    for (;;) {
      const page = await findSearchIndexCandidates({
        campaignId,
        tokens,
        isElevated: true,
        visibilityIn: null,
        typeKeys: null,
        cursor: c,
        batchSize: 500,
      });
      for (const cand of page.candidates) unpaged.push(cand.sourceId);
      c = page.nextCursor;
      if (!c) break;
    }
  }
  assert.deepEqual(allIds, unpaged, 'paged candidates must equal unpaged order');
  assert.equal(new Set(allIds).size, allIds.length, 'no duplicate candidates');

  // Foreign-engine cursor restarts cleanly (decode returns null → first page).
  const { getSearchIndexEngine } = await import('./index/getSearchIndexEngine.js');
  const current = getSearchIndexEngine().id;
  const foreignId = current === 'postgres-tsvector' ? 'portable-like' : 'postgres-tsvector';
  const foreign = encodeCursor(foreignId as 'postgres-tsvector' | 'portable-like', 1, {
    titleHit: 1,
    updatedAtMs: Date.now(),
    id: 'x',
    rank: 0,
  });
  const restarted = await findSearchIndexCandidates({
    campaignId,
    tokens,
    isElevated: true,
    visibilityIn: null,
    typeKeys: null,
    cursor: foreign,
    batchSize: 5,
  });
  assert.ok(restarted.candidates.length > 0);
  assert.equal(restarted.candidates[0]?.sourceId, unpaged[0]);
});
