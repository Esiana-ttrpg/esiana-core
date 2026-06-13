import type { ContinuityIssue, ContinuityScope } from '../../../shared/continuityIssue.js';
import type { NarrativeDensityMetrics } from '../../../shared/narrativeDensityMetrics.js';
import {
  computeNarrativeDensityMetrics,
  detectDensityThresholdIssues,
} from '../../../shared/narrativeDensityMetrics.js';
import { NarrativeLifecycleStates } from '../../../shared/narrativeLifecycle.js';
import { buildNarrativeDensityIssues } from './buildNarrativeDensityIssues.js';
import { loadClueRedundancyFindings } from './narrativeClueRedundancyScan.js';
import { loadNarrativeDiagnosticSubjects } from './narrativeDeadEndScan.js';
import { ensureNarrativeThreadsSystemCategoryKey } from './ensureNarrativeThreadsSystemCategoryKey.js';
import { ensureQuestsSystemCategoryKey } from './ensureQuestsSystemCategoryKey.js';
import { isNarrativeEntity } from './wikiContinuityRoots.js';
import { resolveWikiCodexType } from './resolveWikiCodexType.js';
import { parseThreadMetadata } from './threadMetadata.js';
import type { CampaignMemberRole } from '../types/domain.js';
import { CampaignMemberRoles } from '../types/domain.js';
import { prisma } from './prisma.js';

function canRunDensityScan(role: CampaignMemberRole | null): boolean {
  return (
    role === CampaignMemberRoles.GAMEMASTER || role === CampaignMemberRoles.WRITER
  );
}

export async function loadNarrativeDensityAnalysis(input: {
  campaignId: string;
  role: CampaignMemberRole | null;
}): Promise<NarrativeDensityMetrics | null> {
  if (!canRunDensityScan(input.role)) return null;

  const [loaded, clueData, pages, calendarCount, threadsRootId, questsRootId] =
    await Promise.all([
      loadNarrativeDiagnosticSubjects(input.campaignId, input.role),
      loadClueRedundancyFindings(input),
      prisma.wikiPage.findMany({
        where: { campaignId: input.campaignId, deletedAt: null },
        select: {
          id: true,
          title: true,
          templateType: true,
          metadata: true,
          parentId: true,
        },
      }),
      prisma.calendarEvent.count({
        where: { calendar: { campaignId: input.campaignId } },
      }),
      ensureNarrativeThreadsSystemCategoryKey(input.campaignId),
      ensureQuestsSystemCategoryKey(input.campaignId),
    ]);

  const questParentById = new Map<string, string | null>();
  const questTitleById = new Map<string, string>();
  for (const page of pages) {
    questTitleById.set(page.id, page.title);
    if (questsRootId && page.parentId === questsRootId) {
      questParentById.set(page.id, page.parentId);
    } else if (page.parentId) {
      questParentById.set(page.id, page.parentId);
    } else {
      questParentById.set(page.id, 'root');
    }
  }

  let narrativeEntityCount = 0;
  let activeFactionCount = 0;
  const authoredThreads: Array<{
    pageId: string;
    threadKind: ReturnType<typeof parseThreadMetadata>['threadKind'];
    threadStatus: ReturnType<typeof parseThreadMetadata>['threadStatus'];
    parentQuestClusterId?: string | null;
  }> = [];

  for (const page of pages) {
    if (
      isNarrativeEntity({
        id: page.id,
        title: page.title,
        templateType: page.templateType,
        metadata: page.metadata,
        parentId: page.parentId,
      })
    ) {
      narrativeEntityCount += 1;
    }
    const codex = resolveWikiCodexType({
      templateType: page.templateType,
      metadata: page.metadata,
    });
    if (codex === 'ORGANIZATION') {
      activeFactionCount += 1;
    }
    if (threadsRootId && page.parentId === threadsRootId) {
      const thread = parseThreadMetadata(page.metadata);
      if (!thread.playerSubmitted && thread.threadKind !== 'theory') {
        authoredThreads.push({
          pageId: page.id,
          threadKind: thread.threadKind,
          threadStatus: thread.threadStatus,
          parentQuestClusterId: thread.relatedPageIds[0] ?? null,
        });
      }
    }
  }

  const activeQuestIds = new Set(
    loaded.subjects
      .filter(
        (s) =>
          s.subjectKind === 'quest' &&
          s.lifecycleState === NarrativeLifecycleStates.ACTIVE,
      )
      .map((s) => s.subjectPageId),
  );

  return computeNarrativeDensityMetrics({
    subjects: loaded.subjects,
    clueFindings: clueData.findings,
    clueThreadCount: clueData.clueThreadCount,
    activeFactionCount,
    narrativeEntityCount,
    chronologyEventCount: calendarCount,
    questParentById,
    questTitleById,
    authoredThreads,
  });
}

export async function buildNarrativeDensityContinuityIssues(input: {
  campaignId: string;
  role: CampaignMemberRole | null;
  scope: ContinuityScope;
  filterPageId?: string;
}): Promise<ContinuityIssue[]> {
  const metrics = await loadNarrativeDensityAnalysis(input);
  if (!metrics) return [];

  let findings = detectDensityThresholdIssues(metrics);
  if (input.filterPageId) {
    findings = findings.filter((f) => f.subjectPageId === input.filterPageId);
  }
  return buildNarrativeDensityIssues(findings, input.scope);
}
