import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import test from 'node:test';
import { prisma } from '../prisma.js';
import { buildCampaignActor } from '../../../../shared/campaignPolicy/policy.js';
import { CampaignMemberRoles, WikiVisibility, AssetTypes } from '../../types/domain.js';
import { buildSearchQueryParts, emptyStructuredFilters, isoDateOnlyToUtcDate } from './searchContext.js';
import {
  clearSearchProviders,
  setSearchProvidersForTests,
} from './searchProviderRegistry.js';
import {
  resetSearchProviderBootstrapForTests,
  searchCampaign,
} from './searchService.js';
import { wikiPageSearchProvider } from './wikiPageSearchProvider.js';
import { pluginSearchProvider } from './pluginSearchProvider.js';
import {
  clearSearchCollectionRegistry,
  registerSearchCollection,
} from '../plugins/pluginSearchRegistry.js';
import type { SearchContext } from './searchContext.js';
import { resolveSearchAuthors } from './searchAuthorResolver.js';
import { hasTypeOperators } from '../../../../shared/globalSearchQuery.js';

async function makeCtx(input: {
  campaignId: string;
  campaignHandle: string;
  ownerUserId: string;
  userId: string;
  role: string;
  query: string;
  types?: string[] | null;
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
  const query = buildSearchQueryParts(input.query);
  const filters = emptyStructuredFilters();
  const authors = query.parsed.filters.authors;
  if (authors && authors.length > 0) {
    const resolved = await resolveSearchAuthors(input.campaignId, authors);
    filters.authorsUnresolved = resolved.unresolved;
    filters.authorUserIds = resolved.unresolved ? [] : resolved.userIds;
  }
  if (query.parsed.filters.after) {
    filters.after = isoDateOnlyToUtcDate(query.parsed.filters.after);
  }
  if (query.parsed.filters.before) {
    filters.before = isoDateOnlyToUtcDate(query.parsed.filters.before);
  }
  filters.hasDateFilter = filters.after != null || filters.before != null;

  const types = hasTypeOperators(query.parsed)
    ? (query.parsed.filters.types ?? null)
    : (input.types ?? null);

  return {
    campaignId: input.campaignId,
    campaignHandle: input.campaignHandle,
    role: input.role as SearchContext['role'],
    actor,
    isElevated:
      input.role === CampaignMemberRoles.GAMEMASTER ||
      input.role === CampaignMemberRoles.WRITER,
    query,
    limit: input.limit ?? 20,
    types,
    filters,
  };
}

test('global search: content match, ranking, custom fields, visibility, images', async (t) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
  } catch {
    t.skip('Database is not reachable');
    return;
  }

  const stamp = randomUUID().slice(0, 8);
  const restrictedToken = `zq-restricted-${stamp}`;
  const nonexistentToken = `zq-nonexistent-${stamp}`;
  const gmId = `search-gm-${stamp}`;
  const participantId = `search-participant-${stamp}`;
  const campaignId = `search-campaign-${stamp}`;
  const handle = `search-${stamp}`;
  const yunaId = `search-yuna-${stamp}`;
  const besaidId = `search-besaid-${stamp}`;
  const sessionId = `search-session-${stamp}`;
  const hiddenPageId = `search-hidden-${stamp}`;
  const visibleWithDmBlockId = `search-vis-dmblock-${stamp}`;
  const portraitPageId = `search-portrait-${stamp}`;
  const noPortraitId = `search-noportrait-${stamp}`;
  const assetId = `search-asset-${stamp}`;
  const quoteFieldPageId = `search-quote-${stamp}`;
  const unicodePageId = `search-unicode-${stamp}`;

  clearSearchProviders();
  setSearchProvidersForTests([wikiPageSearchProvider]);
  resetSearchProviderBootstrapForTests();

  t.after(async () => {
    await prisma.campaign.delete({ where: { id: campaignId } }).catch(() => undefined);
    await prisma.user.deleteMany({
      where: { id: { in: [gmId, participantId] } },
    }).catch(() => undefined);
    clearSearchProviders();
    resetSearchProviderBootstrapForTests();
  });

  await prisma.user.createMany({
    data: [
      { id: gmId, email: `${gmId}@example.test`, displayName: 'Allison' },
      { id: participantId, email: `${participantId}@example.test`, displayName: 'Tidus' },
    ],
  });

  await prisma.campaign.create({
    data: {
      id: campaignId,
      name: 'Search Campaign',
      handle,
      campaignOwnerUserId: gmId,
      discoverability: 'private',
      members: {
        create: [
          { userId: gmId, role: CampaignMemberRoles.GAMEMASTER },
          { userId: participantId, role: CampaignMemberRoles.PARTICIPANT },
        ],
      },
      assets: {
        create: {
          id: assetId,
          url: `/uploads/search-${stamp}.png`,
          type: AssetTypes.GENERIC,
          visibility: WikiVisibility.PARTY,
        },
      },
    },
  });

  // Character Yuna — biography mentions Besaid; custom fields for visibility tests.
  await prisma.wikiPage.create({
    data: {
      id: yunaId,
      campaignId,
      title: 'Yuna',
      visibility: WikiVisibility.PARTY,
      templateType: 'DEFAULT',
      workspace: 'CHARACTERS',
      pathKey: `yuna-${stamp}`,
      createdByUserId: gmId,
      metadata: {
        entityCategory: 'characters',
        profession: 'Summoner',
        appearance: { portraitUrl: `/api/assets/${assetId}`, summary: null },
      },
      blocks: [
        {
          id: 'bio',
          type: 'text-tiptap',
          visibility: 'Party',
          content: {
            markdown:
              'She was raised on the island of Besaid among the faithful.',
          },
        },
        {
          id: 'secret',
          type: 'text-tiptap',
          visibility: 'DM_Only',
          content: {
            markdown: `Hidden lore contains ${restrictedToken} in a DM-only block.`,
          },
        },
      ],
      aliases: {
        create: {
          campaignId,
          alias: 'Lady Yuna',
          normalizedAlias: 'lady yuna',
        },
      },
    },
  });

  const overviewTab = await prisma.characterPageTab.create({
    data: {
      campaignId,
      characterPageId: yunaId,
      origin: 'CORE',
      renderMode: 'CORE',
      coreKey: 'overview',
      title: 'Overview',
      displayOrder: 0,
      hidden: false,
      blocks: [],
    },
  });
  const discoveryTab = await prisma.characterPageTab.create({
    data: {
      campaignId,
      characterPageId: yunaId,
      origin: 'CORE',
      renderMode: 'CORE',
      coreKey: 'discovery',
      title: 'Discovery',
      displayOrder: 40,
      hidden: false,
      blocks: [],
    },
  });

  await prisma.characterField.createMany({
    data: [
      {
        campaignId,
        characterPageId: yunaId,
        pageTabId: overviewTab.id,
        fieldKey: `homeland-${stamp}`,
        origin: 'CUSTOM',
        label: 'Homeland',
        fieldType: 'STRING',
        value: 'Spira Coast',
        capabilities: { readable: true, writable: true },
      },
      {
        campaignId,
        characterPageId: yunaId,
        pageTabId: overviewTab.id,
        fieldKey: `age-${stamp}`,
        origin: 'CUSTOM',
        label: 'Age',
        fieldType: 'NUMBER',
        value: 17,
        capabilities: { readable: true, writable: true },
      },
      {
        campaignId,
        characterPageId: yunaId,
        pageTabId: discoveryTab.id,
        fieldKey: `secret-field-${stamp}`,
        origin: 'CUSTOM',
        label: 'Secret Mark',
        fieldType: 'STRING',
        value: restrictedToken,
        capabilities: { readable: true, writable: true },
      },
      {
        campaignId,
        characterPageId: yunaId,
        pageTabId: overviewTab.id,
        fieldKey: `unreadable-${stamp}`,
        origin: 'CUSTOM',
        label: 'Internal',
        fieldType: 'STRING',
        value: `${restrictedToken}-unreadable`,
        capabilities: { readable: false, writable: false },
      },
    ],
  });

  await prisma.wikiPage.create({
    data: {
      id: besaidId,
      campaignId,
      title: 'Besaid',
      visibility: WikiVisibility.PARTY,
      templateType: 'DEFAULT',
      workspace: 'LOCATIONS',
      pathKey: `besaid-${stamp}`,
      createdByUserId: participantId,
      metadata: {
        entityCategory: 'locations',
        knownFor: ['small island village'],
        region: 'Spira',
      },
      blocks: [
        {
          id: 'body',
          type: 'text-tiptap',
          content: { markdown: 'A small island village by the sea.' },
        },
      ],
    },
  });

  await prisma.wikiPage.create({
    data: {
      id: sessionId,
      campaignId,
      title: 'Session 14',
      visibility: WikiVisibility.PARTY,
      templateType: 'SESSION_NOTE',
      workspace: 'PAGES',
      pathKey: `session-14-${stamp}`,
      createdByUserId: gmId,
      metadata: {
        sessionNoteAuthorId: gmId,
        isSessionAuthor: true,
      },
      blocks: [
        {
          id: 'session-note-body',
          type: 'text-tiptap',
          content: {
            markdown: 'The party returned to Besaid after the storm.',
          },
        },
      ],
    },
  });

  await prisma.campaignSessionTimeline.create({
    data: {
      id: `search-tp-${stamp}`,
      campaignId,
      wikiPageId: sessionId,
      authorId: gmId,
      sequenceOrder: 14,
      createdAt: new Date('2026-03-15T18:00:00Z'),
      schedule: {
        create: {
          status: 'PUBLISHED',
          plannedStartAt: new Date('2026-03-15T19:00:00Z'),
          publishedAt: new Date('2026-03-10T12:00:00Z'),
        },
      },
    },
  });

  await prisma.wikiPage.create({
    data: {
      id: hiddenPageId,
      campaignId,
      title: `Secret Vault ${restrictedToken}`,
      visibility: WikiVisibility.DM_ONLY,
      templateType: 'DEFAULT',
      workspace: 'PAGES',
      pathKey: `secret-vault-${stamp}`,
      metadata: { entityCategory: 'objects' },
      blocks: [
        {
          id: 'body',
          type: 'text-tiptap',
          content: { markdown: `Only GMs know about ${restrictedToken}.` },
        },
      ],
    },
  });

  await prisma.wikiPage.create({
    data: {
      id: visibleWithDmBlockId,
      campaignId,
      title: 'Village Chronicle',
      visibility: WikiVisibility.PARTY,
      templateType: 'DEFAULT',
      workspace: 'PAGES',
      pathKey: `chronicle-${stamp}`,
      metadata: {},
      blocks: [
        {
          id: 'public',
          type: 'text-tiptap',
          visibility: 'Party',
          content: { markdown: 'A quiet chronicle of village life.' },
        },
        {
          id: 'dm',
          type: 'text-tiptap',
          visibility: 'DM_Only',
          content: {
            markdown: `DM annotation ${restrictedToken} must not leak.`,
          },
        },
      ],
    },
  });

  await prisma.wikiPage.create({
    data: {
      id: portraitPageId,
      campaignId,
      title: 'Portrait Hero',
      visibility: WikiVisibility.PARTY,
      templateType: 'DEFAULT',
      workspace: 'CHARACTERS',
      pathKey: `portrait-hero-${stamp}`,
      featuredImageId: assetId,
      metadata: {
        entityCategory: 'characters',
        appearance: { portraitUrl: `/api/assets/${assetId}` },
      },
      blocks: [],
    },
  });

  await prisma.wikiPage.create({
    data: {
      id: noPortraitId,
      campaignId,
      title: 'Plain Page',
      visibility: WikiVisibility.PARTY,
      templateType: 'DEFAULT',
      workspace: 'PAGES',
      pathKey: `plain-${stamp}`,
      metadata: {},
      blocks: [],
    },
  });

  await prisma.wikiPage.create({
    data: {
      id: quoteFieldPageId,
      campaignId,
      title: 'Quote Carrier',
      visibility: WikiVisibility.PARTY,
      templateType: 'DEFAULT',
      workspace: 'CHARACTERS',
      pathKey: `quote-${stamp}`,
      metadata: { entityCategory: 'characters' },
      blocks: [],
    },
  });
  const quoteTab = await prisma.characterPageTab.create({
    data: {
      campaignId,
      characterPageId: quoteFieldPageId,
      origin: 'CORE',
      renderMode: 'CORE',
      coreKey: 'overview',
      title: 'Overview',
      displayOrder: 0,
      blocks: [],
    },
  });
  await prisma.characterField.create({
    data: {
      campaignId,
      characterPageId: quoteFieldPageId,
      pageTabId: quoteTab.id,
      fieldKey: `quote-${stamp}`,
      origin: 'CUSTOM',
      label: 'Motto',
      fieldType: 'STRING',
      value: 'She said "Besaid forever"',
      capabilities: { readable: true, writable: true },
    },
  });

  await prisma.wikiPage.create({
    data: {
      id: unicodePageId,
      campaignId,
      title: 'Café Luna',
      visibility: WikiVisibility.PARTY,
      templateType: 'DEFAULT',
      workspace: 'LOCATIONS',
      pathKey: `cafe-${stamp}`,
      metadata: { entityCategory: 'locations' },
      blocks: [],
    },
  });

  // Materialize the derived search index (Pass 5). Direct prisma creates
  // bypass write-path upserts; rebuild matches import/clone behavior.
  const { rebuildSearchIndexForCampaign, clearSearchIndexEnsureMemoForTests } =
    await import('./index/searchIndexService.js');
  clearSearchIndexEnsureMemoForTests();
  await rebuildSearchIndexForCampaign(campaignId);

  const participantBase = {
    campaignId,
    campaignHandle: handle,
    ownerUserId: gmId,
    userId: participantId,
    role: CampaignMemberRoles.PARTICIPANT,
  };
  const gmBase = {
    campaignId,
    campaignHandle: handle,
    ownerUserId: gmId,
    userId: gmId,
    role: CampaignMemberRoles.GAMEMASTER,
  };

  // 1. Exact title search finds and prioritizes the entity.
  {
    const res = await searchCampaign(await makeCtx({ ...participantBase, query: 'Yuna' }));
    assert.ok(res.results.length >= 1);
    assert.equal(res.results[0]!.entityId, yunaId);
    assert.equal(res.results[0]!.matchedOn, 'title');
    assert.equal(res.results[0]!.excerpt, undefined);
  }

  // 2+3. Body text / Besaid finds Yuna whose title does not contain the query.
  {
    const res = await searchCampaign(await makeCtx({ ...participantBase, query: 'Besaid' }));
    const yuna = res.results.find((r) => r.entityId === yunaId);
    assert.ok(yuna, 'Yuna should match via biography');
    assert.equal(yuna!.matchedOn, 'body');
    assert.ok(yuna!.excerpt);
    assert.match(yuna!.excerpt!.text, /Besaid/i);
    assert.equal(yuna!.type.key, 'character');

    const location = res.results.find((r) => r.entityId === besaidId);
    assert.ok(location);
    assert.equal(location!.matchedOn, 'title');
    assert.ok(location!.score > yuna!.score, 'exact title should outrank body');

    const session = res.results.find((r) => r.entityId === sessionId);
    assert.ok(session, 'session note body should be searchable');
    assert.equal(session!.type.key, 'session-note');
  }

  // 4. Searchable custom-field values participate.
  {
    const res = await searchCampaign(
      await makeCtx({ ...participantBase, query: 'Spira Coast' }),
    );
    const yuna = res.results.find((r) => r.entityId === yunaId);
    assert.ok(yuna);
    assert.equal(yuna!.matchedOn, 'custom_field');
    assert.ok(yuna!.excerpt?.field.includes('Homeland'));
  }

  // Number custom field discoverability
  {
    const res = await searchCampaign(await makeCtx({ ...participantBase, query: '17' }));
    assert.ok(res.results.some((r) => r.entityId === yunaId));
  }

  // Quote-containing custom field discoverability (JSON escaping)
  {
    const res = await searchCampaign(
      await makeCtx({ ...participantBase, query: 'Besaid forever' }),
    );
    assert.ok(res.results.some((r) => r.entityId === quoteFieldPageId));
  }

  // Non-ASCII title discoverability
  {
    const res = await searchCampaign(await makeCtx({ ...participantBase, query: 'Café' }));
    assert.ok(res.results.some((r) => r.entityId === unicodePageId));
  }

  // Alias match
  {
    const res = await searchCampaign(
      await makeCtx({ ...participantBase, query: 'Lady Yuna' }),
    );
    const yuna = res.results.find((r) => r.entityId === yunaId);
    assert.ok(yuna);
    assert.equal(yuna!.matchedOn, 'alias');
    assert.ok(yuna!.excerpt);
  }

  // 5+9+10. Side-channel equivalence: restricted token vs nonexistent.
  {
    const restricted = await searchCampaign(
      await makeCtx({ ...participantBase, query: restrictedToken }),
    );
    const nonexistent = await searchCampaign(
      await makeCtx({ ...participantBase, query: nonexistentToken }),
    );
    assert.deepEqual(restricted.results, nonexistent.results);
    assert.deepEqual(restricted.types, nonexistent.types);
    assert.equal(restricted.results.length, 0);
    assert.equal(restricted.types.length, 0);

    // GM finds restricted content.
    const gmRestricted = await searchCampaign(
      await makeCtx({ ...gmBase, query: restrictedToken }),
    );
    assert.ok(gmRestricted.results.length > 0);
    assert.ok(
      gmRestricted.results.some(
        (r) =>
          r.entityId === hiddenPageId ||
          r.entityId === yunaId ||
          r.entityId === visibleWithDmBlockId,
      ),
    );
  }

  // Hidden page never appears for participant by title fragment unique to it.
  {
    const res = await searchCampaign(
      await makeCtx({ ...participantBase, query: 'Secret Vault' }),
    );
    assert.equal(res.results.some((r) => r.entityId === hiddenPageId), false);
  }

  // 7. Module/type filtering works; counts still include other authorized types.
  {
    const all = await searchCampaign(await makeCtx({ ...participantBase, query: 'Besaid' }));
    const filtered = await searchCampaign(
      await makeCtx({ ...participantBase, query: 'Besaid', types: ['character'] }),
    );
    assert.ok(filtered.results.every((r) => r.type.key === 'character'));
    assert.ok(filtered.types.some((t) => t.key === 'character'));
    // Type counts reflect the authorized unfiltered set.
    assert.deepEqual(
      filtered.types.map((t) => t.key).sort(),
      all.types.map((t) => t.key).sort(),
    );
  }

  // 8. Images/portraits projected with fallback.
  {
    const withPortrait = await searchCampaign(
      await makeCtx({ ...participantBase, query: 'Portrait Hero' }),
    );
    const hit = withPortrait.results.find((r) => r.entityId === portraitPageId);
    assert.ok(hit, 'Portrait Hero should be found by title');
    assert.ok(
      hit.image?.url?.includes(assetId) || hit.image?.thumbUrl?.includes(assetId),
      `expected portrait/featured image for Portrait Hero, got ${JSON.stringify(hit.image)}`,
    );

    const plain = await searchCampaign(
      await makeCtx({ ...participantBase, query: 'Plain Page' }),
    );
    const plainHit = plain.results.find((r) => r.entityId === noPortraitId);
    assert.ok(plainHit);
    assert.equal(plainHit!.image, undefined);
    assert.ok(plainHit!.fallbackIcon);
  }

  // Short query guard — empty without meaningful work.
  {
    const res = await searchCampaign(await makeCtx({ ...participantBase, query: 'a' }));
    assert.deepEqual(res, { query: 'a', results: [], types: [] });
  }

  // Profession metadata searchable
  {
    const res = await searchCampaign(
      await makeCtx({ ...participantBase, query: 'Summoner' }),
    );
    assert.ok(res.results.some((r) => r.entityId === yunaId));
  }

  // --- Pass 2 structured query ---

  // type:character Besaid → characters only in results; counts still cross-type
  {
    const all = await searchCampaign(
      await makeCtx({ ...participantBase, query: 'Besaid' }),
    );
    const filtered = await searchCampaign(
      await makeCtx({ ...participantBase, query: 'type:character Besaid' }),
    );
    assert.ok(filtered.results.every((r) => r.type.key === 'character'));
    assert.ok(filtered.results.some((r) => r.entityId === yunaId));
    assert.equal(
      filtered.results.some((r) => r.entityId === besaidId),
      false,
    );
    assert.deepEqual(
      filtered.types.map((t) => t.key).sort(),
      all.types.map((t) => t.key).sort(),
    );
  }

  // in:sessions scopes to session notes
  {
    const res = await searchCampaign(
      await makeCtx({ ...participantBase, query: 'in:sessions Besaid' }),
    );
    assert.ok(res.results.every((r) => r.type.key === 'session-note'));
    assert.ok(res.results.some((r) => r.entityId === sessionId));
  }

  // Quoted phrase requires contiguous match
  {
    const phraseHit = await searchCampaign(
      await makeCtx({ ...participantBase, query: '"Besaid forever"' }),
    );
    assert.ok(phraseHit.results.some((r) => r.entityId === quoteFieldPageId));

    const nonContiguous = await searchCampaign(
      await makeCtx({
        ...participantBase,
        query: '"raised Besaid"',
      }),
    );
    assert.equal(
      nonContiguous.results.some((r) => r.entityId === yunaId),
      false,
    );
  }

  // Exclusions remove otherwise matching authorized results.
  // Use -village (unique to Besaid location body); Yuna's bio also contains "island".
  {
    const res = await searchCampaign(
      await makeCtx({ ...participantBase, query: 'Besaid -village' }),
    );
    assert.equal(
      res.results.some((r) => r.entityId === besaidId),
      false,
      'location body contains village',
    );
    assert.ok(res.results.some((r) => r.entityId === yunaId));
  }

  // from: uses documented attribution (session author / page creator)
  {
    const fromAllison = await searchCampaign(
      await makeCtx({ ...participantBase, query: 'from:Allison Besaid' }),
    );
    assert.ok(fromAllison.results.some((r) => r.entityId === yunaId));
    assert.ok(fromAllison.results.some((r) => r.entityId === sessionId));
    assert.equal(
      fromAllison.results.some((r) => r.entityId === besaidId),
      false,
      'Besaid location created by Tidus',
    );

    const fromTidus = await searchCampaign(
      await makeCtx({ ...participantBase, query: 'from:Tidus Besaid' }),
    );
    assert.ok(fromTidus.results.some((r) => r.entityId === besaidId));
    assert.equal(
      fromTidus.results.some((r) => r.entityId === yunaId),
      false,
    );

    const unresolved = await searchCampaign(
      await makeCtx({ ...participantBase, query: 'from:Nobody Besaid' }),
    );
    assert.equal(unresolved.results.length, 0);
  }

  // before:/after: only apply to session notes
  {
    const inRange = await searchCampaign(
      await makeCtx({
        ...participantBase,
        query: 'after:2026-03-01 before:2026-04-01 Besaid',
      }),
    );
    assert.ok(inRange.results.every((r) => r.type.key === 'session-note'));
    assert.ok(inRange.results.some((r) => r.entityId === sessionId));

    const outOfRange = await searchCampaign(
      await makeCtx({
        ...participantBase,
        query: 'before:2026-01-01 Besaid',
      }),
    );
    assert.equal(outOfRange.results.length, 0);
  }

  // Side-channel: restricted token + each filter class ≡ nonexistent token
  {
    const filterQueries = [
      `type:character ${restrictedToken}`,
      `in:sessions ${restrictedToken}`,
      `from:Allison ${restrictedToken}`,
      `after:2026-01-01 ${restrictedToken}`,
      `before:2026-12-31 ${restrictedToken}`,
      `${restrictedToken} -public`,
    ];
    for (const q of filterQueries) {
      const restricted = await searchCampaign(
        await makeCtx({ ...participantBase, query: q }),
      );
      const nonexistent = await searchCampaign(
        await makeCtx({
          ...participantBase,
          query: q.replace(restrictedToken, nonexistentToken),
        }),
      );
      assert.deepEqual(
        restricted.results,
        nonexistent.results,
        `side-channel leak for query: ${q}`,
      );
      assert.deepEqual(restricted.types, nonexistent.types);
    }
  }
});

test('global search: plugin searchForViewer adapter', async (t) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
  } catch {
    t.skip('Database is not reachable');
    return;
  }

  const stamp = randomUUID().slice(0, 8);
  const gmId = `plugin-search-gm-${stamp}`;
  const campaignId = `plugin-search-campaign-${stamp}`;
  const handle = `plugin-search-${stamp}`;
  const pluginId = `test-search-plugin-${stamp}`;

  clearSearchProviders();
  clearSearchCollectionRegistry();
  setSearchProvidersForTests([wikiPageSearchProvider, pluginSearchProvider]);
  resetSearchProviderBootstrapForTests();

  let receivedViewer: { userId: string } | null = null;

  registerSearchCollection(pluginId, {
    id: 'relics',
    label: 'Relics',
    search: async () => {
      throw new Error('legacy search() must not be called from Global Search');
    },
    searchForViewer: async (input) => {
      receivedViewer = { userId: input.viewer.userId };
      if (!input.query.text.includes('crystal')) return [];
      return [
        {
          id: 'relic-1',
          title: 'Crystal Relic',
          subtitle: 'Plugin hit',
          matchedOn: 'title',
        },
      ];
    },
  });

  // Legacy-only collection — must be ignored by Global Search.
  registerSearchCollection(`${pluginId}-legacy`, {
    id: 'legacy-only',
    label: 'Legacy Only',
    search: async () => [
      { id: 'legacy-1', title: 'Should Never Appear crystal' },
    ],
  });

  t.after(async () => {
    await prisma.campaignPluginSetting
      .deleteMany({ where: { campaignId } })
      .catch(() => undefined);
    await prisma.systemPlugin
      .deleteMany({ where: { id: pluginId } })
      .catch(() => undefined);
    await prisma.campaign.delete({ where: { id: campaignId } }).catch(() => undefined);
    await prisma.user.deleteMany({ where: { id: gmId } }).catch(() => undefined);
    clearSearchCollectionRegistry();
    clearSearchProviders();
    resetSearchProviderBootstrapForTests();
  });

  await prisma.user.create({
    data: { id: gmId, email: `${gmId}@example.test`, displayName: 'Allison' },
  });
  await prisma.campaign.create({
    data: {
      id: campaignId,
      name: 'Plugin Search Campaign',
      handle,
      campaignOwnerUserId: gmId,
      discoverability: 'private',
      members: {
        create: [{ userId: gmId, role: CampaignMemberRoles.GAMEMASTER }],
      },
    },
  });
  await prisma.systemPlugin.create({
    data: {
      id: pluginId,
      name: 'Test Search Plugin',
      scope: 'campaign',
      isEnabled: true,
      config: {},
    },
  });

  // Disabled plugin → no results
  {
    const res = await searchCampaign(
      await makeCtx({
        campaignId,
        campaignHandle: handle,
        ownerUserId: gmId,
        userId: gmId,
        role: CampaignMemberRoles.GAMEMASTER,
        query: 'crystal',
      }),
    );
    assert.equal(
      res.results.some((r) => r.type.key.startsWith('plugin:')),
      false,
    );
  }

  await prisma.campaignPluginSetting.create({
    data: {
      campaignId,
      pluginId,
      isEnabled: true,
      config: {},
    },
  });

  {
    const res = await searchCampaign(
      await makeCtx({
        campaignId,
        campaignHandle: handle,
        ownerUserId: gmId,
        userId: gmId,
        role: CampaignMemberRoles.GAMEMASTER,
        query: 'crystal',
      }),
    );
    assert.ok(receivedViewer);
    assert.equal(receivedViewer!.userId, gmId);
    const hit = res.results.find((r) => r.title === 'Crystal Relic');
    assert.ok(hit);
    assert.equal(hit!.type.key, `plugin:${pluginId}:relics`);
    assert.equal(
      res.results.some((r) => r.title === 'Should Never Appear crystal'),
      false,
    );
  }

  // type: filter for plugin type
  {
    const res = await searchCampaign(
      await makeCtx({
        campaignId,
        campaignHandle: handle,
        ownerUserId: gmId,
        userId: gmId,
        role: CampaignMemberRoles.GAMEMASTER,
        query: `type:plugin:${pluginId}:relics crystal`,
      }),
    );
    assert.ok(res.results.every((r) => r.type.key === `plugin:${pluginId}:relics`));
  }
});
