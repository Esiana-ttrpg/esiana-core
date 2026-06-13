import { temporalFromClock, markdownBlock, type SeedOp } from './seedPlan.js';
import { slugifyTitle } from './proceduralNames.js';
import type { SimulationClock } from './simulationClock.js';

const PLACEHOLDER_MAP_BLOCK = {
  type: 'image-display',
  content: {
    alt: 'Benchmark map placeholder',
    caption: 'Generated benchmark map stub',
  },
};

export function buildBenchmarkFillerOps(input: {
  clock: SimulationClock;
  rng: () => number;
  dmUserId: string;
  count: number;
  parentKey: string;
  keyPrefix: string;
}): SeedOp[] {
  const { clock, rng, dmUserId, count, parentKey, keyPrefix } = input;
  if (count <= 0) return [];

  const ops: SeedOp[] = [];
  for (let i = 0; i < count; i += 1) {
    const title = `Lore Fragment ${i + 1}`;
    const key = `${keyPrefix}:${i + 1}`;
    const linkTarget = `${keyPrefix}:${((i + 3) % Math.max(count, 1)) + 1}`;
    ops.push({
      kind: 'createPage',
      clientKey: key,
      parentKey,
      title,
      metadata: { entityCategory: 'journals', benchmarkFiller: true },
      blocks: [
        markdownBlock(
          `Archive note ${i + 1}. Cross-reference [[Lore Fragment ${((i + 5) % count) + 1}|${linkTarget}]].`,
        ),
      ],
      templateType: 'DEFAULT',
      actorUserId: dmUserId,
      temporal: temporalFromClock(clock),
    });
    clock.advanceHours(1 + (i % 4));
  }
  return ops;
}

export function buildBenchmarkMapOps(input: {
  clock: SimulationClock;
  count: number;
  dmUserId: string;
  mapsParentKey: string;
}): SeedOp[] {
  const { clock, count, dmUserId, mapsParentKey } = input;
  if (count <= 0) return [];

  const ops: SeedOp[] = [];
  for (let i = 0; i < count; i += 1) {
    const title = `Benchmark Map ${i + 1}`;
    const key = `map:benchmark-${i + 1}`;
    ops.push({
      kind: 'createPage',
      clientKey: key,
      parentKey: mapsParentKey,
      title,
      metadata: { entityCategory: 'maps', benchmarkMap: true },
      blocks: [markdownBlock(`Regional chart ${i + 1}.`), PLACEHOLDER_MAP_BLOCK],
      templateType: 'DEFAULT',
      actorUserId: dmUserId,
      temporal: temporalFromClock(clock),
    });
    clock.advanceHours(2);
  }
  return ops;
}

export function estimateSkeletonPageCount(): number {
  return 18;
}

export function computeFillerPageCount(profile: {
  pageCount: number;
  locationCount: number;
  organizationCount: number;
  characterCount: number;
  sessionCount: number;
  mapCount: number;
}): number {
  const structured =
    profile.locationCount +
    profile.organizationCount +
    profile.characterCount +
    profile.sessionCount +
    profile.mapCount +
    estimateSkeletonPageCount();
  return Math.max(0, profile.pageCount - structured);
}

export { slugifyTitle };
