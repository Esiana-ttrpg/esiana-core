import assert from 'node:assert/strict';
import test from 'node:test';
import { composeMarkdownDocument } from './campaignExport/serializeFrontMatter.js';
import {
  buildCampaignBackupZip,
  readCampaignBackupZip,
  readZipTextFile,
} from './campaignExport/buildCampaignBackupZip.js';
import { buildBlocksFromMarkdown } from './campaignBackupRestore.js';
import { parseMarkdownFrontMatter } from './markdownFrontMatter.js';
import { CAMPAIGN_BACKUP_FORMAT } from './campaignExport/types.js';

test('campaign backup round-trip preserves sovereign wiki and relations layout', async () => {
  const pageId = 'page-source-001';
  const targetId = 'page-target-002';
  const markdown = composeMarkdownDocument(
    {
      title: 'Source Page',
      tags: ['lore'],
      customFields: {
        esiana_id: pageId,
        templateType: 'DEFAULT',
        visibility: 'Party',
      },
    },
    'Link to [[Target Page]] and image ![](media/asset-1.png)',
  );

  const files = [
    {
      path: 'manifest.json',
      content: JSON.stringify({
        format: CAMPAIGN_BACKUP_FORMAT,
        exportKind: 'sovereign',
        exportedAt: '2026-05-29T00:00:00.000Z',
        campaign: {
          id: 'camp-1',
          name: 'Round Trip',
          slug: 'round-trip',
          gameSystem: 'dnd-5e',
          customGameSystemName: null,
          language: 'English',
          version: 1,
        },
      }),
    },
    {
      path: 'sovereign/wiki/Source-Page.md',
      content: markdown,
    },
    {
      path: 'sovereign/relations.json',
      content: JSON.stringify({
        links: [
          {
            sourcePageId: pageId,
            targetPageId: targetId,
            sourceTitle: 'Source Page',
            targetTitle: 'Target Page',
          },
        ],
        tags: [{ pageId, tagName: 'lore', tagLabel: 'Lore' }],
        tree: [
          { pageId, parentId: null, title: 'Source Page', path: 'Source-Page.md' },
          { pageId: targetId, parentId: null, title: 'Target Page', path: 'Target-Page.md' },
        ],
      }),
    },
    {
      path: 'sovereign/operational.json',
      content: JSON.stringify({
        downtimeHavens: [],
        downtimeProjects: [],
        pluginData: [{ pluginId: 'test-plugin', key: 'k', value: { ok: true } }],
        pluginSettings: [],
      }),
    },
    {
      path: 'sovereign/media/manifest.json',
      content: JSON.stringify({
        assets: [
          {
            id: 'asset-1',
            filename: 'asset-1.png',
            type: 'generic',
            originalUrl: '/uploads/asset-1.png',
          },
        ],
      }),
    },
    {
      path: 'sovereign/media/asset-1.png',
      content: Buffer.from('fake-image'),
    },
  ];

  const zipBuffer = await buildCampaignBackupZip(files);
  const entries = await readCampaignBackupZip(zipBuffer);

  const manifest = JSON.parse(readZipTextFile(entries, 'manifest.json') ?? '{}') as {
    format: string;
  };
  assert.equal(manifest.format, CAMPAIGN_BACKUP_FORMAT);

  const wiki = readZipTextFile(entries, 'sovereign/wiki/Source-Page.md');
  assert.ok(wiki);
  const parsed = parseMarkdownFrontMatter(wiki!);
  assert.equal(parsed.frontMatter.customFields.esiana_id, pageId);

  const titleToPageId = new Map([
    ['target page', targetId],
  ]);
  const mediaFileToAssetId = new Map([['asset-1.png', 'asset-1']]);
  const blocks = buildBlocksFromMarkdown(
    parsed.bodyMarkdown,
    titleToPageId,
    mediaFileToAssetId,
  );

  assert.equal(blocks.length, 1);
  assert.equal(blocks[0].type, 'text-tiptap');
  const body = (blocks[0].content as { markdown: string }).markdown;
  assert.match(body, /data-id="page-target-002"/);
  assert.match(body, /\/api\/assets\/asset-1/);

  assert.ok(entries.has('sovereign/media/asset-1.png'));

  const operational = readZipTextFile(entries, 'sovereign/operational.json');
  assert.ok(operational);
  const operationalPayload = JSON.parse(operational!) as {
    pluginData: Array<{ pluginId: string }>;
  };
  assert.equal(operationalPayload.pluginData[0]?.pluginId, 'test-plugin');
});
