#!/usr/bin/env node
/**
 * Convert campaign-seeder scenario JSON + skeleton flavor stubs into markdown content packs.
 * Does not emit calendar-events.json or relations.json.
 */
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const pluginRoot = path.resolve(__dirname, '..');
const seederRoot = path.resolve(pluginRoot, '../campaign-seeder');

const SK = {
  characters: 'skeleton:World/Characters',
  party: 'skeleton:World/Party',
  bestiary: 'skeleton:World/Bestiary',
  ancestries: 'skeleton:World/Ancestries',
  organizations: 'skeleton:World/Organizations',
  locations: 'skeleton:World/Locations',
  maps: 'skeleton:World/Maps',
  objects: 'skeleton:World/Objects',
  families: 'skeleton:World/Families',
  rules: 'skeleton:Game/Rules/Resources',
  quests: 'skeleton:Game/Quests',
  journals: 'skeleton:Game/Journals',
  events: 'skeleton:Game/Events',
  tags: 'skeleton:Tags',
  sessionNotes: 'skeleton:Player Session Notes',
};

const FLAVOR_CONTENT = {
  'tomb-demo': {
    bestiary: [{ key: 'beast:bone-crawler', title: 'Bone Crawler', body: 'Scuttles in the [[Spike Pit]] environs.' }],
    ancestries: [{ key: 'anc:crypt-bound', title: 'Crypt-Bound', body: 'Residual souls bound to the sunken complex.' }],
    objects: [{ key: 'obj:ledger-shard', title: 'Ledger Shard', body: 'Fragment sought by [[The Sunken Delve]].' }],
    families: [{ key: 'fam:expedition-houses', title: 'Expedition Houses', body: 'Rival delver families funding the crypt probe.' }],
    rules: [{ key: 'rule:delver-code', title: 'Delver Code', body: 'Share findings; no solo descents below the antechamber.' }],
    journals: [{ key: 'journal:dm-only-hook', title: 'Hidden Trap Notes', body: 'DM-only reference for antechamber false doors.', visibility: 'DM_Only' }],
    tagName: 'crypt',
    pcs: [
      { key: 'pc:1', title: 'Aldric the Delver', body: 'Veteran trapfinder.' },
      { key: 'pc:2', title: 'Pella Brightquill', body: 'Archivist-in-training.' },
      { key: 'pc:3', title: 'Grimjaw', body: 'Cautious frontliner.' },
      { key: 'pc:creator', title: 'Your Delver', body: 'Your PC in the expedition.' },
    ],
  },
  'player-demo': {
    bestiary: [{ key: 'beast:shade-hound', title: 'Shade Hound', body: 'Hunts the party near [[Old Mill Road]].' }],
    ancestries: [{ key: 'anc:highland-clans', title: 'Highland Clans', body: 'Feuding kin of the border marches.' }],
    objects: [{ key: 'obj:healing-kit', title: 'Party Healing Kit', body: 'Shared supplies between sessions.' }],
    families: [{ key: 'fam:brightquill', title: 'Brightquill Family', body: 'Merchants with ties to the party.' }],
    rules: [{ key: 'rule:table-safety', title: 'Table Safety', body: 'Lines & veils; pause anytime.' }],
    journals: [
      { key: 'journal:player-note', title: 'Personal Recollection', body: 'Something the party saw last session.', visibility: 'Party' },
      { key: 'journal:dm-secret', title: 'DM Secret Thread', body: 'Hidden plot the players have not uncovered.', visibility: 'DM_Only' },
    ],
    tagName: 'adventure',
    pcs: [
      { key: 'pc:1', title: 'Finn Oakens', body: 'Bold fighter; player demo account.' },
      { key: 'pc:2', title: 'Lyra Moonfall', body: 'Curious scholar.' },
      { key: 'pc:3', title: 'Tobin Quick', body: 'Charming rogue.' },
      { key: 'pc:creator', title: 'Your Hero', body: 'This is you — the logged-in player character.' },
    ],
  },
};

const SCENARIOS = [
  { id: 'tomb-of-horrors-demo', flavor: 'tomb-demo' },
  { id: 'player-experience-demo', flavor: 'player-demo' },
];

function slugify(key) {
  return key.replace(/[^a-zA-Z0-9]+/g, '-').replace(/^-+|-+$/g, '').toLowerCase();
}

function yamlEscape(value) {
  if (/[:#{}[\],&*?|>!%@`"']/.test(value) || value.includes('\n')) {
    return JSON.stringify(value);
  }
  return value;
}

function buildFrontMatter(fields) {
  const lines = ['---'];
  for (const [key, value] of Object.entries(fields)) {
    if (value == null || value === '') continue;
    lines.push(`${key}: ${yamlEscape(String(value))}`);
  }
  lines.push('---', '');
  return lines.join('\n');
}

function pageToMarkdown(page) {
  const metadata = page.metadata ?? {};
  const fields = {
    title: page.title,
    parentKey: page.parentKey,
    ...(page.templateType ? { templateType: page.templateType } : {}),
    ...(page.visibility ? { visibility: page.visibility } : {}),
    slug: slugify(page.key ?? page.title),
    ...metadata,
  };
  return `${buildFrontMatter(fields)}${page.body ?? ''}\n`;
}

function skeletonFlavorPages(flavor) {
  const content = FLAVOR_CONTENT[flavor];
  if (!content) return [];

  const pages = [];
  const push = (entry, parentKey, metadata) => {
    pages.push({
      key: entry.key,
      title: entry.title,
      parentKey,
      body: entry.body,
      visibility: entry.visibility,
      metadata,
    });
  };

  for (const entry of content.bestiary ?? []) {
    push(entry, SK.bestiary, { entityCategory: 'bestiary', creatureType: 'Monstrosity', threatLevel: 'Moderate' });
  }
  for (const entry of content.ancestries ?? []) {
    push(entry, SK.ancestries, { entityCategory: 'ancestries' });
  }
  for (const entry of content.objects ?? []) {
    push(entry, SK.objects, { entityCategory: 'objects' });
  }
  for (const entry of content.families ?? []) {
    push(entry, SK.families, { entityCategory: 'families' });
  }
  for (const entry of content.rules ?? []) {
    push(entry, SK.rules, { entityCategory: 'rules-resources' });
  }
  for (const entry of content.journals ?? []) {
    push(entry, SK.journals, { entityCategory: 'journals' });
  }
  for (const entry of content.pcs ?? []) {
    push(entry, SK.party, { entityCategory: 'characters' });
  }

  const tagName = content.tagName ?? 'demo';
  pages.push({
    key: 'tagged:lore-stub',
    title: 'Tagged Lore Stub',
    parentKey: SK.tags,
    body: `Cross-reference tagged with #${tagName}.`,
    metadata: { entityCategory: 'tags' },
  });

  return pages;
}

async function writePack(scenarioId, flavor) {
  const scenarioPath = path.join(seederRoot, 'scenarios', `${scenarioId}.json`);
  const scenario = JSON.parse(await fs.readFile(scenarioPath, 'utf8'));
  const packDir = path.join(pluginRoot, 'packs', scenarioId, 'pages');
  await fs.rm(packDir, { recursive: true, force: true });

  const allPages = [
    ...(scenario.pages ?? []),
    ...(scenario.eventPages ?? []),
    ...skeletonFlavorPages(flavor),
  ];

  const written = new Set();
  for (const page of allPages) {
    const slug = slugify(page.key ?? page.title);
    if (written.has(slug)) continue;
    written.add(slug);
    const filePath = path.join(packDir, `${slug}.md`);
    await fs.mkdir(path.dirname(filePath), { recursive: true });
    await fs.writeFile(filePath, pageToMarkdown(page), 'utf8');
  }

  console.log(`Wrote ${written.size} pages to packs/${scenarioId}/pages/`);
}

for (const { id, flavor } of SCENARIOS) {
  await writePack(id, flavor);
}
