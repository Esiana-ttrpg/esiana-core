import { pick, pickInt, chance } from './rng.js';
import { temporalFromClock, markdownBlock, wikiLinkSpan } from './seedPlan.js';
import { renderVoice, VOICES } from './voices/index.js';
import { appendSkeletonCoverageOps, SK } from './buildSkeletonCoverage.js';

const LOCATIONS = [
  'Blackwater Keep',
  'Ashford Crossing',
  'The Sunken Chapel',
  'Mirewatch',
  'Velis Hollow',
];
const FACTIONS = ['Silver Accord', 'Ashbound Covenant', 'The Pale Court', 'Free Companies'];
const NPCS = ['Velis', 'Commander Hale', 'Sister Morr', 'Old Tatch', 'The Ash King'];
const QUESTS = ['The Missing Convoy', 'Blood on the Reeds', 'A Crown of Embers', 'Silent Bells'];

function plainRef(label, rng, unresolvedRate) {
  if (chance(rng, unresolvedRate)) {
    return wikiLinkSpan(label + '?', `fac:${label.toLowerCase()}`, false);
  }
  return label;
}

/**
 * @param {object} ctx
 */
export function buildGenericSeedPlan(ctx) {
  const { clock, rng, dmUserId, playerUserIds, unresolvedRate, density } = ctx;
  /** @type {import('./seedPlan.js').SeedOp[]} */
  const ops = [];

  function pushCreate(key, title, parentKey, actorUserId, bodyMd, metadata = {}, templateType = 'DEFAULT', extra = {}) {
    ops.push({
      kind: 'createPage',
      clientKey: key,
      parentKey,
      title,
      metadata,
      blocks: [markdownBlock(bodyMd)],
      templateType,
      actorUserId,
      temporal: temporalFromClock(clock),
      ...extra,
    });
    clock.advanceHours(pickInt(rng, 1, 6));
  }

  clock.advanceDays(pickInt(rng, 14, 21));
  const locationCap = ctx.locationCountOverride ?? pickInt(rng, 3, 5);
  for (const loc of LOCATIONS.slice(0, locationCap)) {
    const key = `loc:${loc.toLowerCase().replace(/\s+/g, '-')}`;
    const ref = pick(rng, NPCS);
    const link = wikiLinkSpan(ref, `npc:${ref.toLowerCase().replace(/\s+/g, '-')}`, chance(rng, 1 - unresolvedRate));
    pushCreate(
      key,
      loc,
      SK.locations,
      dmUserId,
      `${renderVoice(VOICES.dm, loc, rng)}\n\nSee also ${link}.`,
      { entityCategory: 'locations' },
    );
    clock.advanceDays(pickInt(rng, 1, 3));
  }

  const factionCap = ctx.factionCountOverride ?? pickInt(rng, 2, 4);
  for (const fac of FACTIONS.slice(0, factionCap)) {
    const key = `fac:${fac.toLowerCase().replace(/\s+/g, '-')}`;
    pushCreate(
      key,
      fac,
      SK.organizations,
      dmUserId,
      `${renderVoice(VOICES.dm, fac, rng)} ${plainRef(fac, rng, unresolvedRate)}`,
      { entityCategory: 'organizations' },
    );
    clock.advanceDays(1);
  }

  const npcCap = ctx.npcCountOverride ?? pickInt(rng, 3, 5);
  for (const npc of NPCS.slice(0, npcCap)) {
    const key = `npc:${npc.toLowerCase().replace(/\s+/g, '-')}`;
    pushCreate(
      key,
      npc,
      SK.characters,
      dmUserId,
      renderVoice(VOICES.dm, npc, rng),
      { entityCategory: 'characters' },
    );
  }

  const sessionCount =
    ctx.sessionCountOverride ??
    (density === 'quiet' ? 4 : density === 'obsessive' ? 12 : 8);
  for (let s = 0; s < sessionCount; s += 1) {
    clock.advanceToNextBeat('session', density);
    const playerId = pick(rng, playerUserIds) ?? dmUserId;
    const voice = pick(rng, [VOICES.playerTerse, VOICES.playerJournal, VOICES.playerInventory]);
    const thing = pick(rng, [...LOCATIONS, ...QUESTS]);
    const key = `session:${s + 1}`;
    pushCreate(
      key,
      `Session ${s + 1} Notes`,
      SK.sessionNotes,
      playerId,
      renderVoice(voice, thing, rng),
      {},
      'SESSION_NOTE',
    );

    if (chance(rng, 0.6)) {
      const quest = pick(rng, QUESTS);
      pushCreate(
        `quest:${s}-${quest.slice(0, 8).toLowerCase()}`,
        quest,
        SK.quests,
        dmUserId,
        `Status update: ${renderVoice(VOICES.playerTerse, quest, rng)}`,
        { entityCategory: 'quests', questStatus: pick(rng, ['ACTIVE', 'ACTIVE', 'COMPLETED']) },
      );
    }

    if (density === 'obsessive') {
      clock.advanceToNextBeat('obsessive', density);
    }
  }

  clock.advanceToNextBeat('lull', density);
  const typoTarget = pick(rng, LOCATIONS);
  pushCreate(
    'stub:typo-link',
    'Unfinished Leads',
    SK.journals,
    pick(rng, playerUserIds) ?? dmUserId,
    `Someone mentioned ${wikiLinkSpan(typoTarget + 'x', `loc:${typoTarget.toLowerCase().replace(/\s+/g, '-')}`, false)}.`,
    { entityCategory: 'journals' },
  );

  pushCreate(
    'stub:abandoned',
    'Abandoned Hook',
    SK.journals,
    dmUserId,
    'TODO: flesh out the Silver Accord angle.',
    { entityCategory: 'journals' },
  );

  appendSkeletonCoverageOps(ctx, ops, { flavor: 'west-marches' });

  return { ops, seed: ctx.seedString, density };
}
