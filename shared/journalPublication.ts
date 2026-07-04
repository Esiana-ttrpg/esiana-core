/**
 * Journal publication + series DTOs and the two orthogonal state axes
 * (release lifecycle + computed content readiness). Origin (`sourceKind`) is
 * provenance only, never a lifecycle/visibility state.
 *
 * @see docs/plans/journal-system.md
 */
import type {
  ConditionDiagnostic,
  PlanState,
  ReleaseNode,
  ReleaseRuleEnvelope,
} from './journalReleaseRule.js';

export const JOURNAL_PUBLICATION_TYPES = [
  'newsletter',
  'letter',
  'notice',
  'dispatch',
  'obituary',
  'rumor_sheet',
  'journal_entry',
  'proclamation',
] as const;

export type JournalPublicationType = (typeof JOURNAL_PUBLICATION_TYPES)[number];

export const DEFAULT_JOURNAL_PUBLICATION_TYPE: JournalPublicationType = 'notice';

/** Release lifecycle / placement axis. */
export const JOURNAL_PUBLICATION_STATUSES = [
  'draft',
  'scheduled',
  'released',
  'archived',
] as const;

export type JournalPublicationStatus = (typeof JOURNAL_PUBLICATION_STATUSES)[number];

/** Computed content-readiness axis. `partial` is render-time/editor-only and never stored. */
export const CONTENT_READINESS = ['empty', 'partial', 'ready'] as const;

export type ContentReadiness = (typeof CONTENT_READINESS)[number];

/** Provenance of the content, drives only the "Open source draft" affordance. */
export const JOURNAL_SOURCE_KINDS = ['quick_draft', 'workshop'] as const;

export type JournalSourceKind = (typeof JOURNAL_SOURCE_KINDS)[number];

/** How far ahead a series materializes issues. MVP implements `live` (buffer-of-1). */
export const JOURNAL_SERIES_MODES = ['live', 'buffered', 'planned'] as const;

export type JournalSeriesMode = (typeof JOURNAL_SERIES_MODES)[number];

/** Release receipt trigger provenance. */
export const JOURNAL_RELEASE_TRIGGER_KINDS = ['auto', 'manual', 'override'] as const;

export type JournalReleaseTriggerKind = (typeof JOURNAL_RELEASE_TRIGGER_KINDS)[number];

/** The single perceived Planner state (the queue group). `ready` folds into Pending; released items leave the Planner. */
export type PerceivedPlannerState = 'needs_plan' | 'pending' | 'blocked';

/**
 * Project the two backend axes into ONE perceived Planner state so the UI never
 * stacks dimensionality. `ready` (rule satisfied) folds into Pending — it either
 * auto-releases on the next trigger or is held on content; content-not-ready
 * also reads as Pending.
 */
export function toPerceivedState(input: { planState: PlanState }): PerceivedPlannerState {
  switch (input.planState) {
    case 'needs_plan':
      return 'needs_plan';
    case 'blocked':
      return 'blocked';
    case 'pending':
    case 'ready':
    default:
      return 'pending';
  }
}

function hasText(value: string | null | undefined): boolean {
  return typeof value === 'string' && value.trim().length > 0;
}

function hasBlocks(blocks: unknown): boolean {
  return Array.isArray(blocks) && blocks.length > 0;
}

/**
 * MVP content readiness: `ready` when there is a title AND some renderable body
 * (markdown or blocks); otherwise `empty`. `partial` is reserved for structured
 * templates and is never produced (or stored) here.
 */
export function computeContentReadiness(input: {
  title: string | null | undefined;
  contentMarkdown?: string | null;
  contentBlocks?: unknown;
}): ContentReadiness {
  const renderableBody = hasText(input.contentMarkdown) || hasBlocks(input.contentBlocks);
  if (hasText(input.title) && renderableBody) return 'ready';
  return 'empty';
}

/** A resolved narrative anchor (linked page) surfaced for chips/filters. */
export interface JournalLinkedPageRef {
  pageId: string;
  title: string;
  entityCategory: string | null;
}

/** Full publication DTO (detail route). */
export interface JournalPublicationDTO {
  id: string;
  campaignId: string;
  title: string;
  type: JournalPublicationType;
  status: JournalPublicationStatus;
  seriesId: string | null;
  issueNumber: number | null;
  sourceKind: JournalSourceKind;
  workshopDraftId: string | null;
  linkedPage: JournalLinkedPageRef | null;
  contentMarkdown: string | null;
  contentBlocks: unknown | null;
  releaseRule: ReleaseNode | ReleaseRuleEnvelope | null;
  /** Backward-compatible: may be a ReleaseRuleEnvelope or raw ReleaseNode */
  // releaseRule: ReleaseNode | ReleaseRuleEnvelope | null; // replaced above
  contentReadiness: ContentReadiness;
  planState: PlanState;
  perceivedState: PerceivedPlannerState;
  diagnostics: ConditionDiagnostic[];
  createdByUserId: string | null;
  releasedAt: string | null;
  lastEvaluatedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

/** Lightweight Library row (released only). */
export interface JournalLibraryItemDTO {
  id: string;
  title: string;
  type: JournalPublicationType;
  seriesId: string | null;
  seriesName: string | null;
  issueNumber: number | null;
  sourceKind: JournalSourceKind;
  workshopDraftId: string | null;
  linkedPage: JournalLinkedPageRef | null;
  releaseSummary: string | null;
  releasedAt: string | null;
  updatedAt: string;
}

/** Lightweight Planner queue row (no full diagnostics tree). */
export interface JournalPlannerItemDTO {
  id: string;
  title: string;
  type: JournalPublicationType;
  seriesId: string | null;
  issueNumber: number | null;
  sourceKind: JournalSourceKind;
  linkedPage: JournalLinkedPageRef | null;
  perceivedState: PerceivedPlannerState;
  contentReadiness: ContentReadiness;
  hasRule: boolean;
  unmetCount: number;
  lastEvaluatedAt: string | null;
  updatedAt: string;
}

export interface JournalSeriesNextIssueState {
  kind: 'not_created' | 'draft_created' | 'no_rule';
  issueNumber: number;
  openPublicationId: string | null;
}

export interface JournalSeriesDTO {
  id: string;
  campaignId: string;
  name: string;
  description: string | null;
  defaultType: JournalPublicationType;
  linkedPage: JournalLinkedPageRef | null;
  templateWorkshopDraftId: string | null;
  nextIssueRule: ReleaseNode | null;
  namingScheme: string | null;
  nextIssueNumber: number;
  seriesMode: JournalSeriesMode;
  nextIssueState: JournalSeriesNextIssueState;
  lastReleasedIssueNumber: number | null;
  createdAt: string;
  updatedAt: string;
}

export interface CursorPage<T> {
  items: T[];
  nextCursor: string | null;
}

export type JournalLibrarySort = 'newest' | 'oldest' | 'type';

export interface JournalPlannerResponse {
  items: JournalPlannerItemDTO[];
  nextCursor: string | null;
  series: JournalSeriesDTO[];
}
