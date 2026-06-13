import type { ContinuityIssue, ContinuityScope } from '../../../shared/continuityIssue.js';
import { detectClueRedundancyIssues } from '../../../shared/narrativeClueRedundancy.js';
import type { ThreadKind } from '../../../shared/threadMetadata.js';
import { buildNarrativeClueRedundancyIssues } from './buildNarrativeClueRedundancyIssues.js';
import { buildActivationConditionIndex } from './buildActivationConditionIndex.js';
import { loadNarrativeDiagnosticSubjects } from './narrativeDeadEndScan.js';
import type { CampaignMemberRole } from '../types/domain.js';
import { CampaignMemberRoles } from '../types/domain.js';
import { parseThreadMetadata } from './threadMetadata.js';
import { prisma } from './prisma.js';

function canRunClueRedundancyScan(role: CampaignMemberRole | null): boolean {
  return (
    role === CampaignMemberRoles.GAMEMASTER || role === CampaignMemberRoles.WRITER
  );
}

export async function buildNarrativeClueRedundancyContinuityIssues(input: {
  campaignId: string;
  role: CampaignMemberRole | null;
  scope: ContinuityScope;
  filterPageId?: string;
}): Promise<ContinuityIssue[]> {
  if (!canRunClueRedundancyScan(input.role)) return [];

  const loaded = await loadNarrativeDiagnosticSubjects(input.campaignId, input.role);
  const subjects = input.filterPageId
    ? loaded.subjects.filter((s) => s.subjectPageId === input.filterPageId)
    : loaded.subjects;

  const lifecycleBySubjectId = new Map(
    loaded.subjects.map((s) => [s.subjectPageId, s.lifecycleState]),
  );
  const conditionIndex = await buildActivationConditionIndex({
    campaignId: input.campaignId,
    lifecycleBySubjectId,
  });

  const threadPages = await prisma.wikiPage.findMany({
    where: { campaignId: input.campaignId, deletedAt: null },
    select: { id: true, metadata: true },
  });

  const clueThreadPageIds = new Set<string>();
  const threadKindByPageId = new Map<string, ThreadKind>();
  for (const page of threadPages) {
    const thread = parseThreadMetadata(page.metadata);
    threadKindByPageId.set(page.id, thread.threadKind);
    if (thread.threadKind === 'clue') {
      clueThreadPageIds.add(page.id);
    }
  }

  const findings = detectClueRedundancyIssues({
    subjects,
    conditionIndex,
    clueThreadPageIds,
    threadKindByPageId,
  });

  return buildNarrativeClueRedundancyIssues(findings, input.scope);
}

/** Exposed for density metrics reuse. */
export async function loadClueRedundancyFindings(input: {
  campaignId: string;
  role: CampaignMemberRole | null;
}) {
  if (!canRunClueRedundancyScan(input.role)) {
    return { findings: [], clueThreadCount: 0, subjects: [] };
  }

  const loaded = await loadNarrativeDiagnosticSubjects(input.campaignId, input.role);
  const lifecycleBySubjectId = new Map(
    loaded.subjects.map((s) => [s.subjectPageId, s.lifecycleState]),
  );
  const conditionIndex = await buildActivationConditionIndex({
    campaignId: input.campaignId,
    lifecycleBySubjectId,
  });

  const threadPages = await prisma.wikiPage.findMany({
    where: { campaignId: input.campaignId, deletedAt: null },
    select: { id: true, metadata: true },
  });

  const clueThreadPageIds = new Set<string>();
  const threadKindByPageId = new Map<string, ThreadKind>();
  for (const page of threadPages) {
    const thread = parseThreadMetadata(page.metadata);
    threadKindByPageId.set(page.id, thread.threadKind);
    if (thread.threadKind === 'clue') clueThreadPageIds.add(page.id);
  }

  const findings = detectClueRedundancyIssues({
    subjects: loaded.subjects,
    conditionIndex,
    clueThreadPageIds,
    threadKindByPageId,
  });

  return {
    findings,
    clueThreadCount: clueThreadPageIds.size,
    subjects: loaded.subjects,
  };
}
