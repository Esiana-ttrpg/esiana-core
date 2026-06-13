import type { Prisma, PrismaClient } from '@prisma/client';
import { prisma } from './prisma.js';

type Millis = number;

type CacheEntry<T> = {
  value: T;
  lastAccessMs: Millis;
};

/**
 * Bounded LRU + TTL cache.
 *
 * Security/robustness goals:
 * - Never allow unbounded growth (maxEntries).
 * - Evict entries that haven't been accessed for ttlMs.
 * - Provide deterministic LRU eviction when over capacity.
 */
class BoundedLruTtlCache<K, V> {
  private readonly maxEntries: number;
  private readonly ttlMs: Millis;
  private readonly entries: Map<K, CacheEntry<V>>;

  constructor(opts: { maxEntries: number; ttlMs: Millis }) {
    if (!Number.isFinite(opts.maxEntries) || opts.maxEntries <= 0) {
      throw new Error('BoundedLruTtlCache: maxEntries must be a positive integer');
    }
    if (!Number.isFinite(opts.ttlMs) || opts.ttlMs <= 0) {
      throw new Error('BoundedLruTtlCache: ttlMs must be a positive integer');
    }
    this.maxEntries = Math.floor(opts.maxEntries);
    this.ttlMs = Math.floor(opts.ttlMs);
    this.entries = new Map();
  }

  get(key: K, nowMs = Date.now()): V | undefined {
    const entry = this.entries.get(key);
    if (!entry) return undefined;

    if (nowMs - entry.lastAccessMs > this.ttlMs) {
      this.entries.delete(key);
      return undefined;
    }

    // LRU touch: move to most-recent position.
    entry.lastAccessMs = nowMs;
    this.entries.delete(key);
    this.entries.set(key, entry);
    return entry.value;
  }

  getOrCreate(key: K, factory: () => V, nowMs = Date.now()): V {
    const cached = this.get(key, nowMs);
    if (cached !== undefined) return cached;

    const created = factory();
    this.entries.set(key, { value: created, lastAccessMs: nowMs });
    this.evictOverflow();
    return created;
  }

  sweepExpired(nowMs = Date.now()): number {
    let removed = 0;
    for (const [key, entry] of this.entries) {
      if (nowMs - entry.lastAccessMs > this.ttlMs) {
        this.entries.delete(key);
        removed++;
      }
    }
    return removed;
  }

  size(): number {
    return this.entries.size;
  }

  private evictOverflow(): void {
    while (this.entries.size > this.maxEntries) {
      // Map iteration order is insertion order; oldest is first => LRU eviction.
      const oldestKey = this.entries.keys().next().value as K | undefined;
      if (oldestKey === undefined) return;
      this.entries.delete(oldestKey);
    }
  }
}

const MAX_CACHED_CAMPAIGN_CLIENTS = 200;
const IDLE_TTL_MS = 60 * 60 * 1000; // 60 minutes
const SWEEP_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes

const campaignClientCache = new BoundedLruTtlCache<string, PrismaClient>({
  maxEntries: MAX_CACHED_CAMPAIGN_CLIENTS,
  ttlMs: IDLE_TTL_MS,
});

let sweepTimerStarted = false;
function ensureSweepTimer(): void {
  if (sweepTimerStarted) return;
  sweepTimerStarted = true;

  const timer = setInterval(() => {
    campaignClientCache.sweepExpired();
  }, SWEEP_INTERVAL_MS);

  // Don't keep the Node process alive solely due to this interval.
  (timer as any)?.unref?.();
}

function assertSafeCampaignId(campaignId: string): void {
  if (typeof campaignId !== 'string' || !campaignId.trim()) {
    throw new Error('getCampaignPrisma: campaignId must be a non-empty string');
  }
  // Intentionally do not validate exact format here (cuid/uuid) to avoid
  // accidental mismatches during migrations; emptiness is the critical guard.
}

function isObject(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function addCampaignIdToWhere(
  where: unknown,
  campaignId: string,
): Record<string, unknown> {
  const whereObj = isObject(where) ? { ...where } : {};
  const existing = whereObj.campaignId;

  if (existing === undefined) {
    whereObj.campaignId = campaignId;
    return whereObj;
  }

  if (typeof existing === 'string' && existing === campaignId) {
    return whereObj;
  }

  throw new Error(
    'Cross-campaign query rejected: conflicting campaignId in where clause',
  );
}

/**
 * Models that are campaign-scoped (i.e. must always be isolated by campaignId).
 *
 * NOTE: These names must match Prisma model delegate names on the client.
 * We keep this explicit to avoid accidental scoping of global/system models.
 */
const CAMPAIGN_SCOPED_MODELS = [
  'wikiPage',
  'noteBookArc',
  'campaignSessionTimeline',
  'asset',
  'fantasyCalendar',
  'pageShortcut',
  'playerSandboxNote',
  'dashboardWidget',
  'tag',
  'campaignActivity',
  'campaignJoinRequest',
  'campaignPluginSetting',
  'downtimeProject',
  'downtimeHaven',
  'campaignLedger',
  'campaignLedgerEntry',
  'campaignLedgerSuggestion',
  'campaignScheduledEffect',
  'campaignScheduledEffectOccurrence',
  'campaignReputation',
  'campaignReputationEvent',
  'campaignReputationSuggestion',
  'campaignMomentum',
  'campaignWorldEventSuggestion',
  'narrativeLifecycleState',
  'pageNarrativeStatus',
  'narrativeBranchState',
  'narrativeConsequenceReceipt',
  'narrativeEvent',
  'narrativeStateSnapshot',
  'timeAdvanceSimulationRun',
  'worldAdvanceReceipt',
  'entityRelation',
  'loreInterpretationGroup',
  'loreInterpretationAccount',
  'loreClaim',
  'rumorCirculation',
  'contentPresenceState',
  'mapLayer',
  'mapObjectGroup',
  'mapSceneObject',
  'mapPresentationPreset',
  'entityHistoricalAlias',
  'unresolvedWikilink',
  'pluginData',
] as const;

type CampaignScopedModel = (typeof CAMPAIGN_SCOPED_MODELS)[number];

/**
 * Returns a Prisma client that is row-level scoped to a single campaign.
 *
 * Architectural constraints:
 * - The extension hooks are pure: they close only over the initial campaignId.
 * - No request objects, no mutable per-request closures, no dynamic interception.
 */
export function getCampaignPrisma(campaignId: string): PrismaClient {
  assertSafeCampaignId(campaignId);
  ensureSweepTimer();

  return campaignClientCache.getOrCreate(campaignId, () => {
    const scopedCampaignId = campaignId.trim();

    const scoped = prisma.$extends({
      name: 'campaignScope',
      query: Object.fromEntries(
        CAMPAIGN_SCOPED_MODELS.map((modelName) => [
          modelName,
          {
            async findMany({ args, query }: { args: any; query: any }) {
              const nextArgs = { ...args, where: addCampaignIdToWhere(args?.where, scopedCampaignId) };
              return query(nextArgs);
            },
            async findFirst({ args, query }: { args: any; query: any }) {
              const nextArgs = { ...args, where: addCampaignIdToWhere(args?.where, scopedCampaignId) };
              return query(nextArgs);
            },
            async updateMany({ args, query }: { args: any; query: any }) {
              const nextArgs = { ...args, where: addCampaignIdToWhere(args?.where, scopedCampaignId) };
              return query(nextArgs);
            },
            async deleteMany({ args, query }: { args: any; query: any }) {
              const nextArgs = { ...args, where: addCampaignIdToWhere(args?.where, scopedCampaignId) };
              return query(nextArgs);
            },

            // These operations are the most IDOR-prone when developers use only `{ id }`.
            // We enforce that campaignId is present (or explicitly compatible) rather than
            // trying to "inject" into unique where shapes (which can break findUnique/update/delete).
            async findUnique({ args, query }: { args: any; query: any }) {
              if (!isObject(args?.where) || args.where.campaignId === undefined) {
                throw new Error(
                  'Unsafe findUnique blocked: include campaignId in where (or use findFirst/findMany with campaign scoping).',
                );
              }
              const nextArgs = { ...args, where: addCampaignIdToWhere(args.where, scopedCampaignId) };
              return query(nextArgs);
            },
            async update({ args, query }: { args: any; query: any }) {
              if (!isObject(args?.where) || args.where.campaignId === undefined) {
                throw new Error(
                  'Unsafe update blocked: include campaignId in where (or use updateMany with campaign scoping).',
                );
              }
              const nextArgs = { ...args, where: addCampaignIdToWhere(args.where, scopedCampaignId) };
              return query(nextArgs);
            },
            async delete({ args, query }: { args: any; query: any }) {
              if (!isObject(args?.where) || args.where.campaignId === undefined) {
                throw new Error(
                  'Unsafe delete blocked: include campaignId in where (or use deleteMany with campaign scoping).',
                );
              }
              const nextArgs = { ...args, where: addCampaignIdToWhere(args.where, scopedCampaignId) };
              return query(nextArgs);
            },
          },
        ]),
      ) as Record<CampaignScopedModel, any>,
    }) as unknown as PrismaClient;

    return scoped;
  });
}

export type { Prisma };

