import type { ContinuityIssue, ContinuityScope } from '../../../shared/continuityIssue.js';
import type { BranchCondition } from '../../../shared/narrativeBranch.js';
import { detectHiddenReachabilityIssues } from '../../../shared/narrativeHiddenReachability.js';
import type { NarrativeDeadEndScanRow } from '../../../shared/narrativeDeadEnd.js';
import type { NarrativeLifecycleState } from '../../../shared/narrativeLifecycle.js';
import { buildActivationConditionIndex } from './buildActivationConditionIndex.js';
import { buildNarrativeHiddenReachabilityIssues } from './buildNarrativeHiddenReachabilityIssues.js';
import {
  GLOBAL_NARRATIVE_DEAD_END_CAP,
  loadNarrativeDiagnosticSubjects,
} from './narrativeDeadEndScan.js';
import type { HiddenReachabilityFinding } from '../../../shared/narrativeHiddenReachability.js';
import type { CampaignMemberRole } from '../types/domain.js';
import { CampaignMemberRoles } from '../types/domain.js';
import { prisma } from './prisma.js';

function canRunHiddenReachabilityScan(role: CampaignMemberRole | null): boolean {
  return (
    role === CampaignMemberRoles.GAMEMASTER || role === CampaignMemberRoles.WRITER
  );
}

function collectLifecycleConditionSubjectIds(
  subjects: readonly NarrativeDeadEndScanRow[],
): string[] {
  const ids = new Set<string>();
  for (const row of subjects) {
    const graph = row.branchGraph;
    if (!graph) continue;
    for (const edge of graph.edges) {
      const condition = edge.condition as BranchCondition | undefined;
      if (condition?.type === 'lifecycle') {
        ids.add(condition.subjectId);
      }
    }
  }
  return [...ids];
}

async function buildLifecycleMapForSubjects(
  campaignId: string,
  subjects: readonly NarrativeDeadEndScanRow[],
): Promise<Map<string, NarrativeLifecycleState>> {
  const lifecycleBySubjectId = new Map<string, NarrativeLifecycleState>();
  for (const row of subjects) {
    lifecycleBySubjectId.set(row.subjectPageId, row.lifecycleState);
  }

  const referencedIds = collectLifecycleConditionSubjectIds(subjects).filter(
    (id) => !lifecycleBySubjectId.has(id),
  );
  if (referencedIds.length === 0) {
    return lifecycleBySubjectId;
  }

  const rows = await prisma.narrativeLifecycleState.findMany({
    where: {
      campaignId,
      subjectId: { in: referencedIds },
    },
    select: { subjectId: true, lifecycleState: true },
  });
  for (const row of rows) {
    const state = row.lifecycleState as NarrativeLifecycleState;
    lifecycleBySubjectId.set(row.subjectId, state);
  }

  return lifecycleBySubjectId;
}

export async function buildNarrativeHiddenReachabilityContinuityIssues(input: {
  campaignId: string;
  role: CampaignMemberRole | null;
  scope: ContinuityScope;
  filterPageId?: string;
  maxIssues?: number;
}): Promise<ContinuityIssue[]> {
  if (!canRunHiddenReachabilityScan(input.role)) return [];

  const loaded = await loadNarrativeDiagnosticSubjects(input.campaignId, input.role);
  const subjects = input.filterPageId
    ? loaded.subjects.filter((s) => s.subjectPageId === input.filterPageId)
    : loaded.subjects;

  const lifecycleBySubjectId = await buildLifecycleMapForSubjects(
    input.campaignId,
    subjects,
  );
  const conditionIndex = await buildActivationConditionIndex({
    campaignId: input.campaignId,
    lifecycleBySubjectId,
  });

  const findings = detectHiddenReachabilityIssues({
    subjects,
    conditionIndex,
  });

  let issues = buildNarrativeHiddenReachabilityIssues(findings, input.scope);
  const cap = input.maxIssues ?? GLOBAL_NARRATIVE_DEAD_END_CAP;
  if (issues.length > cap) {
    issues = issues.slice(0, cap);
  }
  return issues;
}

/** Exposed for investigation topology reuse. */
export async function loadHiddenReachabilityFindings(input: {
  campaignId: string;
  role: CampaignMemberRole | null;
}) {
  if (!canRunHiddenReachabilityScan(input.role)) {
    return { findings: [] as HiddenReachabilityFinding[] };
  }

  const loaded = await loadNarrativeDiagnosticSubjects(input.campaignId, input.role);
  const lifecycleBySubjectId = await buildLifecycleMapForSubjects(
    input.campaignId,
    loaded.subjects,
  );
  const conditionIndex = await buildActivationConditionIndex({
    campaignId: input.campaignId,
    lifecycleBySubjectId,
  });

  const findings = detectHiddenReachabilityIssues({
    subjects: loaded.subjects,
    conditionIndex,
  });

  return { findings };
}
