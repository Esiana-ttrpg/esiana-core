import type { ContinuityIssue, ContinuityScope } from '../../../shared/continuityIssue.js';
import {
  EntityRelationKinds,
  type EntityGraphEdge,
  type EntityRelationKind,
} from '../../../shared/entityGraph.js';
import {
  applyCycleFindingCap,
  calendarCyclesToFindings,
  detectBranchCycles,
  detectUnlockCycles,
  extractCalendarPrerequisiteCycles,
  filterFindingsByPageId,
  GLOBAL_NARRATIVE_CYCLE_CAP,
} from '../../../shared/narrativeCircularDependency.js';
import { buildNarrativeCircularDependencyIssues } from './buildNarrativeCircularDependencyIssues.js';
import { loadNarrativeDiagnosticSubjects } from './narrativeDeadEndScan.js';
import type { CampaignMemberRole } from '../types/domain.js';
import { CampaignMemberRoles } from '../types/domain.js';
import { prisma } from './prisma.js';

function canRunCircularDependencyScan(role: CampaignMemberRole | null): boolean {
  return (
    role === CampaignMemberRoles.GAMEMASTER || role === CampaignMemberRoles.WRITER
  );
}

function mapEntityRelationRow(row: {
  id: string;
  sourceEntityType: string;
  sourceEntityId: string;
  targetEntityType: string;
  targetEntityId: string;
  relationKind: string;
  direction: string;
  startDate: unknown;
  endDate: unknown;
  visibility: string | null;
  payload: unknown;
  sourceDomain: string;
  sourceRecordKey: string;
  sourcePageId: string | null;
}): EntityGraphEdge {
  return {
    id: row.id,
    source: {
      entityType: row.sourceEntityType as EntityGraphEdge['source']['entityType'],
      entityId: row.sourceEntityId,
    },
    target: {
      entityType: row.targetEntityType as EntityGraphEdge['target']['entityType'],
      entityId: row.targetEntityId,
    },
    relationKind: row.relationKind as EntityRelationKind,
    direction: row.direction as EntityGraphEdge['direction'],
    startDate: (row.startDate as EntityGraphEdge['startDate']) ?? null,
    endDate: (row.endDate as EntityGraphEdge['endDate']) ?? null,
    visibility: row.visibility,
    payload: null,
    sourceDomain: row.sourceDomain as EntityGraphEdge['sourceDomain'],
    sourceRecordKey: row.sourceRecordKey,
    sourcePageId: row.sourcePageId,
  };
}

async function loadCalendarPrerequisiteEdges(
  campaignId: string,
): Promise<EntityGraphEdge[]> {
  const rows = await prisma.entityRelation.findMany({
    where: {
      campaignId,
      relationKind: EntityRelationKinds.CALENDAR_PREREQUISITE,
    },
  });
  return rows.map(mapEntityRelationRow);
}

async function loadCalendarEventTitles(
  campaignId: string,
  eventIds: readonly string[],
): Promise<Map<string, string>> {
  if (eventIds.length === 0) return new Map();
  const events = await prisma.calendarEvent.findMany({
    where: {
      id: { in: [...eventIds] },
      calendar: { campaignId },
    },
    select: { id: true, title: true },
  });
  return new Map(events.map((event) => [event.id, event.title]));
}

async function loadCalendarEventWikiPageIds(
  _campaignId: string,
  _eventIds: readonly string[],
): Promise<Map<string, string | null>> {
  // v1: calendar events are not wiki-linked; page-scoped filter applies via wiki participants only.
  return new Map();
}

export async function buildNarrativeCircularDependencyContinuityIssues(input: {
  campaignId: string;
  role: CampaignMemberRole | null;
  scope: ContinuityScope;
  filterPageId?: string;
  maxIssues?: number;
}): Promise<ContinuityIssue[]> {
  if (!canRunCircularDependencyScan(input.role)) return [];

  const loaded = await loadNarrativeDiagnosticSubjects(input.campaignId, input.role);
  const narrativeSubjectIds = new Set(loaded.subjects.map((row) => row.subjectPageId));

  const branchFindings = detectBranchCycles({ subjects: loaded.subjects });
  const unlockFindings = detectUnlockCycles({
    subjects: loaded.subjects,
    narrativeSubjectIds,
    pagePresenceById: loaded.pagePresenceById,
  });

  const calendarEdges = await loadCalendarPrerequisiteEdges(input.campaignId);
  const calendarCycles = extractCalendarPrerequisiteCycles(calendarEdges);
  const calendarEventIds = [...new Set(calendarCycles.flatMap((cycle) => cycle.eventIds))];
  const [eventTitles, eventWikiPageIds] = await Promise.all([
    loadCalendarEventTitles(input.campaignId, calendarEventIds),
    loadCalendarEventWikiPageIds(input.campaignId, calendarEventIds),
  ]);
  const calendarFindings = calendarCyclesToFindings(calendarCycles, eventTitles);

  let findings = [...branchFindings, ...unlockFindings, ...calendarFindings];

  if (input.filterPageId) {
    findings = filterFindingsByPageId(findings, input.filterPageId, eventWikiPageIds);
  }

  const cap = input.maxIssues ?? GLOBAL_NARRATIVE_CYCLE_CAP;
  findings = applyCycleFindingCap(findings, cap);

  return buildNarrativeCircularDependencyIssues(findings, input.scope);
}
