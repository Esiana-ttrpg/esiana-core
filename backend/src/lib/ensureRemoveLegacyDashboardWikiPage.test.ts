import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import type { Prisma } from '@prisma/client';
import { ensureRemoveLegacyDashboardWikiPage } from './ensureRemoveLegacyDashboardWikiPage.js';

type WikiRow = {
  id: string;
  title: string;
  parentId: string | null;
  deletedAt: Date | null;
};

function createMockDb(initialPages: WikiRow[]) {
  const pages = initialPages.map((page) => ({ ...page }));
  const aliases: Array<{
    campaignId: string;
    pageId: string;
    alias: string;
    normalizedAlias: string;
  }> = [];

  const db = {
    wikiPage: {
      findMany: async () =>
        pages.filter((page) => page.deletedAt === null).map((page) => ({
          id: page.id,
          title: page.title,
          parentId: page.parentId,
        })),
      update: async ({
        where,
        data,
      }: {
        where: { id: string };
        data: { deletedAt: Date };
      }) => {
        const page = pages.find((row) => row.id === where.id);
        if (page) page.deletedAt = data.deletedAt;
      },
    },
    wikiPageAlias: {
      findUnique: async ({
        where,
      }: {
        where: { campaignId_normalizedAlias: { campaignId: string; normalizedAlias: string } };
      }) =>
        aliases.find(
          (row) =>
            row.campaignId === where.campaignId_normalizedAlias.campaignId &&
            row.normalizedAlias === where.campaignId_normalizedAlias.normalizedAlias,
        ) ?? null,
      create: async ({
        data,
      }: {
        data: {
          campaignId: string;
          pageId: string;
          alias: string;
          normalizedAlias: string;
        };
      }) => {
        aliases.push(data);
      },
    },
  };

  return {
    db: db as unknown as Prisma.TransactionClient,
    pages,
    aliases,
  };
}

describe('ensureRemoveLegacyDashboardWikiPage', () => {
  it('soft-deletes root Dashboard page and adds alias on World', async () => {
    const { db, pages, aliases } = createMockDb([
      { id: 'dash', title: 'Dashboard', parentId: null, deletedAt: null },
      { id: 'world', title: 'World', parentId: null, deletedAt: null },
    ]);

    await ensureRemoveLegacyDashboardWikiPage('camp-1', db);

    assert.ok(pages.find((page) => page.id === 'dash')?.deletedAt);
    assert.equal(aliases.length, 1);
    assert.equal(aliases[0]?.pageId, 'world');
    assert.equal(aliases[0]?.alias, 'Dashboard');
  });

  it('is idempotent when Dashboard is already removed', async () => {
    const { db, aliases } = createMockDb([
      { id: 'world', title: 'World', parentId: null, deletedAt: null },
    ]);

    await ensureRemoveLegacyDashboardWikiPage('camp-1', db);
    await ensureRemoveLegacyDashboardWikiPage('camp-1', db);

    assert.equal(aliases.length, 0);
  });

  it('ignores nested Dashboard pages', async () => {
    const { db, pages } = createMockDb([
      { id: 'world', title: 'World', parentId: null, deletedAt: null },
      { id: 'nested', title: 'Dashboard', parentId: 'world', deletedAt: null },
    ]);

    await ensureRemoveLegacyDashboardWikiPage('camp-1', db);

    assert.equal(pages.find((page) => page.id === 'nested')?.deletedAt, null);
  });
});
