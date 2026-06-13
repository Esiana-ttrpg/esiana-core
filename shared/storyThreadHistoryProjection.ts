/**
 * Layer 5 — story thread history projection (read-only orchestration).
 * @see docs/architecture-internal/story-thread-history.md
 */
import type {
  ForeshadowingChainEntry,
  ForeshadowingStage,
  ForeshadowingTrackerFinding,
} from './narrativeForeshadowingTracker.js';
import {
  buildForeshadowingChainEntry,
  deriveForeshadowingStage,
} from './narrativeForeshadowingTracker.js';
import type { SceneTimelineSession } from './sceneTimelineProjection.js';
import { THREAD_KIND_GROUP_LABELS } from './threadDisplay.js';
import type {
  ThreadKind,
  ThreadMetadataFields,
  ThreadNarrativeWeight,
} from './threadMetadata.js';

export type StoryThreadMilestoneKind = 'introduced' | 'reinforced' | 'payoff' | 'resolved';

export type StoryThreadVisualEmphasis = 'dominant' | 'standard' | 'muted';

export interface StoryThreadHistoryMilestone {
  kind: StoryThreadMilestoneKind;
  sessionId: string | null;
  sessionTitle: string | null;
  sessionSequenceOrder: number | null;
  pageId?: string | null;
  pageTitle?: string | null;
  reached: boolean;
}

export interface StoryThreadHistoryThreadInput {
  threadPageId: string;
  title: string;
  thread: ThreadMetadataFields;
}

export interface StoryThreadHistoryEntry {
  threadPageId: string;
  title: string;
  threadKind: ThreadKind;
  narrativeWeight: ThreadNarrativeWeight;
  stage: ForeshadowingStage;
  milestones: StoryThreadHistoryMilestone[];
  diagnosticRuleIds: string[];
  lastTouchMilestoneKind: StoryThreadMilestoneKind | null;
  lastTouchSessionId: string | null;
  lastTouchSessionSequenceOrder: number | null;
  sessionsSinceLastTouch: number | null;
  anchorSessionId: string | null;
  visualEmphasis: StoryThreadVisualEmphasis;
}

export interface StoryThreadHistoryProjection {
  threads: StoryThreadHistoryEntry[];
  stageCounts: Record<ForeshadowingStage, number>;
  kindFilterOptions: Array<{ kind: ThreadKind; label: string }>;
  anchorSessionId: string | null;
}

const TRACKED_KINDS = new Set<ThreadKind>(['foreshadowing', 'promise', 'mystery']);

const STALE_SESSION_GAP = 4;

const STAGE_SORT_ORDER: Record<ForeshadowingStage, number> = {
  introduced: 0,
  reinforced: 1,
  payoff_pending: 2,
  resolved: 3,
  abandoned: 4,
};

const EMPHASIS_SORT_ORDER: Record<StoryThreadVisualEmphasis, number> = {
  dominant: 0,
  standard: 1,
  muted: 2,
};

const WEIGHT_SORT_ORDER: Record<ThreadNarrativeWeight, number> = {
  critical: 0,
  major: 1,
  minor: 2,
};

const TERMINAL_STAGES = new Set<ForeshadowingStage>(['resolved', 'abandoned']);

const MILESTONE_KINDS: StoryThreadMilestoneKind[] = [
  'introduced',
  'reinforced',
  'payoff',
  'resolved',
];

function compareTitles(a: string, b: string): number {
  return a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' });
}

function sessionMap(sessions: SceneTimelineSession[]): Map<string, SceneTimelineSession> {
  return new Map(sessions.map((session) => [session.id, session]));
}

export function resolveThreadHistoryAnchorSessionId(
  sessions: SceneTimelineSession[],
  threadSessionIds: Iterable<string | null | undefined>,
): string | null {
  if (sessions.length === 0) return null;

  const sorted = [...sessions].sort((a, b) => a.sequenceOrder - b.sequenceOrder);
  const sessionIndex = new Map(sorted.map((session, index) => [session.id, index]));

  let lastTouchedIndex = -1;
  for (const sessionId of threadSessionIds) {
    if (!sessionId) continue;
    const index = sessionIndex.get(sessionId);
    if (index != null) {
      lastTouchedIndex = Math.max(lastTouchedIndex, index);
    }
  }

  if (lastTouchedIndex >= 0 && lastTouchedIndex + 1 < sorted.length) {
    return sorted[lastTouchedIndex + 1]!.id;
  }

  return sorted[0]!.id;
}

function isTrackedThread(thread: ThreadMetadataFields): boolean {
  if (thread.playerSubmitted || thread.threadKind === 'theory') return false;
  return TRACKED_KINDS.has(thread.threadKind);
}

function sessionMilestone(
  kind: StoryThreadMilestoneKind,
  sessionId: string | null,
  sessions: Map<string, SceneTimelineSession>,
  reached: boolean,
): StoryThreadHistoryMilestone {
  const session = sessionId ? sessions.get(sessionId) : undefined;
  return {
    kind,
    sessionId,
    sessionTitle: session?.title ?? null,
    sessionSequenceOrder: session?.sequenceOrder ?? null,
    reached,
  };
}

export function buildStoryThreadMilestones(input: {
  thread: ThreadMetadataFields;
  stage: ForeshadowingStage;
  sessions: Map<string, SceneTimelineSession>;
  pageTitlesById: Map<string, string>;
}): StoryThreadHistoryMilestone[] {
  const { thread, stage, sessions, pageTitlesById } = input;

  const introducedReached = Boolean(thread.introducedSessionId);
  const reinforcedReached =
    Boolean(thread.lastAdvancedSessionId) &&
    thread.lastAdvancedSessionId !== thread.introducedSessionId;
  const payoffReached = Boolean(thread.payoffPageId);
  const resolvedReached =
    Boolean(thread.resolvedSessionId) || TERMINAL_STAGES.has(stage);

  return [
    sessionMilestone('introduced', thread.introducedSessionId, sessions, introducedReached),
    sessionMilestone('reinforced', thread.lastAdvancedSessionId, sessions, reinforcedReached),
    {
      kind: 'payoff',
      sessionId: null,
      sessionTitle: null,
      sessionSequenceOrder: null,
      pageId: thread.payoffPageId,
      pageTitle: thread.payoffPageId
        ? (pageTitlesById.get(thread.payoffPageId) ?? null)
        : null,
      reached: payoffReached,
    },
    sessionMilestone('resolved', thread.resolvedSessionId, sessions, resolvedReached),
  ];
}

export function deriveLastTouchFromMilestones(
  milestones: StoryThreadHistoryMilestone[],
): {
  lastTouchMilestoneKind: StoryThreadMilestoneKind | null;
  lastTouchSessionId: string | null;
  lastTouchSessionSequenceOrder: number | null;
} {
  const priority: StoryThreadMilestoneKind[] = ['resolved', 'reinforced', 'introduced'];

  for (const kind of priority) {
    const milestone = milestones.find((entry) => entry.kind === kind && entry.reached);
    if (milestone?.sessionId) {
      return {
        lastTouchMilestoneKind: kind,
        lastTouchSessionId: milestone.sessionId,
        lastTouchSessionSequenceOrder: milestone.sessionSequenceOrder,
      };
    }
  }

  return {
    lastTouchMilestoneKind: null,
    lastTouchSessionId: null,
    lastTouchSessionSequenceOrder: null,
  };
}

export function deriveSessionsSinceLastTouch(input: {
  anchorSessionId: string | null;
  sessions: SceneTimelineSession[];
  lastTouchSessionSequenceOrder: number | null;
}): number | null {
  const { anchorSessionId, sessions, lastTouchSessionSequenceOrder } = input;
  if (anchorSessionId == null || lastTouchSessionSequenceOrder == null) return null;

  const anchor = sessions.find((session) => session.id === anchorSessionId);
  if (!anchor) return null;

  return Math.max(0, anchor.sequenceOrder - lastTouchSessionSequenceOrder);
}

export function deriveStoryThreadVisualEmphasis(input: {
  stage: ForeshadowingStage;
  narrativeWeight: ThreadNarrativeWeight;
  sessionsSinceLastTouch: number | null;
}): StoryThreadVisualEmphasis {
  if (TERMINAL_STAGES.has(input.stage)) return 'muted';

  if (input.narrativeWeight === 'critical') return 'dominant';

  if (
    input.narrativeWeight === 'major' &&
    input.sessionsSinceLastTouch != null &&
    input.sessionsSinceLastTouch >= STALE_SESSION_GAP
  ) {
    return 'dominant';
  }

  return 'standard';
}

function emptyStageCounts(): Record<ForeshadowingStage, number> {
  return {
    introduced: 0,
    reinforced: 0,
    payoff_pending: 0,
    resolved: 0,
    abandoned: 0,
  };
}

export function compareStoryThreadHistoryEntries(
  a: StoryThreadHistoryEntry,
  b: StoryThreadHistoryEntry,
): number {
  const stageDiff = STAGE_SORT_ORDER[a.stage] - STAGE_SORT_ORDER[b.stage];
  if (stageDiff !== 0) return stageDiff;

  const emphasisDiff =
    EMPHASIS_SORT_ORDER[a.visualEmphasis] - EMPHASIS_SORT_ORDER[b.visualEmphasis];
  if (emphasisDiff !== 0) return emphasisDiff;

  const weightDiff =
    WEIGHT_SORT_ORDER[a.narrativeWeight] - WEIGHT_SORT_ORDER[b.narrativeWeight];
  if (weightDiff !== 0) return weightDiff;

  return compareTitles(a.title, b.title);
}

export function buildStoryThreadHistoryEntry(input: {
  row: StoryThreadHistoryThreadInput;
  chain: ForeshadowingChainEntry;
  sessions: SceneTimelineSession[];
  pageTitlesById: Map<string, string>;
  findingsByThreadId: Map<string, string[]>;
  anchorSessionId: string | null;
}): StoryThreadHistoryEntry {
  const sessionsById = sessionMap(input.sessions);
  const stage = input.chain.stage;
  const milestones = buildStoryThreadMilestones({
    thread: input.row.thread,
    stage,
    sessions: sessionsById,
    pageTitlesById: input.pageTitlesById,
  });

  const lastTouch = deriveLastTouchFromMilestones(milestones);
  const sessionsSinceLastTouch = deriveSessionsSinceLastTouch({
    anchorSessionId: input.anchorSessionId,
    sessions: input.sessions,
    lastTouchSessionSequenceOrder: lastTouch.lastTouchSessionSequenceOrder,
  });

  const visualEmphasis = deriveStoryThreadVisualEmphasis({
    stage,
    narrativeWeight: input.row.thread.narrativeWeight,
    sessionsSinceLastTouch,
  });

  return {
    threadPageId: input.row.threadPageId,
    title: input.row.title,
    threadKind: input.row.thread.threadKind,
    narrativeWeight: input.row.thread.narrativeWeight,
    stage,
    milestones,
    diagnosticRuleIds: input.findingsByThreadId.get(input.row.threadPageId) ?? [],
    lastTouchMilestoneKind: lastTouch.lastTouchMilestoneKind,
    lastTouchSessionId: lastTouch.lastTouchSessionId,
    lastTouchSessionSequenceOrder: lastTouch.lastTouchSessionSequenceOrder,
    sessionsSinceLastTouch,
    anchorSessionId: input.anchorSessionId,
    visualEmphasis,
  };
}

export function buildStoryThreadHistoryProjection(input: {
  sessions: SceneTimelineSession[];
  threads: StoryThreadHistoryThreadInput[];
  chains?: ForeshadowingChainEntry[];
  findings?: ForeshadowingTrackerFinding[];
  pageTitlesById?: Map<string, string> | Record<string, string>;
}): StoryThreadHistoryProjection {
  const pageTitlesById =
    input.pageTitlesById instanceof Map
      ? input.pageTitlesById
      : new Map(Object.entries(input.pageTitlesById ?? {}));

  const trackedRows = input.threads.filter((row) => isTrackedThread(row.thread));

  const chainByThreadId = new Map<string, ForeshadowingChainEntry>();
  if (input.chains) {
    for (const chain of input.chains) {
      chainByThreadId.set(chain.threadPageId, chain);
    }
  }

  const findingsByThreadId = new Map<string, string[]>();
  for (const finding of input.findings ?? []) {
    const existing = findingsByThreadId.get(finding.threadPageId) ?? [];
    if (!existing.includes(finding.ruleId)) {
      existing.push(finding.ruleId);
    }
    findingsByThreadId.set(finding.threadPageId, existing);
  }

  const allSessionIds: string[] = [];
  for (const row of trackedRows) {
    const { thread } = row;
    if (thread.introducedSessionId) allSessionIds.push(thread.introducedSessionId);
    if (thread.lastAdvancedSessionId) allSessionIds.push(thread.lastAdvancedSessionId);
    if (thread.resolvedSessionId) allSessionIds.push(thread.resolvedSessionId);
  }

  const anchorSessionId = resolveThreadHistoryAnchorSessionId(
    input.sessions,
    allSessionIds,
  );

  const stageCounts = emptyStageCounts();
  const entries: StoryThreadHistoryEntry[] = [];

  for (const row of trackedRows) {
    const chain =
      chainByThreadId.get(row.threadPageId) ??
      buildForeshadowingChainEntry({
        threadPageId: row.threadPageId,
        title: row.title,
        thread: row.thread,
      });

    const entry = buildStoryThreadHistoryEntry({
      row,
      chain,
      sessions: input.sessions,
      pageTitlesById,
      findingsByThreadId,
      anchorSessionId,
    });

    stageCounts[entry.stage] += 1;
    entries.push(entry);
  }

  entries.sort(compareStoryThreadHistoryEntries);

  const kindFilterOptions = (['foreshadowing', 'promise', 'mystery'] as const).map(
    (kind) => ({
      kind,
      label: THREAD_KIND_GROUP_LABELS[kind],
    }),
  );

  return {
    threads: entries,
    stageCounts,
    kindFilterOptions,
    anchorSessionId,
  };
}

export const STORY_THREAD_MILESTONE_KINDS = MILESTONE_KINDS;
