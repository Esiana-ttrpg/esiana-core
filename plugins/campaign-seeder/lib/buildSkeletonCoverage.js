import { temporalFromClock, markdownBlock } from './seedPlan.js';

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
  'west-marches': {
    bestiary: [{ key: 'beast:mire-stalker', title: 'Mire Stalker', body: 'Ambush predator near [[Blackwater Keep]].' }],
    ancestries: [{ key: 'anc:river-folk', title: 'River Folk', body: 'Marsh-dwellers tied to [[Mirewatch]].' }],
    objects: [{ key: 'obj:accord-seal', title: 'Silver Accord Seal', body: 'Proof of charter membership.' }],
    families: [{ key: 'fam:hale-line', title: 'Hale Line', body: '[[Commander Hale]] leads this house.' }],
    rules: [{ key: 'rule:west-marches', title: 'West Marches Charter', body: 'Players drive the map; DMs react.' }],
    journals: [{ key: 'journal:scout-log', title: 'Scout Log Fragment', body: 'Heard drums near [[Velis Hollow]].' }],
    tagName: 'west-marches',
    pcs: [
      { key: 'pc:1', title: 'Kira Ashford', body: 'Scout and cartographer.' },
      { key: 'pc:2', title: 'Dorn Velis', body: 'Mercenary with a soft spot for lost causes.' },
      { key: 'pc:3', title: 'Sister Mira', body: 'Field medic of the Silver Accord.' },
      { key: 'pc:creator', title: 'Your Character', body: 'Replace with your PC sheet.' },
    ],
  },
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

function flavorKey(presetId, scenarioFlavor) {
  if (scenarioFlavor) return scenarioFlavor;
  if (presetId === 'west-marches') return 'west-marches';
  if (presetId === 'tomb-of-horrors-demo') return 'tomb-demo';
  if (presetId === 'player-experience-demo') return 'player-demo';
  return 'west-marches';
}

/**
 * @param {object} ctx
 * @param {import('./seedPlan.js').SeedOp[]} ops
 * @param {{ flavor?: string }} [options]
 */
export function appendSkeletonCoverageOps(ctx, ops, options = {}) {
  const { clock, dmUserId, presetId } = ctx;
  const content = FLAVOR_CONTENT[flavorKey(presetId, options.flavor)];
  if (!content) return;

  const existingKeys = new Set(ops.map((op) => op.clientKey).filter(Boolean));

  function pushPage({
    key,
    title,
    parentKey,
    body,
    metadata = {},
    tags,
    visibility = 'Party',
    actorUserId = dmUserId,
  }) {
    if (existingKeys.has(key)) return;
    existingKeys.add(key);
    ops.push({
      kind: 'createPage',
      clientKey: key,
      parentKey,
      title,
      metadata,
      blocks: [markdownBlock(body)],
      templateType: 'DEFAULT',
      actorUserId,
      temporal: temporalFromClock(clock),
      ...(tags?.length ? { tags } : {}),
      ...(visibility !== 'Party' ? { visibility } : {}),
    });
    clock.advanceHours(1);
  }

  for (const entry of content.bestiary ?? []) {
    pushPage({
      ...entry,
      parentKey: SK.bestiary,
      metadata: { entityCategory: 'bestiary', creatureType: 'Monstrosity', threatLevel: 'Moderate' },
    });
  }
  for (const entry of content.ancestries ?? []) {
    pushPage({
      ...entry,
      parentKey: SK.ancestries,
      metadata: { entityCategory: 'ancestries' },
    });
  }
  for (const entry of content.objects ?? []) {
    pushPage({
      ...entry,
      parentKey: SK.objects,
      metadata: { entityCategory: 'objects' },
    });
  }
  for (const entry of content.families ?? []) {
    pushPage({
      ...entry,
      parentKey: SK.families,
      metadata: { entityCategory: 'families' },
    });
  }
  for (const entry of content.rules ?? []) {
    pushPage({
      ...entry,
      parentKey: SK.rules,
      metadata: { entityCategory: 'rules-resources' },
    });
  }
  for (const entry of content.journals ?? []) {
    pushPage({
      ...entry,
      parentKey: SK.journals,
      metadata: { entityCategory: 'journals' },
    });
  }
  for (const entry of content.pcs ?? []) {
    pushPage({
      ...entry,
      parentKey: SK.party,
      metadata: { entityCategory: 'characters' },
    });
  }

  const tagName = content.tagName ?? 'demo';
  pushPage({
    key: 'tagged:lore-stub',
    title: 'Tagged Lore Stub',
    parentKey: SK.tags,
    body: `Cross-reference tagged with #${tagName}.`,
    tags: [{ name: tagName }, { name: 'lore' }],
  });

  if (ctx.enableDemoUsers && ctx.campaignSlug) {
    const password = 'esiana-demo-seed';
    pushPage({
      key: 'demo:credentials',
      title: 'Demo Login Credentials',
      parentKey: 'skeleton:Dashboard',
      body: [
        'Seeded demo accounts (requires `ENABLE_DEMO_USERS=true` on the server):',
        '',
        `- DM: \`${ctx.campaignSlug}-dm@seed.esiana.local\` / \`${password}\``,
        `- Player 1: \`${ctx.campaignSlug}-player-1@seed.esiana.local\` / \`${password}\``,
        `- Player 2: \`${ctx.campaignSlug}-player-2@seed.esiana.local\` / \`${password}\``,
        `- Player 3: \`${ctx.campaignSlug}-player-3@seed.esiana.local\` / \`${password}\``,
      ].join('\n'),
    });
  }
}

export { SK };
