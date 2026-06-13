import { apiFetch } from './api';

export interface TimelineCalendarRecord {
  id: string;
  name: string;
  isMasterTime: boolean;
}

export interface TimelineCategoryRecord {
  id: string;
  campaignId: string;
  name: string;
  color: string | null;
}

export interface ConditionNode {
  type: 'GROUP' | 'CRITERIA';
  operator?: 'AND' | 'OR' | 'NAND' | 'XOR';
  children?: ConditionNode[];
  parameter?: 'YEAR' | 'MONTH' | 'DAY' | 'WEEKDAY' | 'MOON_PHASE' | 'SEASON' | 'CYCLE';
  moonId?: string;
  comparison?: 'EQUALS' | 'NOT_EQUALS' | 'GREATER_THAN' | 'LESS_THAN' | 'PHASE_MATCH';
  value?: string;
}

export interface MoonOverride {
  moonId: string;
  mode: 'FORCE_PHASE' | 'OFFSET';
  phase?: string;
  offset?: number;
}

export interface TimelineBaseEventRecord {
  id: string;
  calendarId: string;
  categoryId: string | null;
  prerequisiteId: string | null;
  visibility: 'PUBLIC' | 'PARTY' | 'DM_ONLY';
  title: string;
  description: string | null;
  duration: number;
  isRepeating: boolean;
  repeatInterval: number | null;
  repeatUnit: 'DAYS' | 'MONTHS' | 'YEARS' | 'ERAS' | null;
  limitRepetitions: number | null;
  conditions: ConditionNode | null;
  moonOverrides: MoonOverride[] | null;
  isRecurring: boolean;
  targetYear: number | null;
  targetMonth: number | null;
  targetDay: number | null;
  targetEpochMinute: string | null;
  recurrenceRule: unknown;
  createdAt: string;
  updatedAt: string;
  tags: string[];
}

export interface TimelineOccurrenceRecord {
  occurrenceId: string;
  baseEventId: string;
  occurrenceIndex: number;
  calendarId: string;
  categoryId: string | null;
  visibility: 'PUBLIC' | 'PARTY' | 'DM_ONLY';
  title: string;
  description: string | null;
  start: {
    year: number | null;
    month: number | null;
    day: number | null;
    monthName?: string | null;
    epochMinute: string | null;
  };
  end: {
    year: number | null;
    month: number | null;
    day: number | null;
    monthName?: string | null;
    epochMinute: string | null;
  };
  duration: number;
  isStart: boolean;
  isContinuation: boolean;
  dayOffset: number;
  sourceType: 'STATIC' | 'REPEATING' | 'CONDITION_MATCHED' | 'MOON_OVERRIDE';
  prerequisiteBaseEventId: string | null;
}

export type TimelineEventRecord = TimelineOccurrenceRecord;

export type ExpansionWarningCode =
  | 'CAP_APPLIED_PER_EVENT'
  | 'CAP_APPLIED_TOTAL'
  | 'UNBOUNDED_RULE_FORCED_CAP'
  | 'CLIPPED_DAY_TO_MONTH_END'
  | 'MOON_OVERRIDE_TARGET_NOT_FOUND'
  | 'INVALID_CONDITION_NODE_SKIPPED'
  | 'PREREQUISITE_REFERENCE_MISSING'
  | 'WINDOW_PARSE_FALLBACK_APPLIED';

export interface ChronologyTimelineBundle {
  calendars: TimelineCalendarRecord[];
  categories: TimelineCategoryRecord[];
  baseEvents: TimelineBaseEventRecord[];
  occurrences: TimelineOccurrenceRecord[];
  events: TimelineEventRecord[]; // compatibility alias
  expansionMetadata: {
    window: { mode: 'ERA' | 'YEAR_RANGE' | 'EPOCH_RANGE' | string; from: string; to: string };
    limits: { maxGeneratedPerBaseEvent: number; maxGeneratedTotal: number };
    generated: {
      totalOccurrences: number;
      totalBaseEventsConsidered: number;
      truncated: boolean;
      truncatedBaseEventIds: string[];
    };
    warnings: ExpansionWarningCode[];
    evaluationVersion: string;
  };
}

export async function fetchChronologyTimeline(
  campaignHandle: string,
): Promise<ChronologyTimelineBundle> {
  return apiFetch<ChronologyTimelineBundle>(`/campaigns/${campaignHandle}/chronology/timeline`);
}
