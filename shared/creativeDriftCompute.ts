/**
 * Pure Layer 3 creative drift heuristics (composes threadSignals + lifecycle inputs).
 */
import {
  computeCoolingBand,
  computeCoolingScore,
  COOLING_RECENT_DAYS,
  REAWAKENED_DAYS_WINDOW,
  sortDriftFindings,
  type CreativeDriftActiveBucket,
  type CreativeDriftBucketPayload,
  type CreativeDriftDispositionMap,
  type CreativeDriftFinding,
  type CreativeDriftReawakenedItem,
  type CreativeDriftScanResult,
  type CreativeDriftSummary,
  CREATIVE_DRIFT_ACTIVE_BUCKETS,
  CREATIVE_DRIFT_BUCKET_UI_LABELS,
  CREATIVE_DRIFT_VERSION,
  COOLING_BAND_UI_LABELS,
  isDispositionSnoozedHidden,
} from './creativeDrift.js';
import { driftFingerprint } from './creativeDriftFingerprint.js';
import type { NarrativeLifecycleState } from './narrativeLifecycle.js';
import { NarrativeLifecycleStates } from './narrativeLifecycle.js';
import type { BranchNodeKind } from './narrativeBranch.js';
import { BranchNodeKinds } from './narrativeBranch.js';
import { computeThreadSignals, THREAD_STALE_DAYS_THRESHOLD } from './threadSignals.js';
import type { ThreadKind, ThreadStatus, ThreadNarrativeWeight } from './threadMetadata.js';
import type { EmotionalResidueKind } from './threadMetadata.js';

const MS_PER_DAY = 24 * 60 * 60 * 1000;

export type DriftThreadScanRow = {
  id: string;
  title: string;
  updatedAt: Date;
  threadKind: ThreadKind;
  threadStatus: ThreadStatus;
  narrativeWeight: ThreadNarrativeWeight;
  relatedPageIds: string[];
  introducedSessionId: string | null;
  lastAdvancedSessionId: string | null;
  payoffPageId: string | null;
  playerSubmitted: boolean;
  emotionalResidueKind: EmotionalResidueKind | null;
  lifecycleState: NarrativeLifecycleState;
  isAuthored: boolean;
};

export type DriftQuestScanRow = {
  id: string;
  title: string;
  updatedAt: Date;
  lifecycleState: NarrativeLifecycleState;
  lastActivityAt: Date | null;
};

export type DriftEntityScanRow = {
  id: string;
  title: string;
  templateCategory: string | null;
  updatedAt: Date;
  lastActivityAt: Date | null;
  inboundNarrativeEdgeCount: number;
  linkedByLivingNarrative: boolean;
  introWeight: ThreadNarrativeWeight | null;
};

export type DriftBranchScanRow = {
  subjectId: string;
  subjectTitle: string;
  nodeId: string;
  nodeLabel: string;
  nodeKind: BranchNodeKind;
  narrativeWeight: ThreadNarrativeWeight;
  updatedAt: Date;
};

export type CreativeDriftComputeInput = {
  now?: Date;
  threads: DriftThreadScanRow[];
  quests: DriftQuestScanRow[];
  entities: DriftEntityScanRow[];
  branches: DriftBranchScanRow[];
  dispositions?: CreativeDriftDispositionMap;
};

function daysSince(date: Date, now: Date): number {
  return Math.max(0, (now.getTime() - date.getTime()) / MS_PER_DAY);
}

function lastReferencedAt(
  updatedAt: Date,
  lastActivityAt: Date | null,
): Date {
  if (lastActivityAt && lastActivityAt > updatedAt) return lastActivityAt;
  return updatedAt;
}

function buildFindingBase(input: {
  bucket: CreativeDriftActiveBucket;
  subjectKind: CreativeDriftFinding['subjectKind'];
  subjectId: string;
  title: string;
  statusLabel: string;
  referenceDate: Date;
  now: Date;
  narrativeWeight: ThreadNarrativeWeight;
  introducedSessionId?: string | null;
  linkedEntityIds?: string[];
  suffix?: string;
}): CreativeDriftFinding {
  const days = daysSince(input.referenceDate, input.now);
  const band = computeCoolingBand(days);
  return {
    fingerprint: driftFingerprint(
      input.bucket,
      input.subjectKind,
      input.subjectId,
      input.suffix,
    ),
    bucket: input.bucket,
    subjectKind: input.subjectKind,
    subjectId: input.subjectId,
    title: input.title,
    statusLabel: input.statusLabel,
    coolingBand: band,
    reactivationState: 'none',
    narrativeWeight: input.narrativeWeight,
    lastReferencedAt: input.referenceDate.toISOString(),
    introducedSessionId: input.introducedSessionId ?? null,
    linkedEntityIds: input.linkedEntityIds ?? [],
    _sortKey: computeCoolingScore(days, input.narrativeWeight),
  };
}

function entityStatusLabel(category: string | null): string {
  const cat = (category ?? '').toLowerCase();
  if (cat.includes('character')) return 'Dormant figure';
  if (cat.includes('organization') || cat.includes('faction')) return 'Dormant faction';
  if (cat.includes('location')) return 'Dormant presence';
  return 'Lingering presence';
}

function isLivingLifecycle(state: NarrativeLifecycleState): boolean {
  return (
    state === NarrativeLifecycleStates.ACTIVE ||
    state === NarrativeLifecycleStates.DISCOVERED
  );
}

export function detectReawakenedThreads(
  threads: DriftThreadScanRow[],
  now: Date,
): CreativeDriftReawakenedItem[] {
  const items: CreativeDriftReawakenedItem[] = [];
  for (const row of threads) {
    if (!row.isAuthored || !row.lastAdvancedSessionId) continue;
    const daysSinceUpdate = daysSince(row.updatedAt, now);
    if (daysSinceUpdate > REAWAKENED_DAYS_WINDOW) continue;

    const advancedBeyondIntro =
      row.introducedSessionId &&
      row.lastAdvancedSessionId !== row.introducedSessionId;
    const wasCooling =
      row.threadStatus === 'DORMANT' ||
      computeThreadSignals({
        threadKind: row.threadKind,
        threadStatus: row.threadStatus,
        payoffPageId: row.payoffPageId,
        playerSubmitted: row.playerSubmitted,
        updatedAt: new Date(
          row.updatedAt.getTime() - REAWAKENED_DAYS_WINDOW * MS_PER_DAY,
        ),
        lastAdvancedSessionId: null,
      }).includes('stale');

    if (!advancedBeyondIntro && !wasCooling) continue;

    const sessionGap =
      row.introducedSessionId && row.lastAdvancedSessionId
        ? 'Back in recent play'
        : 'Recently returned';

    items.push({
      fingerprint: driftFingerprint('reawakened', 'open_thread', row.id),
      subjectKind: 'open_thread',
      subjectId: row.id,
      title: row.title,
      reactivationCopy: sessionGap,
      lastReferencedAt: row.updatedAt.toISOString(),
      linkedEntityIds: row.relatedPageIds,
    });
  }
  return items;
}

export function detectReawakenedEntities(
  entities: DriftEntityScanRow[],
  reawakenedThreads: DriftThreadScanRow[],
  now: Date,
): CreativeDriftReawakenedItem[] {
  const hotThreadIds = new Set(
    reawakenedThreads
      .filter((t) => daysSince(t.updatedAt, now) <= REAWAKENED_DAYS_WINDOW)
      .map((t) => t.id),
  );
  if (hotThreadIds.size === 0) return [];

  const linkedEntityIds = new Set<string>();
  for (const thread of reawakenedThreads) {
    if (!hotThreadIds.has(thread.id)) continue;
    for (const id of thread.relatedPageIds) linkedEntityIds.add(id);
  }

  const items: CreativeDriftReawakenedItem[] = [];
  for (const entity of entities) {
    if (!linkedEntityIds.has(entity.id)) continue;
    if (entity.linkedByLivingNarrative) continue;
    const daysSinceActivity = daysSince(
      lastReferencedAt(entity.updatedAt, entity.lastActivityAt),
      now,
    );
    if (daysSinceActivity > THREAD_STALE_DAYS_THRESHOLD) {
      items.push({
        fingerprint: driftFingerprint('reawakened', 'wiki_page', entity.id),
        subjectKind: 'wiki_page',
        subjectId: entity.id,
        title: entity.title,
        reactivationCopy: 'Recently returned',
        lastReferencedAt: entity.updatedAt.toISOString(),
        linkedEntityIds: [],
      });
    }
  }
  return items;
}

export function computeDormantPlotlineFindings(
  input: CreativeDriftComputeInput,
  now: Date,
): CreativeDriftFinding[] {
  const findings: CreativeDriftFinding[] = [];
  const questStagnantDays = THREAD_STALE_DAYS_THRESHOLD;

  for (const row of input.threads) {
    if (!row.isAuthored || !isLivingLifecycle(row.lifecycleState)) continue;

    let include = false;
    let statusLabel = 'Dormant plotline';

    if (row.threadStatus === 'DORMANT') {
      include = true;
      statusLabel = 'Dormant plotline';
    } else {
      const signals = computeThreadSignals({
        threadKind: row.threadKind,
        threadStatus: row.threadStatus,
        payoffPageId: row.payoffPageId,
        playerSubmitted: row.playerSubmitted,
        updatedAt: row.updatedAt,
        lastAdvancedSessionId: row.lastAdvancedSessionId,
      });
      if (signals.includes('stale')) {
        include = true;
        statusLabel = 'Quiet plotline';
      }
    }

    if (!include) continue;

    findings.push(
      buildFindingBase({
        bucket: 'dormant_plotlines',
        subjectKind: 'open_thread',
        subjectId: row.id,
        title: row.title,
        statusLabel,
        referenceDate: row.updatedAt,
        now,
        narrativeWeight: row.narrativeWeight,
        introducedSessionId: row.introducedSessionId,
        linkedEntityIds: row.relatedPageIds,
      }),
    );
  }

  for (const row of input.quests) {
    if (!isLivingLifecycle(row.lifecycleState)) continue;
    const ref = lastReferencedAt(row.updatedAt, row.lastActivityAt);
    const days = daysSince(ref, now);
    if (days < questStagnantDays) continue;
    findings.push(
      buildFindingBase({
        bucket: 'dormant_plotlines',
        subjectKind: 'quest',
        subjectId: row.id,
        title: row.title,
        statusLabel: 'Quiet plotline',
        referenceDate: ref,
        now,
        narrativeWeight: 'major',
      }),
    );
  }

  for (const row of input.branches) {
    if (
      row.nodeKind !== BranchNodeKinds.HIDDEN &&
      row.nodeKind !== BranchNodeKinds.FAILURE
    ) {
      continue;
    }
    findings.push(
      buildFindingBase({
        bucket: 'dormant_plotlines',
        subjectKind: 'branch_node',
        subjectId: row.subjectId,
        title: `${row.subjectTitle} — ${row.nodeLabel}`,
        statusLabel: 'Quiet branch',
        referenceDate: row.updatedAt,
        now,
        narrativeWeight: row.narrativeWeight,
        suffix: row.nodeId,
      }),
    );
  }

  return findings;
}

export function computeCoolingEntityFindings(
  input: CreativeDriftComputeInput,
  now: Date,
): CreativeDriftFinding[] {
  const findings: CreativeDriftFinding[] = [];

  for (const row of input.entities) {
    if (row.linkedByLivingNarrative) continue;
    const weight = row.introWeight ?? 'major';
    if (weight === 'minor' && row.inboundNarrativeEdgeCount === 0) continue;

    const ref = lastReferencedAt(row.updatedAt, row.lastActivityAt);
    const days = daysSince(ref, now);
    if (days < COOLING_RECENT_DAYS && row.inboundNarrativeEdgeCount > 0) continue;

    const hasWeightSignal =
      weight === 'major' ||
      weight === 'critical' ||
      row.inboundNarrativeEdgeCount > 0;
    if (!hasWeightSignal) continue;

    findings.push(
      buildFindingBase({
        bucket: 'unused_entities',
        subjectKind: 'wiki_page',
        subjectId: row.id,
        title: row.title,
        statusLabel: entityStatusLabel(row.templateCategory),
        referenceDate: ref,
        now,
        narrativeWeight: weight,
      }),
    );
  }

  return findings;
}

export function computeHangingPromiseFindings(
  input: CreativeDriftComputeInput,
  now: Date,
): CreativeDriftFinding[] {
  const findings: CreativeDriftFinding[] = [];

  for (const row of input.threads) {
    if (!row.isAuthored || !isLivingLifecycle(row.lifecycleState)) continue;
    if (row.threadStatus !== 'OPEN' && row.threadStatus !== 'DORMANT') continue;

    const signals = computeThreadSignals({
      threadKind: row.threadKind,
      threadStatus: row.threadStatus,
      payoffPageId: row.payoffPageId,
      playerSubmitted: row.playerSubmitted,
      updatedAt: row.updatedAt,
      lastAdvancedSessionId: row.lastAdvancedSessionId,
    });

    let include = false;
    let statusLabel = 'Unresolved';

    if (signals.includes('dangling_foreshadowing')) {
      include = true;
      statusLabel = 'Lingering foreshadowing';
    } else if (signals.includes('unresolved_promise')) {
      include = true;
      statusLabel = 'Unresolved promise';
    } else if (
      (row.threadKind === 'mystery' || row.threadKind === 'clue') &&
      row.threadStatus === 'OPEN' &&
      !row.lastAdvancedSessionId
    ) {
      include = true;
      statusLabel = 'Unrevisited';
    }

    if (!include) continue;

    findings.push(
      buildFindingBase({
        bucket: 'hanging_promises',
        subjectKind: 'open_thread',
        subjectId: row.id,
        title: row.title,
        statusLabel,
        referenceDate: row.updatedAt,
        now,
        narrativeWeight: row.narrativeWeight,
        introducedSessionId: row.introducedSessionId,
        linkedEntityIds: row.relatedPageIds,
      }),
    );
  }

  return findings;
}

export function computeEmotionalResidueFindings(
  input: CreativeDriftComputeInput,
  now: Date,
): CreativeDriftFinding[] {
  const findings: CreativeDriftFinding[] = [];

  for (const row of input.threads) {
    if (!row.isAuthored || !isLivingLifecycle(row.lifecycleState)) continue;
    if (row.threadStatus !== 'OPEN' && row.threadStatus !== 'DORMANT') continue;

    let include = false;
    let statusLabel = 'Unrevisited emotional beat';

    if (row.emotionalResidueKind) {
      include = true;
      statusLabel = `Lingering ${row.emotionalResidueKind}`;
    } else if (
      row.relatedPageIds.length > 0 &&
      (row.threadKind === 'promise' || row.threadKind === 'mystery') &&
      !row.lastAdvancedSessionId &&
      row.introducedSessionId
    ) {
      include = true;
    }

    if (!include) continue;

    findings.push(
      buildFindingBase({
        bucket: 'emotional_residue',
        subjectKind: 'open_thread',
        subjectId: row.id,
        title: row.title,
        statusLabel,
        referenceDate: row.updatedAt,
        now,
        narrativeWeight: row.narrativeWeight,
        introducedSessionId: row.introducedSessionId,
        linkedEntityIds: row.relatedPageIds,
      }),
    );
  }

  return findings;
}

function dedupeFindings(findings: CreativeDriftFinding[]): CreativeDriftFinding[] {
  const byFingerprint = new Map<string, CreativeDriftFinding>();
  for (const f of findings) {
    const existing = byFingerprint.get(f.fingerprint);
    if (!existing || (f._sortKey ?? 0) > (existing._sortKey ?? 0)) {
      byFingerprint.set(f.fingerprint, f);
    }
  }
  return [...byFingerprint.values()];
}

function partitionByDisposition(
  findings: CreativeDriftFinding[],
  dispositions: CreativeDriftDispositionMap,
  now: Date,
): { active: CreativeDriftFinding[]; acknowledged: CreativeDriftFinding[] } {
  const active: CreativeDriftFinding[] = [];
  const acknowledged: CreativeDriftFinding[] = [];

  for (const finding of findings) {
    const disposition = dispositions[finding.fingerprint];
    if (isDispositionSnoozedHidden(disposition, now)) continue;
    if (
      disposition &&
      (disposition.kind === 'intentional' ||
        disposition.kind === 'archived' ||
        disposition.kind === 'revive_later')
    ) {
      acknowledged.push(finding);
    } else {
      active.push(finding);
    }
  }

  return { active, acknowledged };
}

export function computeCreativeDriftScan(
  input: CreativeDriftComputeInput,
): CreativeDriftScanResult {
  const now = input.now ?? new Date();
  const dispositions = input.dispositions ?? {};

  const allFindings = dedupeFindings([
    ...computeDormantPlotlineFindings(input, now),
    ...computeCoolingEntityFindings(input, now),
    ...computeHangingPromiseFindings(input, now),
    ...computeEmotionalResidueFindings(input, now),
  ]);

  const { active, acknowledged } = partitionByDisposition(
    allFindings,
    dispositions,
    now,
  );

  const reawakenedThreads = detectReawakenedThreads(input.threads, now);
  const reawakenedEntities = detectReawakenedEntities(
    input.entities,
    input.threads,
    now,
  );
  const reawakened = [...reawakenedThreads, ...reawakenedEntities];

  const byBucket = Object.fromEntries(
    CREATIVE_DRIFT_ACTIVE_BUCKETS.map((b) => [b, 0]),
  ) as Record<CreativeDriftActiveBucket, number>;

  const buckets: CreativeDriftBucketPayload[] = CREATIVE_DRIFT_ACTIVE_BUCKETS.map(
    (bucket) => {
      const items = active
        .filter((f) => f.bucket === bucket)
        .sort(sortDriftFindings)
        .map((f) => {
          const { _sortKey, ...publicFinding } = f;
          return {
            ...publicFinding,
            statusLabel: f.statusLabel || COOLING_BAND_UI_LABELS[f.coolingBand],
          };
        });
      byBucket[bucket] = items.length;
      return {
        bucket,
        label: CREATIVE_DRIFT_BUCKET_UI_LABELS[bucket],
        items,
      };
    },
  );

  const summary: CreativeDriftSummary = {
    totalActive: active.length,
    byBucket,
    reawakenedCount: reawakened.length,
    acknowledgedCount: acknowledged.length,
  };

  return {
    version: CREATIVE_DRIFT_VERSION,
    generatedAt: now.toISOString(),
    buckets,
    reawakened,
    acknowledged: acknowledged
      .sort(sortDriftFindings)
      .map(({ _sortKey, ...f }) => f),
    summary,
  };
}
