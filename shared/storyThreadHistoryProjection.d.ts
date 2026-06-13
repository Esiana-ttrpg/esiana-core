/**
 * Layer 5 — story thread history projection (read-only orchestration).
 * @see docs/architecture-internal/story-thread-history.md
 */
import type { ForeshadowingChainEntry, ForeshadowingStage, ForeshadowingTrackerFinding } from './narrativeForeshadowingTracker.js';
import type { SceneTimelineSession } from './sceneTimelineProjection.js';
import type { ThreadKind, ThreadMetadataFields, ThreadNarrativeWeight } from './threadMetadata.js';
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
    kindFilterOptions: Array<{
        kind: ThreadKind;
        label: string;
    }>;
    anchorSessionId: string | null;
}
export declare function resolveThreadHistoryAnchorSessionId(sessions: SceneTimelineSession[], threadSessionIds: Iterable<string | null | undefined>): string | null;
export declare function buildStoryThreadMilestones(input: {
    thread: ThreadMetadataFields;
    stage: ForeshadowingStage;
    sessions: Map<string, SceneTimelineSession>;
    pageTitlesById: Map<string, string>;
}): StoryThreadHistoryMilestone[];
export declare function deriveLastTouchFromMilestones(milestones: StoryThreadHistoryMilestone[]): {
    lastTouchMilestoneKind: StoryThreadMilestoneKind | null;
    lastTouchSessionId: string | null;
    lastTouchSessionSequenceOrder: number | null;
};
export declare function deriveSessionsSinceLastTouch(input: {
    anchorSessionId: string | null;
    sessions: SceneTimelineSession[];
    lastTouchSessionSequenceOrder: number | null;
}): number | null;
export declare function deriveStoryThreadVisualEmphasis(input: {
    stage: ForeshadowingStage;
    narrativeWeight: ThreadNarrativeWeight;
    sessionsSinceLastTouch: number | null;
}): StoryThreadVisualEmphasis;
export declare function compareStoryThreadHistoryEntries(a: StoryThreadHistoryEntry, b: StoryThreadHistoryEntry): number;
export declare function buildStoryThreadHistoryEntry(input: {
    row: StoryThreadHistoryThreadInput;
    chain: ForeshadowingChainEntry;
    sessions: SceneTimelineSession[];
    pageTitlesById: Map<string, string>;
    findingsByThreadId: Map<string, string[]>;
    anchorSessionId: string | null;
}): StoryThreadHistoryEntry;
export declare function buildStoryThreadHistoryProjection(input: {
    sessions: SceneTimelineSession[];
    threads: StoryThreadHistoryThreadInput[];
    chains?: ForeshadowingChainEntry[];
    findings?: ForeshadowingTrackerFinding[];
    pageTitlesById?: Map<string, string> | Record<string, string>;
}): StoryThreadHistoryProjection;
export declare const STORY_THREAD_MILESTONE_KINDS: StoryThreadMilestoneKind[];
//# sourceMappingURL=storyThreadHistoryProjection.d.ts.map