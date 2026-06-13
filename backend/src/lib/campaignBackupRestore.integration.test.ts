import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import test from 'node:test';
import { randomUUID } from 'node:crypto';
import { prisma } from './prisma.js';
import { env } from '../config/env.js';
import { buildSovereignExport } from './campaignExport/buildSovereignExport.js';
import { buildCampaignBackupZip } from './campaignExport/buildCampaignBackupZip.js';
import { processCampaignBackupRestore } from './campaignBackupRestore.js';
import { buildImportStagingAssetData } from './importStagingRetention.js';
import { DOWNTIME_HAVEN_TEMPLATE_TYPE } from '../../../shared/havenMetadata.js';

test('campaign backup export and restore round-trips haven satellite and plugin data', async (t) => {
  const owner = await prisma.user.findFirst({ select: { id: true } });
  if (!owner) {
    t.skip('No user in test database');
    return;
  }

  const stamp = randomUUID().slice(0, 8);
  const sourceHandle = `bk-src-${stamp}`;
  const havenPageId = `haven-page-${stamp}`;
  const havenRowId = `haven-row-${stamp}`;
  const pluginDataId = `plugin-data-${stamp}`;

  const sourceCampaign = await prisma.campaign.create({
    data: {
      name: `Backup Source ${stamp}`,
      handle: sourceHandle,
      campaignOwnerUserId: owner.id,
    },
  });

  t.after(async () => {
    await prisma.pluginData.deleteMany({
      where: { campaignId: sourceCampaign.id },
    });
    await prisma.downtimeHaven.deleteMany({
      where: { campaignId: sourceCampaign.id },
    });
    await prisma.wikiPage.deleteMany({
      where: { campaignId: sourceCampaign.id },
    });
    await prisma.campaign.delete({ where: { id: sourceCampaign.id } });
  });

  await prisma.wikiPage.create({
    data: {
      id: havenPageId,
      campaignId: sourceCampaign.id,
      title: 'Hidden Sanctuary',
      templateType: DOWNTIME_HAVEN_TEMPLATE_TYPE,
      visibility: 'Party',
      blocks: [
        {
          id: `block-${stamp}`,
          type: 'text-tiptap',
          x: 0,
          y: 0,
          w: 12,
          h: 4,
          isPrivate: false,
          visibility: 'Party',
          content: { markdown: 'A hidden refuge.' },
        },
      ],
      metadata: {
        havenFields: {
          havenType: 'sanctuary',
          status: 'prosperous',
        },
      },
    },
  });

  await prisma.downtimeHaven.create({
    data: {
      id: havenRowId,
      campaignId: sourceCampaign.id,
      wikiPageId: havenPageId,
      havenType: 'sanctuary',
      status: 'prosperous',
    },
  });

  await prisma.pluginData.create({
    data: {
      id: pluginDataId,
      campaignId: sourceCampaign.id,
      pluginId: 'test-backup-plugin',
      key: 'snapshot',
      value: { preserved: true },
    },
  });

  const exportResult = await buildSovereignExport(sourceCampaign.id, 'sovereign');
  assert.ok(exportResult);

  const sourcePageCount = await prisma.wikiPage.count({
    where: { campaignId: sourceCampaign.id, deletedAt: null },
  });
  assert.equal(sourcePageCount, 1, 'source campaign should have one wiki page before export');

  const relationsJson = exportResult.files.find(
    (file) => file.path === 'sovereign/relations.json',
  )?.content;
  assert.ok(relationsJson);
  const relations = JSON.parse(String(relationsJson)) as { tree: unknown[] };
  assert.equal(relations.tree.length, 1, 'export relations tree should include the haven page');
  assert.ok(
    exportResult.files.some((file) => file.path.startsWith('sovereign/wiki/')),
    'export should include sovereign wiki markdown',
  );

  const zipBuffer = await buildCampaignBackupZip(exportResult.files);
  const zipFilename = `campaign-${sourceCampaign.id}-backup-test.zip`;
  const zipPath = path.join(env.uploadsDir, zipFilename);
  await fs.writeFile(zipPath, zipBuffer);

  await prisma.asset.create({
    data: buildImportStagingAssetData({
      campaignId: sourceCampaign.id,
      url: `/uploads/${zipFilename}`,
      type: 'campaign-backup-zip',
    }) as never,
  });

  const zipReadBack = await fs.readFile(zipPath);
  const { readCampaignBackupZip, readZipTextFile } = await import(
    './campaignExport/buildCampaignBackupZip.js'
  );
  const zipEntries = await readCampaignBackupZip(zipReadBack);
  const relationsInZip = JSON.parse(
    readZipTextFile(zipEntries, 'sovereign/relations.json') ?? '{}',
  ) as { tree: unknown[] };
  assert.equal(
    relationsInZip.tree.length,
    1,
    'zip on disk should contain relations tree before restore',
  );

  try {
    await processCampaignBackupRestore(sourceCampaign.id);
  } catch (error) {
    assert.fail(
      `processCampaignBackupRestore failed: ${error instanceof Error ? error.message : String(error)}`,
    );
  }

  const restoredPage = await prisma.wikiPage.findFirst({
    where: { campaignId: sourceCampaign.id, id: havenPageId, deletedAt: null },
  });
  if (!restoredPage) {
    const pages = await prisma.wikiPage.findMany({
      where: { campaignId: sourceCampaign.id, deletedAt: null },
      select: { id: true, title: true },
    });
    assert.fail(
      `Expected restored page ${havenPageId}; found ${JSON.stringify(pages)}`,
    );
  }
  assert.equal(restoredPage.title, 'Hidden Sanctuary');
  assert.equal(restoredPage.templateType, DOWNTIME_HAVEN_TEMPLATE_TYPE);

  const restoredHaven = await prisma.downtimeHaven.findFirst({
    where: { campaignId: sourceCampaign.id, id: havenRowId },
  });
  assert.ok(restoredHaven);
  assert.equal(restoredHaven.wikiPageId, havenPageId);
  assert.equal(restoredHaven.status, 'prosperous');

  const restoredPluginData = await prisma.pluginData.findFirst({
    where: { campaignId: sourceCampaign.id, id: pluginDataId },
  });
  assert.ok(restoredPluginData);
  assert.deepEqual(restoredPluginData.value, { preserved: true });

  await fs.unlink(zipPath).catch(() => undefined);
});
