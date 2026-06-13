#!/usr/bin/env node
/**
 * Generates girl-by-moonlight-one-shot flagship content pack.
 * Run from demo-content-packs: node scripts/generate-gbm-pack.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PACK_ROOT = path.join(__dirname, '../packs/girl-by-moonlight-one-shot');

function writePage(relPath, frontmatter, body) {
  const lines = ['---'];
  for (const [k, v] of Object.entries(frontmatter)) {
    if (v === undefined || v === null || v === '') continue;
    if (typeof v === 'object') {
      lines.push(`${k}: '${JSON.stringify(v).replace(/'/g, "''")}'`);
    } else {
      lines.push(`${k}: ${JSON.stringify(String(v))}`);
    }
  }
  lines.push('---', '', body.trim(), '');
  const full = path.join(PACK_ROOT, 'pages', relPath);
  fs.mkdirSync(path.dirname(full), { recursive: true });
  fs.writeFileSync(full, lines.join('\n'), 'utf8');
}

function appearanceJson(summary, pronouns, forms) {
  return {
    summary,
    pronouns,
    gender: null,
    presentation: null,
    appearanceTags: [],
    gallery: {
      entries: forms.map((f, i) => ({
        id: f.id,
        label: f.label,
        imageUrl: '',
        imageCredit: null,
        tags: f.tags ?? [],
        presentationType: f.presentationType ?? 'default',
        isPrimary: i === 0,
        presentationNotes: f.notes ?? null,
        timelinePin: null,
      })),
    },
    build: null,
    voice: null,
    distinguishingFeatures: [],
    visibleInjuries: [],
    vibeImpression: null,
    atAGlance: null,
  };
}

if (fs.existsSync(PACK_ROOT)) {
  fs.rmSync(PACK_ROOT, { recursive: true, force: true });
}
fs.mkdirSync(path.join(PACK_ROOT, 'assets', 'locations'), { recursive: true });
fs.mkdirSync(path.join(PACK_ROOT, 'assets', 'portraits'), { recursive: true });

fs.writeFileSync(
  path.join(PACK_ROOT, 'campaign.json'),
  JSON.stringify(
    {
      formatVersion: 1,
      recruitmentTagline:
        'Four girls. One curse. Tonight the moon demands an answer.',
      description:
        'An urban-fantasy one-shot about dual identity, hidden lore, and the cost of power.',
      campaignHomeIntro:
        'The city remembers what the moon forgot. Your coven fights to keep both.',
    },
    null,
    2,
  ),
);

fs.writeFileSync(
  path.join(PACK_ROOT, 'calendar.json'),
  fs.readFileSync(
    path.join(
      __dirname,
      '../../../esiana-core/backend/test/fixtures/content-packs/calendar-only-pack/calendar.json',
    ),
    'utf8',
  ).replace('"Minimal"', '"Lunar City"'),
);

fs.writeFileSync(
  path.join(PACK_ROOT, 'knowledge.json'),
  JSON.stringify(
    {
      historicalAliases: [
        {
          pageSlug: 'org-lunar-directorate',
          name: 'Civic Watch Committee',
          context: 'Pre-reform government name',
          visibility: 'Party',
        },
      ],
      loreClaims: [
        {
          pageSlug: 'lore-moon-curse',
          statement: 'The moon curse predates the city founding.',
          knowledgeState: 'SUSPECTED',
          visibility: 'Party',
        },
        {
          pageSlug: 'lore-moon-curse',
          statement: 'The Directorate engineered the first binding ritual.',
          knowledgeState: 'UNDISCOVERED',
          visibility: 'DM_Only',
        },
      ],
    },
    null,
    2,
  ),
);

fs.writeFileSync(
  path.join(PACK_ROOT, 'relations.json'),
  JSON.stringify(
    {
      links: [
        { sourceSlug: 'pc-hana', targetSlug: 'org-shirogane-academy' },
        { sourceSlug: 'pc-mira', targetSlug: 'org-student-council' },
        { sourceSlug: 'pc-yuki', targetSlug: 'org-lunar-directorate' },
        { sourceSlug: 'pc-ren', targetSlug: 'org-crescent-resistance' },
        { sourceSlug: 'org-shirogane-academy', targetSlug: 'org-student-council' },
        { sourceSlug: 'org-lunar-directorate', targetSlug: 'org-eclipse-syndicate' },
        { sourceSlug: 'quest-find-idol', targetSlug: 'thread-hope-vs-despair' },
        { sourceSlug: 'quest-investigate-ruins', targetSlug: 'thread-city-secret' },
        { sourceSlug: 'quest-confront-regent', targetSlug: 'thread-cost-of-power' },
      ],
      tags: [
        { pageSlug: 'lore-moon-curse', tagName: 'lore', tagLabel: 'Lore' },
        { pageSlug: 'quest-find-idol', tagName: 'quest', tagLabel: 'Quest' },
      ],
      mapPins: [
        {
          id: 'gbm-pin-academy',
          assetPath: 'assets/locations/city-map.webp',
          targetSlug: 'loc-shirogane-campus',
          label: 'Academy District',
          pinType: 'Location',
          x_coordinate: 120,
          y_coordinate: 80,
        },
        {
          id: 'gbm-pin-rooftop',
          assetPath: 'assets/locations/city-map.webp',
          targetSlug: 'haven-school-rooftop',
          label: 'Rooftop Haven',
          pinType: 'Location',
          x_coordinate: 200,
          y_coordinate: 140,
        },
      ],
    },
    null,
    2,
  ),
);

// Placeholder 1x1 webp bytes (minimal valid WEBP)
const tinyWebp = Buffer.from(
  'UklGRiQAAABXRUJQVlA4IBgAAAAwAQCdASoBAAEAAQAcJaQAA3AA/vuUAAA=',
  'base64',
);
fs.writeFileSync(path.join(PACK_ROOT, 'assets/locations/city-map.webp'), tinyWebp);
fs.writeFileSync(path.join(PACK_ROOT, 'assets/banner.webp'), tinyWebp);
for (const pc of ['hana', 'mira', 'yuki', 'ren']) {
  fs.writeFileSync(path.join(PACK_ROOT, `assets/portraits/${pc}.webp`), tinyWebp);
}

const pcs = [
  {
    slug: 'pc-hana',
    title: 'Hana Shirogane',
    arc: 'Protect her sister from the curse',
    motivation: 'Family before duty',
    org: 'org-shirogane-academy',
    forms: [
      { id: 'civilian', label: 'Civilian Form', presentationType: 'default', notes: 'Student uniform' },
      { id: 'magical', label: 'Magical Form', presentationType: 'transformation', notes: 'Moonlit guardian' },
      { id: 'corrupted', label: 'Corrupted Form', presentationType: 'corrupted', notes: 'Fractured halo' },
    ],
  },
  {
    slug: 'pc-mira',
    title: 'Mira Kaito',
    arc: 'Expose the Directorate cover-up',
    motivation: 'Truth at any cost',
    org: 'org-student-council',
    forms: [
      { id: 'civilian', label: 'Civilian Form', presentationType: 'default', notes: 'Council armband' },
      { id: 'magical', label: 'Magical Form', presentationType: 'transformation', notes: 'Silver veil' },
    ],
  },
  {
    slug: 'pc-yuki',
    title: 'Yuki Arden',
    arc: 'Reconcile duty and friendship',
    motivation: 'Keep the peace between factions',
    org: 'org-lunar-directorate',
    forms: [
      { id: 'civilian', label: 'Civilian Form', presentationType: 'default', notes: 'Agency badge hidden' },
      { id: 'magical', label: 'Magical Form', presentationType: 'transformation', notes: 'Eclipse warden' },
    ],
  },
  {
    slug: 'pc-ren',
    title: 'Ren Ashvale',
    arc: 'Hide the moon-curse from outsiders',
    motivation: 'Protect the coven',
    org: 'org-crescent-resistance',
    forms: [
      { id: 'civilian', label: 'Civilian Form', presentationType: 'default', notes: 'Hoodie and headphones' },
      { id: 'magical', label: 'Magical Form', presentationType: 'transformation', notes: 'Crescent blade' },
      { id: 'private', label: 'Private Form', presentationType: 'private', notes: 'Unmasked vulnerability' },
    ],
  },
];

for (const pc of pcs) {
  writePage(
    `party/${pc.slug}.md`,
    {
      title: pc.title,
      slug: pc.slug,
      parentKey: 'skeleton:World/Party',
      templateType: 'CHARACTER',
      entityCategory: 'characters',
      profession: 'Student',
      status: 'ALIVE',
      activeArc: pc.arc,
      motivation: pc.motivation,
      primaryAffiliationId: `slug:${pc.org}`,
      partyParticipation: { active: true, role: 'PLAYER_CHARACTER' },
      appearance: appearanceJson(
        `${pc.title} — party member of the coven.`,
        'she/her',
        pc.forms,
      ),
    },
    `# ${pc.title}\n\nActive arc: ${pc.arc}. Affiliated with [[${pc.org.replace('org-', '').replace(/-/g, ' ')}]].`,
  );
}

const orgs = [
  ['org-shirogane-academy', 'Shirogane Academy', 'school', 'org-shirogane-academy'],
  ['org-student-council', 'Student Council', 'council', 'slug:org-shirogane-academy'],
  ['org-lunar-directorate', 'Lunar Directorate', 'government', 'slug:loc-directorate-tower'],
  ['org-crescent-resistance', 'Crescent Resistance', 'resistance', 'slug:haven-secret-base'],
  ['org-eclipse-syndicate', 'Eclipse Syndicate', 'antagonist', 'slug:loc-ruined-observatory'],
  ['org-city-herald', 'City Herald Media', 'media', 'slug:loc-broadcast-tower'],
];

for (const [slug, title, type, hq] of orgs) {
  writePage(
    `organizations/${slug}.md`,
    {
      title,
      slug,
      parentKey: 'skeleton:World/Organizations',
      entityCategory: 'organizations',
      orgType: type,
      headquartersId: hq.startsWith('slug:') ? hq : `slug:${hq}`,
      motivation: `${title} shapes the city's hidden war.`,
      relations: [
        { targetOrgId: `slug:${orgs[0][0]}`, relation: 'rivalry', notes: 'Institutional tension' },
      ],
    },
    `# ${title}\n\nA major faction in the lunar city.`,
  );
}

writePage(
  'families/family-ashvale.md',
  {
    title: 'House Ashvale',
    slug: 'family-ashvale',
    parentKey: 'skeleton:World/Families',
    entityCategory: 'families',
    familyType: 'noble',
    status: 'active',
    headCharacterId: 'slug:pc-ren',
    seatLocationId: 'slug:loc-ashvale-apartment',
    inheritedTraits: ['Moon-touched bloodline', 'Binding oaths'],
  },
  '# House Ashvale\n\n[[pc-ren]] carries the family curse.',
);

writePage(
  'families/family-shirogane.md',
  {
    title: 'House Shirogane',
    slug: 'family-shirogane',
    parentKey: 'skeleton:World/Families',
    entityCategory: 'families',
    familyType: 'scholar',
    headCharacterId: 'slug:pc-hana',
    seatLocationId: 'slug:loc-shirogane-campus',
  },
  '# House Shirogane\n\nOld academy lineage tied to [[org-shirogane-academy]].',
);

writePage(
  'locations/loc-lunar-city.md',
  {
    title: 'Lunar City',
    slug: 'loc-lunar-city',
    parentKey: 'skeleton:World/Locations',
    entityCategory: 'locations',
    locationType: 'region',
    knownFor: 'Urban moon-curse hotspot',
  },
  '# Lunar City\n\nThe campaign region.',
);

for (const [slug, title, parent, type] of [
  ['loc-shirogane-campus', 'Shirogane Campus', 'loc-lunar-city', 'district'],
  ['loc-directorate-tower', 'Directorate Tower', 'loc-lunar-city', 'landmark'],
  ['loc-ruined-observatory', 'Ruined Observatory', 'loc-lunar-city', 'ruin'],
  ['loc-ashvale-apartment', 'Ashvale Apartment', 'loc-lunar-city', 'residence'],
  ['loc-broadcast-tower', 'Broadcast Tower', 'loc-lunar-city', 'landmark'],
  ['loc-old-shrine', 'Old Moon Shrine', 'loc-ruined-observatory', 'shrine'],
]) {
  writePage(
    `locations/${slug}.md`,
    {
      title,
      slug,
      parentKey: `slug:${parent}`,
      entityCategory: 'locations',
      locationType: type,
      region: 'Lunar City',
    },
    `# ${title}\n\nPart of [[loc-lunar-city]].`,
  );
}

writePage(
  'maps/map-city-overview.md',
  {
    title: 'Lunar City Overview',
    slug: 'map-city-overview',
    parentKey: 'skeleton:World/Maps',
    entityCategory: 'maps',
    mapAssetPath: 'asset:assets/locations/city-map.webp',
  },
  '# Lunar City Map\n\nOverview map with pins to key locations.',
);

const quests = [
  ['quest-find-idol', 'Find the Missing Idol', 'ACTIVE', 1, null],
  ['quest-investigate-ruins', 'Investigate the Ruins', 'ACTIVE', 2, 'quest-find-idol'],
  ['quest-confront-regent', 'Confront the Regent', 'AVAILABLE', 3, 'quest-investigate-ruins'],
  ['quest-media-leak', 'Stop the Media Leak', 'COMPLETED', null, null],
  ['quest-failed-ritual', 'Stabilize the Failed Ritual', 'FAILED', null, null],
  ['quest-hidden-pact', 'The Hidden Pact', 'ACTIVE', null, null],
];

for (const [slug, title, status, order, parent] of quests) {
  const fm = {
    title,
    slug,
    parentKey: parent ? `slug:${parent}` : 'skeleton:Game/Adventure',
    templateType: 'QUEST',
    entityCategory: 'quests',
    questStatus: status,
    questType: 'main',
    boardOrder: order,
    questGiverId: 'slug:pc-mira',
    factionId: 'slug:org-crescent-resistance',
    rewardsText: 'Coven trust and lunar insight',
    dmRewardsText: 'Syndicate retaliation clock starts',
    visibility: slug === 'quest-hidden-pact' ? 'DM_Only' : 'Party',
  };
  writePage(`quests/${slug}.md`, fm, `# ${title}\n\nQuest status: ${status}.`);
}

writePage(
  'quests/quest-find-idol/objective-recover-idol.md',
  {
    title: 'Recover the Idol',
    slug: 'objective-recover-idol',
    parentKey: 'slug:quest-find-idol',
    templateType: 'OBJECTIVE',
    objectiveStatus: 'ACTIVE',
    sortOrder: 1,
    summary: 'Locate the missing lunar idol',
  },
  'First objective of [[quest-find-idol]].',
);

const threads = [
  ['thread-hope-vs-despair', 'Hope vs Despair', 'promise', 'OPEN', 'major'],
  ['thread-city-secret', "The City's Secret", 'mystery', 'OPEN', 'critical'],
  ['thread-cost-of-power', 'The Cost of Power', 'foreshadowing', 'DORMANT', 'major'],
  ['thread-resolved-oath', 'Resolved Oath', 'promise', 'RESOLVED', 'minor'],
];

for (const [slug, title, kind, status, weight] of threads) {
  writePage(
    `threads/${slug}.md`,
    {
      title,
      slug,
      parentKey: 'skeleton:Game/Narrative Threads',
      threadKind: kind,
      threadStatus: status,
      narrativeWeight: weight,
      relatedPageIds: ['slug:quest-find-idol', 'slug:pc-hana'],
    },
    `# ${title}\n\nNarrative thread (${kind}, ${status}).`,
  );
}

writePage(
  'arcs/arc-moonfall.md',
  {
    title: 'Arc: Moonfall',
    slug: 'arc-moonfall',
    parentKey: 'skeleton:Game/Adventure',
    templateType: 'ARC',
    arcKind: 'campaign_arc',
    containedPageIds: [
      'slug:quest-find-idol',
      'slug:thread-hope-vs-despair',
      'slug:thread-city-secret',
    ],
  },
  '# Moonfall Arc\n\nUmbrella arc linking main quests and threads.',
);

writePage(
  'scenes/scene-rooftop-confession.md',
  {
    title: 'Rooftop Confession',
    slug: 'scene-rooftop-confession',
    parentKey: 'skeleton:Game/Adventure',
    templateType: 'SCENE',
    sceneStatus: 'PLAYED',
    linkedQuestPageIds: ['slug:quest-find-idol'],
    linkedThreadPageIds: ['slug:thread-hope-vs-despair'],
    participantPageIds: ['slug:pc-hana', 'slug:pc-ren'],
    locationPageId: 'slug:haven-school-rooftop',
  },
  'Scene on the rooftop haven tying quest and thread.',
);

const havens = [
  ['haven-school-rooftop', 'School Rooftop', 'prosperous', 'sanctuary'],
  ['haven-arcade-loft', 'Arcade Loft', 'strained', 'hideout'],
  ['haven-ashvale-apartment', 'Ashvale Apartment', 'threatened', 'residence'],
];

for (const [slug, title, status, type] of havens) {
  writePage(
    `downtime/${slug}.md`,
    {
      title,
      slug,
      parentKey: 'skeleton:Game/Downtime',
      templateType: 'DOWNTIME_HAVEN',
      havenFields: {
        havenType: type,
        status,
        scale: 'small',
        primaryTheme: 'arcane',
        discoveryState: 'known',
        locationPageId: 'slug:loc-shirogane-campus',
        crew: [{ name: 'Hana', pageId: 'slug:pc-hana', role: 'guardian' }],
        upgrades: [{ id: 'u1', label: 'Reinforced rail', tier: 1 }],
        threats:
          status === 'threatened'
            ? [{ id: 't1', label: 'Syndicate surveillance', severity: 'rising' }]
            : [],
      },
    },
    `# ${title}\n\nHaven (${status}).`,
  );
}

const projects = [
  ['project-repair-observatory', 'Repair the Observatory', 'ACTIVE', 'haven-arcade-loft'],
  ['project-relic-research', 'Research Ancient Relics', 'PAUSED', 'haven-school-rooftop'],
  ['project-community-trust', 'Build Community Trust', 'COMPLETED', 'haven-ashvale-apartment'],
];

for (const [slug, title, status, haven] of projects) {
  writePage(
    `downtime/${slug}.md`,
    {
      title,
      slug,
      parentKey: 'skeleton:Game/Downtime',
      templateType: 'DOWNTIME_PROJECT',
      projectFields: {
        projectType: 'operations',
        status,
        priority: 'high',
        progressPercent: status === 'COMPLETED' ? 100 : 35,
        havenPageId: `slug:${haven}`,
        ownerPageId: 'slug:pc-mira',
        blockers: status === 'PAUSED' ? [{ id: 'b1', label: 'Missing archive key' }] : [],
      },
    },
    `# ${title}\n\nProject status: ${status}.`,
  );
}

writePage(
  'bestiary/beast-moon-hound.md',
  {
    title: 'Moon Hound',
    slug: 'beast-moon-hound',
    parentKey: 'skeleton:World/Bestiary',
    entityCategory: 'bestiary',
    creatureType: 'corrupted spirit',
    threatLevel: 'High',
    habitat: 'Ruins',
    relatedLocationIds: ['slug:loc-ruined-observatory'],
  },
  'Corrupted spirit haunting [[loc-ruined-observatory]].',
);

writePage(
  'objects/obj-lunar-idol.md',
  {
    title: 'Lunar Idol',
    slug: 'obj-lunar-idol',
    parentKey: 'skeleton:World/Objects',
    entityCategory: 'objects',
    objectType: 'artifact',
    knownFor: 'Central quest macguffin',
    currentHolderId: 'slug:pc-hana',
  },
  'The missing idol from [[quest-find-idol]].',
);

writePage(
  'ancestries/anc-moon-touched.md',
  {
    title: 'Moon-Touched',
    slug: 'anc-moon-touched',
    parentKey: 'skeleton:World/Ancestries',
    entityCategory: 'ancestries',
    ancestryType: 'lineage',
    knownFor: 'Curse bearers',
  },
  'Ancestry tied to the moon curse.',
);

writePage(
  'events/event-founding-ritual.md',
  {
    title: 'The First Binding',
    slug: 'event-founding-ritual',
    parentKey: 'skeleton:Game/Events',
    entityCategory: 'events',
    visibility: 'Party',
  },
  'Ancient history — the first binding ritual.',
);

writePage(
  'events/event-recent-eclipse.md',
  {
    title: 'Recent Eclipse',
    slug: 'event-recent-eclipse',
    parentKey: 'skeleton:Game/Events',
    visibility: 'Party',
  },
  'Recent event the PCs witnessed.',
);

writePage(
  'events/event-future-convergence.md',
  {
    title: 'Future Convergence',
    slug: 'event-future-convergence',
    parentKey: 'skeleton:Game/Events',
    visibility: 'DM_Only',
  },
  'Foreshadowed future hook.',
);

writePage(
  'journals/journal-hana-private.md',
  {
    title: "Hana's Journal",
    slug: 'journal-hana-private',
    parentKey: 'skeleton:Game/Journals',
    entityCategory: 'journals',
    visibility: 'DM_Only',
  },
  "Hana's private fears about the corrupted form.",
);

writePage(
  'journals/journal-party-recap.md',
  {
    title: 'Party Recap — Last Session',
    slug: 'journal-party-recap',
    parentKey: 'skeleton:Game/Journals',
    entityCategory: 'journals',
    visibility: 'Party',
  },
  'The coven debriefed after the rooftop confession.',
);

writePage(
  'session-notes/session-zero.md',
  {
    title: 'Session Zero Notes',
    slug: 'session-zero',
    parentKey: 'skeleton:Player Session Notes',
    visibility: 'Party',
  },
  'Safety tools and lines established.',
);

writePage(
  'lore/lore-moon-curse.md',
  {
    title: 'The Moon Curse',
    slug: 'lore-moon-curse',
    parentKey: 'skeleton:Game/Journals',
    visibility: 'Party',
  },
  'Party-known lore about the curse.',
);

writePage(
  'lore/lore-directorate-secret.md',
  {
    title: 'Directorate Secret Files',
    slug: 'lore-directorate-secret',
    parentKey: 'skeleton:Game/Journals',
    visibility: 'DM_Only',
  },
  'Contradicts public lore — GM only.',
);

console.log(`Generated ${PACK_ROOT}`);
