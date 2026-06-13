import assert from 'node:assert/strict';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, it } from 'node:test';
import { listPackMarkdownFiles } from './packFsUtils.js';
import { parseMarkdownFrontMatter } from './markdownFrontMatter.js';
import { sortPackPagesForInsert } from './markdownPackImporter.js';
import { frontMatterFieldsToMetadata } from './pageMetadataRoundTrip.js';
import { parseCharacterMetadata } from './characterMetadata.js';
import fs from 'node:fs/promises';

const fixtureRoot = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  '../../test/fixtures/content-packs/test-pack',
);

describe('markdownPackImporter', () => {
  it('discovers markdown independent of folder depth', async () => {
    const files = await listPackMarkdownFiles(fixtureRoot);
    assert.equal(files.length, 2);
    const relativePaths = files.map((file) => file.relativePath).sort();
    assert.ok(relativePaths.some((rel) => rel.includes('entry-hall.md')));
    assert.ok(relativePaths.some((rel) => rel.includes('archivist.md')));
  });

  it('sorts slug-parent pages before children for FK-safe import', () => {
    const child = {
      id: 'child',
      title: 'Recover Idol',
      slug: 'objective-recover-idol',
      parentKey: 'slug:quest-find-idol',
      templateType: 'OBJECTIVE',
      visibility: 'Party',
      body: '',
      customFields: {},
    };
    const parent = {
      id: 'parent',
      title: 'Find the Idol',
      slug: 'quest-find-idol',
      parentKey: 'skeleton:Game/Adventure',
      templateType: 'QUEST',
      visibility: 'Party',
      body: '',
      customFields: {},
    };
    const ordered = sortPackPagesForInsert([child, parent]);
    assert.equal(ordered[0]?.slug, 'quest-find-idol');
    assert.equal(ordered[1]?.slug, 'objective-recover-idol');
  });

  it('restores active party participation from character pack frontmatter', () => {
    const raw = `---
title: "Hana Shirogane"
slug: "pc-hana"
parentKey: "skeleton:World/Party"
templateType: "CHARACTER"
partyParticipation: '{"active":true,"role":"PLAYER_CHARACTER"}'
---
# Hana Shirogane
`;
    const parsed = parseMarkdownFrontMatter(raw);
    const metadata = frontMatterFieldsToMetadata(parsed.frontMatter.customFields);
    const identity = parseCharacterMetadata(metadata);
    assert.equal(identity.partyParticipation.active, true);
    assert.equal(identity.partyParticipation.role, 'PLAYER_CHARACTER');
  });

  it('parses parentKey and wikilinks from frontmatter pages', async () => {
    const entryPath = path.join(fixtureRoot, 'pages/world/locations/entry-hall.md');
    const raw = await fs.readFile(entryPath, 'utf8');
    const parsed = parseMarkdownFrontMatter(raw);
    assert.equal(parsed.frontMatter.title, 'Entry Hall');
    assert.equal(parsed.frontMatter.customFields.parentKey, 'skeleton:World/Locations');
    assert.match(parsed.bodyMarkdown, /\[\[False Antechamber\]\]/);
  });
});
