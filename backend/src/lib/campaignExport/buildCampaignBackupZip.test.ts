import assert from 'node:assert/strict';
import test from 'node:test';
import {
  buildCampaignBackupZip,
  readCampaignBackupZip,
  readZipTextFile,
} from './buildCampaignBackupZip.js';
import { CAMPAIGN_BACKUP_FORMAT } from './types.js';

test('buildCampaignBackupZip preserves manifest and sovereign paths', async () => {
  const files = [
    {
      path: 'manifest.json',
      content: JSON.stringify({
        format: CAMPAIGN_BACKUP_FORMAT,
        exportKind: 'sovereign',
        exportedAt: '2026-05-29T00:00:00.000Z',
        campaign: {
          id: 'camp-1',
          name: 'Test',
          handle: 'test',
          gameSystem: 'dnd-5e',
          language: 'English',
          version: 1,
        },
      }),
    },
    {
      path: 'sovereign/wiki/World/Characters/Hero.md',
      content: '---\ntitle: Hero\n---\n\n# Hero',
    },
    {
      path: 'sovereign/relations.json',
      content: JSON.stringify({ links: [], tags: [], tree: [] }),
    },
  ];

  const zipBuffer = await buildCampaignBackupZip(files);
  const entries = await readCampaignBackupZip(zipBuffer);

  const manifestText = readZipTextFile(entries, 'manifest.json');
  assert.ok(manifestText);
  const manifest = JSON.parse(manifestText) as { format: string };
  assert.equal(manifest.format, CAMPAIGN_BACKUP_FORMAT);

  const wikiText = readZipTextFile(
    entries,
    'sovereign/wiki/World/Characters/Hero.md',
  );
  assert.match(wikiText ?? '', /title: Hero/);
});
