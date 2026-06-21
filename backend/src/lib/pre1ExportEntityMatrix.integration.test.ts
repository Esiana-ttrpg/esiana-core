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
import { SOVEREIGN_KNOWLEDGE_PATH } from './campaignExport/sovereignKnowledge.js';
import { metadataToFrontMatterFields, frontMatterFieldsToMetadata } from './pageMetadataRoundTrip.js';
import {
  resolveImportEntityCategory,
  resolveImportTemplateType,
} from './importModuleTemplateType.js';

const CODEX_TEMPLATE_FIXTURES: Array<{
  label: string;
  templateType: string;
  metadata: Record<string, unknown>;
}> = [
  {
    label: 'Character',
    templateType: 'CHARACTER',
    metadata: { entityCategory: 'characters', profession: 'Scout', activeArc: 'Find the key' },
  },
  {
    label: 'Location',
    templateType: 'LOCATION',
    metadata: { entityCategory: 'locations', locationType: 'city' },
  },
  {
    label: 'Organization',
    templateType: 'ORGANIZATION',
    metadata: { entityCategory: 'organizations', orgType: 'guild' },
  },
  {
    label: 'Family',
    templateType: 'FAMILY',
    metadata: { entityCategory: 'families' },
  },
  {
    label: 'Quest',
    templateType: 'QUEST',
    metadata: { entityCategory: 'quests', questStatus: 'ACTIVE' },
  },
  {
    label: 'Session Note',
    templateType: 'SESSION_NOTE',
    metadata: { entityCategory: 'session_notes' },
  },
  {
    label: 'Journal',
    templateType: 'JOURNAL',
    metadata: { entityCategory: 'journals' },
  },
  {
    label: 'Thread',
    templateType: 'DEFAULT',
    metadata: { entityCategory: 'narrative_threads', threadStatus: 'ACTIVE' },
  },
];

function stableMetadataDiff(
  before: Record<string, unknown>,
  after: Record<string, unknown>,
): string[] {
  const keys = new Set([...Object.keys(before), ...Object.keys(after)]);
  const diffs: string[] = [];
  for (const key of keys) {
    if (key === 'importMetadata' || key === 'quickInfo' || key === 'slug') continue;
    const left = JSON.stringify(before[key] ?? null);
    const right = JSON.stringify(after[key] ?? null);
    if (left !== right) diffs.push(key);
  }
  return diffs;
}

test('pre-1.0 export matrix: sovereign round-trips codex template metadata', async (t) => {
  const owner = await prisma.user.findFirst({ select: { id: true } });
  if (!owner) {
    t.skip('No user in test database');
    return;
  }

  const stamp = randomUUID().slice(0, 8);
  const campaign = await prisma.campaign.create({
    data: {
      name: `Export Matrix ${stamp}`,
      handle: `ex-matrix-${stamp}`,
      campaignOwnerUserId: owner.id,
    },
  });

  t.after(async () => {
    await prisma.loreClaim.deleteMany({ where: { campaignId: campaign.id } });
    await prisma.entityHistoricalAlias.deleteMany({ where: { campaignId: campaign.id } });
    await prisma.wikiPage.deleteMany({ where: { campaignId: campaign.id } });
    await prisma.campaign.delete({ where: { id: campaign.id } });
  });

  const pageIds: string[] = [];
  for (const fixture of CODEX_TEMPLATE_FIXTURES) {
    const pageId = `page-${fixture.label.toLowerCase().replace(/\s+/g, '-')}-${stamp}`;
    pageIds.push(pageId);
    await prisma.wikiPage.create({
      data: {
        id: pageId,
        campaignId: campaign.id,
        title: `${fixture.label} ${stamp}`,
        templateType: fixture.templateType,
        visibility: 'Party',
        metadata: {
          ...fixture.metadata,
          slug: `${fixture.label.toLowerCase().replace(/\s+/g, '-')}-${stamp}`,
        } as never,
        blocks: [
          {
            id: `block-${pageId}`,
            type: 'text-tiptap',
            x: 0,
            y: 0,
            w: 12,
            h: 4,
            isPrivate: false,
            visibility: 'Party',
            content: { markdown: `Body for ${fixture.label}` },
          },
        ] as never,
      },
    });
  }

  const beforePages = await prisma.wikiPage.findMany({
    where: { campaignId: campaign.id, deletedAt: null },
    orderBy: { title: 'asc' },
  });

  const exportResult = await buildSovereignExport(campaign.id, 'sovereign');
  assert.ok(exportResult);

  const zipBuffer = await buildCampaignBackupZip(exportResult.files);
  const zipFilename = `campaign-${campaign.id}-matrix-test.zip`;
  const zipPath = path.join(env.uploadsDir, zipFilename);
  await fs.writeFile(zipPath, zipBuffer);

  await prisma.asset.create({
    data: buildImportStagingAssetData({
      campaignId: campaign.id,
      url: `/uploads/${zipFilename}`,
      type: 'campaign-backup-zip',
    }) as never,
  });

  await processCampaignBackupRestore(campaign.id);

  const afterPages = await prisma.wikiPage.findMany({
    where: { campaignId: campaign.id, deletedAt: null },
    orderBy: { title: 'asc' },
  });

  assert.equal(afterPages.length, beforePages.length);

  for (const before of beforePages) {
    const after = afterPages.find((page) => page.id === before.id);
    assert.ok(after, `missing restored page ${before.id}`);
    assert.equal(after.templateType, before.templateType, before.title);
    const beforeMeta = (before.metadata ?? {}) as Record<string, unknown>;
    const afterMeta = (after.metadata ?? {}) as Record<string, unknown>;
    const diffs = stableMetadataDiff(beforeMeta, afterMeta);
    assert.equal(
      diffs.length,
      0,
      `metadata drift on ${before.title}: ${diffs.join(', ')}`,
    );
  }

  await fs.unlink(zipPath).catch(() => undefined);
});

test('pre-1.0 export matrix: sovereign round-trips knowledge.json', async (t) => {
  const owner = await prisma.user.findFirst({ select: { id: true } });
  if (!owner) {
    t.skip('No user in test database');
    return;
  }

  const stamp = randomUUID().slice(0, 8);
  const pageId = `knowledge-page-${stamp}`;
  const slug = `hero-${stamp}`;

  const campaign = await prisma.campaign.create({
    data: {
      name: `Knowledge Export ${stamp}`,
      handle: `ex-know-${stamp}`,
      campaignOwnerUserId: owner.id,
    },
  });

  t.after(async () => {
    await prisma.loreClaim.deleteMany({ where: { campaignId: campaign.id } });
    await prisma.entityHistoricalAlias.deleteMany({ where: { campaignId: campaign.id } });
    await prisma.wikiPage.deleteMany({ where: { campaignId: campaign.id } });
    await prisma.campaign.delete({ where: { id: campaign.id } });
  });

  await prisma.wikiPage.create({
    data: {
      id: pageId,
      campaignId: campaign.id,
      title: `Hero ${stamp}`,
      templateType: 'CHARACTER',
      visibility: 'Party',
      metadata: { entityCategory: 'characters', slug } as never,
      blocks: [] as never,
    },
  });

  await prisma.entityHistoricalAlias.create({
    data: {
      stableKey: `alias-${stamp}`,
      campaignId: campaign.id,
      pageId,
      name: 'The Masked One',
      visibility: 'GM_ONLY',
    },
  });

  await prisma.loreClaim.create({
    data: {
      stableKey: `claim-${stamp}`,
      campaignId: campaign.id,
      pageId,
      statement: 'They saved the village.',
      knowledgeState: 'CONFIRMED',
      visibility: 'PARTY',
    },
  });

  const exportResult = await buildSovereignExport(campaign.id, 'sovereign');
  assert.ok(exportResult);
  const knowledgeFile = exportResult.files.find((f) => f.path === SOVEREIGN_KNOWLEDGE_PATH);
  assert.ok(knowledgeFile, 'sovereign export should include knowledge.json when claims exist');

  const knowledge = JSON.parse(String(knowledgeFile.content)) as {
    historicalAliases: Array<{ name: string; pageSlug: string }>;
    loreClaims: Array<{ statement: string; pageSlug: string }>;
  };
  assert.equal(knowledge.historicalAliases.length, 1);
  assert.equal(knowledge.loreClaims.length, 1);
  assert.equal(knowledge.historicalAliases[0]?.pageSlug, slug);
  assert.equal(knowledge.loreClaims[0]?.statement, 'They saved the village.');

  const zipBuffer = await buildCampaignBackupZip(exportResult.files);
  const zipFilename = `campaign-${campaign.id}-knowledge-test.zip`;
  const zipPath = path.join(env.uploadsDir, zipFilename);
  await fs.writeFile(zipPath, zipBuffer);

  await prisma.asset.create({
    data: buildImportStagingAssetData({
      campaignId: campaign.id,
      url: `/uploads/${zipFilename}`,
      type: 'campaign-backup-zip',
    }) as never,
  });

  await processCampaignBackupRestore(campaign.id);

  const restoredAlias = await prisma.entityHistoricalAlias.findFirst({
    where: { campaignId: campaign.id, pageId, name: 'The Masked One' },
  });
  const restoredClaim = await prisma.loreClaim.findFirst({
    where: { campaignId: campaign.id, pageId, statement: 'They saved the village.' },
  });
  assert.ok(restoredAlias);
  assert.ok(restoredClaim);

  await fs.unlink(zipPath).catch(() => undefined);
});

test('pre-1.0 export matrix: documents sovereign gaps for map layers and reputation', async () => {
  const exportPaths = [
    'sovereign/relations.json',
    'sovereign/operational.json',
    SOVEREIGN_KNOWLEDGE_PATH,
    'sovereign/media/manifest.json',
  ];
  assert.ok(exportPaths.includes(SOVEREIGN_KNOWLEDGE_PATH));
  assert.equal(
    exportPaths.some((p) => p.includes('map-layers')),
    false,
    'map layers remain B-tier: not yet in sovereign format',
  );
  assert.equal(
    exportPaths.some((p) => p.includes('reputation')),
    false,
    'reputation remains C-tier: full-clone only',
  );
});

test('pre-1.0 export matrix: Obsidian import resolves template types from module', () => {
  assert.equal(resolveImportTemplateType('Characters', {}), 'CHARACTER');
  assert.equal(resolveImportTemplateType('Locations', {}), 'LOCATION');
  assert.equal(
    resolveImportTemplateType('Characters', { templateType: 'ARC' }),
    'ARC',
  );
  assert.equal(resolveImportEntityCategory('Characters', {}), 'characters');
});

test('pre-1.0 export matrix: frontmatter metadata round-trip keys stay aligned', () => {
  for (const fixture of CODEX_TEMPLATE_FIXTURES) {
    const fm = metadataToFrontMatterFields(fixture.metadata);
    const restored = frontMatterFieldsToMetadata(fm);
    for (const key of Object.keys(fixture.metadata)) {
      assert.equal(
        JSON.stringify(restored[key] ?? null),
        JSON.stringify(fixture.metadata[key] ?? null),
        `${fixture.label}.${key}`,
      );
    }
  }
});
