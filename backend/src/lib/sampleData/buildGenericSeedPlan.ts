import { pick, pickInt, chance } from './rng.js';
import { temporalFromClock, markdownBlock, wikiLinkSpan, type SeedOp } from './seedPlan.js';
import { renderVoice, VOICES } from './voices/index.js';
import { appendSkeletonCoverageOps, SK } from './buildSkeletonCoverage.js';
import {
  buildBenchmarkFillerOps,
  buildBenchmarkMapOps,
  computeFillerPageCount,
} from './buildBenchmarkFillerOps.js';
import {
  proceduralFactionName,
  proceduralLocationName,
  proceduralNpcName,
  proceduralQuestTitle,
  slugifyTitle,
} from './proceduralNames.js';
import type { SimulationClock } from './simulationClock.js';
import type { SimulationDensity } from './simulationClock.js';

export interface GenericSeedPlanContext {
  clock: SimulationClock;
  rng: () => number;
  dmUserId: string;
  playerUserIds: string[];
  unresolvedRate: number;
  density: SimulationDensity;
  seedString: string;
  sessionCountOverride?: number;
  locationCountOverride?: number;
  factionCountOverride?: number;
  npcCountOverride?: number;
  pageCountOverride?: number;
  mapCountOverride?: number;
  enableDemoUsers?: boolean;
  campaignSlug?: string;
  skeletonFlavor?: string;
}

export function buildGenericSeedPlan(ctx: GenericSeedPlanContext): {
  ops: SeedOp[];
  seed: string;
  density: SimulationDensity;
} {
  const { clock, rng, dmUserId, playerUserIds, unresolvedRate, density } = ctx;
  const ops: SeedOp[] = [];

  function pushCreate(
    key: string,
    title: string,
    parentKey: string,
    actorUserId: string,
    bodyMd: string,
    metadata: Record<string, unknown> = {},
    templateType = 'DEFAULT',
    extra: Partial<SeedOp> = {},
  ): void {
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
    } as SeedOp);
    clock.advanceHours(pickInt(rng, 1, 6));
  }

  clock.advanceDays(pickInt(rng, 14, 21));
  const locationCap = ctx.locationCountOverride ?? pickInt(rng, 3, 5);
  for (let i = 0; i < locationCap; i += 1) {
    const loc = proceduralLocationName(rng, i);
    const key = `loc:${slugifyTitle(loc)}`;
    const refIndex = pickInt(rng, 0, Math.max((ctx.npcCountOverride ?? 5) - 1, 0));
    const ref = proceduralNpcName(rng, refIndex);
    const refKey = `npc:${slugifyTitle(ref)}`;
    const link = wikiLinkSpan(ref, refKey, chance(rng, 1 - unresolvedRate));
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
  for (let i = 0; i < factionCap; i += 1) {
    const fac = proceduralFactionName(rng, i);
    const key = `fac:${slugifyTitle(fac)}`;
    pushCreate(
      key,
      fac,
      SK.organizations,
      dmUserId,
      `${renderVoice(VOICES.dm, fac, rng)} ${fac}`,
      { entityCategory: 'organizations' },
    );
    clock.advanceDays(1);
  }

  const npcCap = ctx.npcCountOverride ?? pickInt(rng, 3, 5);
  for (let i = 0; i < npcCap; i += 1) {
    const npc = proceduralNpcName(rng, i);
    const key = `npc:${slugifyTitle(npc)}`;
    pushCreate(key, npc, SK.characters, dmUserId, renderVoice(VOICES.dm, npc, rng), {
      entityCategory: 'characters',
    });
  }

  const sessionCount =
    ctx.sessionCountOverride ??
    (density === 'quiet' ? 4 : density === 'obsessive' ? 12 : 8);
  for (let s = 0; s < sessionCount; s += 1) {
    clock.advanceToNextBeat('session', density);
    const playerId = pick(rng, playerUserIds) ?? dmUserId;
    const voice = pick(rng, [VOICES.playerTerse, VOICES.playerJournal, VOICES.playerInventory]);
    const thing = proceduralLocationName(rng, s);
    const key = `session:${s + 1}`;
    pushCreate(
      key,
      `Session ${s + 1} Notes`,
      SK.sessionNotes,
      playerId,
      renderVoice(voice ?? VOICES.playerTerse, thing, rng),
      {},
      'SESSION_NOTE',
    );

    if (chance(rng, 0.6)) {
      const quest = proceduralQuestTitle(rng, s);
      pushCreate(
        `quest:${s}-${slugifyTitle(quest).slice(0, 12)}`,
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
  const typoTarget = proceduralLocationName(rng, 0);
  pushCreate(
    'stub:typo-link',
    'Unfinished Leads',
    SK.journals,
    pick(rng, playerUserIds) ?? dmUserId,
    `Someone mentioned ${wikiLinkSpan(`${typoTarget}x`, `loc:${slugifyTitle(typoTarget)}`, false)}.`,
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

  appendSkeletonCoverageOps(ctx, ops, { flavor: ctx.skeletonFlavor ?? 'standard' });

  const mapCount = ctx.mapCountOverride ?? 0;
  if (mapCount > 0) {
    ops.push(
      ...buildBenchmarkMapOps({
        clock,
        count: mapCount,
        dmUserId,
        mapsParentKey: SK.maps,
      }),
    );
  }

  if (ctx.pageCountOverride != null && ctx.pageCountOverride > 0) {
    const fillerCount = computeFillerPageCount({
      pageCount: ctx.pageCountOverride,
      locationCount: locationCap,
      organizationCount: factionCap,
      characterCount: npcCap,
      sessionCount,
      mapCount,
    });
    ops.push(
      ...buildBenchmarkFillerOps({
        clock,
        rng,
        dmUserId,
        count: fillerCount,
        parentKey: SK.journals,
        keyPrefix: 'filler:lore',
      }),
    );
  }

  return { ops, seed: ctx.seedString, density };
}
