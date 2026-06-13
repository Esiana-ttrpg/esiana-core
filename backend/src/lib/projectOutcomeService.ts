import { randomUUID } from 'node:crypto';
import type { Prisma } from '@prisma/client';
import type {
  ProjectOutcomeApplicationSource,
  ProjectOutcomeEntry,
} from '../../../shared/projectMetadata.js';
import { applyCanonicalWorldEffect } from './canonicalWorldEffect.js';
import { emitProjectReputationOutcome } from './reputationSimulationService.js';
import { resolveCampaignChronologyNow } from './chronologyDefaults.js';
import { appendLocationDowntimeAlteration } from './appendLocationDowntimeAlteration.js';
import { applyHavenProjectOutcome } from './downtimeHavenService.js';
import { fieldsToPrismaUpdate, rowToFields } from './downtimeProjectFields.js';
import { prisma } from './prisma.js';

export type ApplyProjectOutcomesInput = {
  campaignId: string;
  projectId: string;
  wikiPageId: string;
  outcomes: ProjectOutcomeEntry[];
  actorUserId: string;
  atEpochMinute: string;
  applicationSource: ProjectOutcomeApplicationSource;
  applicationRunId: string;
};

export type ApplyProjectOutcomesResult = {
  appliedCount: number;
  skippedCount: number;
  deferredCount: number;
  partial: boolean;
  outcomes: ProjectOutcomeEntry[];
};

async function resolveMasterCalendarId(
  tx: Prisma.TransactionClient,
  campaignId: string,
): Promise<string | null> {
  const calendar = await tx.fantasyCalendar.findFirst({
    where: { campaignId },
    orderBy: [{ isMasterTime: 'desc' }, { name: 'asc' }],
    select: { id: true },
  });
  return calendar?.id ?? null;
}

async function isQuestPage(
  tx: Prisma.TransactionClient,
  campaignId: string,
  pageId: string,
): Promise<boolean> {
  const page = await tx.wikiPage.findFirst({
    where: { id: pageId, campaignId },
    select: { templateType: true },
  });
  return page?.templateType === 'QUEST';
}

async function applySingleOutcome(
  tx: Prisma.TransactionClient,
  input: ApplyProjectOutcomesInput,
  outcome: ProjectOutcomeEntry,
): Promise<'applied' | 'deferred' | 'skipped'> {
  if (outcome.status === 'applied') return 'skipped';

  const effectiveDate = await resolveCampaignChronologyNow(input.campaignId);
  const ctx = {
    campaignId: input.campaignId,
    subjectId: input.wikiPageId,
    actorUserId: input.actorUserId,
    canManage: true,
    atEpochMinute: input.atEpochMinute,
    effectiveDate,
  };

  const linkedPageId = outcome.linkedPageIds[0] ?? null;

  switch (outcome.outcomeKind) {
    case 'unlock_entity': {
      if (!linkedPageId) return 'skipped';
      await applyCanonicalWorldEffect(
        { type: 'discover_wiki_page', pageId: linkedPageId },
        ctx,
        tx,
      );
      return 'applied';
    }
    case 'future_hook': {
      if (!linkedPageId) return 'skipped';
      const isQuest = await isQuestPage(tx, input.campaignId, linkedPageId);
      await applyCanonicalWorldEffect(
        isQuest
          ? { type: 'discover_quest', questPageId: linkedPageId }
          : { type: 'discover_wiki_page', pageId: linkedPageId },
        ctx,
        tx,
      );
      return 'applied';
    }
    case 'reputation_effect': {
      if (!linkedPageId) return 'skipped';
      await emitProjectReputationOutcome(tx, {
        campaignId: input.campaignId,
        factionPageId: linkedPageId,
        projectId: input.projectId,
        description: outcome.description ?? '',
        atEpochMinute: input.atEpochMinute,
        sourceRef: input.applicationRunId,
      });
      return 'applied';
    }
    case 'alter_location': {
      if (!linkedPageId) return 'skipped';
      const ok = await appendLocationDowntimeAlteration(tx, {
        campaignId: input.campaignId,
        locationPageId: linkedPageId,
        entry: {
          id: randomUUID(),
          sourceKind: 'project',
          sourceProjectId: input.projectId,
          outcomeId: outcome.id,
          description: outcome.description,
          atEpochMinute: input.atEpochMinute,
          appliedAt: new Date().toISOString(),
        },
      });
      return ok ? 'applied' : 'skipped';
    }
    case 'generate_event': {
      const calendarId = await resolveMasterCalendarId(tx, input.campaignId);
      if (!calendarId) return 'skipped';
      const title =
        outcome.description?.trim() ||
        'Project outcome — something shifted in the world.';
      await tx.calendarEvent.create({
        data: {
          calendarId,
          visibility: 'PARTY',
          title,
          description: JSON.stringify({
            source: 'downtime_project_outcome',
            projectId: input.projectId,
            wikiPageId: input.wikiPageId,
            outcomeId: outcome.id,
          }),
          targetEpochMinute: BigInt(input.atEpochMinute),
        },
      });
      return 'applied';
    }
    case 'haven_effect': {
      if (!linkedPageId) return 'skipped';
      const projectRow = await tx.downtimeProject.findFirst({
        where: { id: input.projectId, campaignId: input.campaignId },
        include: { wikiPage: { select: { title: true } } },
      });
      if (!projectRow) return 'skipped';
      const applied = await applyHavenProjectOutcome(tx, {
        campaignId: input.campaignId,
        projectId: input.projectId,
        projectTitle: projectRow.wikiPage.title,
        havenWikiPageId: linkedPageId,
        actorUserId: input.actorUserId,
        atEpochMinute: input.atEpochMinute,
        outcome,
      });
      return applied ? 'applied' : 'skipped';
    }
    default:
      return 'skipped';
  }
}

function markOutcomeApplied(
  outcome: ProjectOutcomeEntry,
  input: ApplyProjectOutcomesInput,
): ProjectOutcomeEntry {
  return {
    ...outcome,
    status: 'applied',
    appliedAtEpochMinute: input.atEpochMinute,
    applicationSource: input.applicationSource,
    applicationRunId: input.applicationRunId,
  };
}

export async function applyProjectOutcomes(
  tx: Prisma.TransactionClient,
  input: ApplyProjectOutcomesInput,
): Promise<ApplyProjectOutcomesResult> {
  const pending = input.outcomes.filter((entry) => entry.status !== 'applied');
  if (pending.length === 0) {
    return {
      appliedCount: 0,
      skippedCount: input.outcomes.length,
      deferredCount: 0,
      partial: false,
      outcomes: input.outcomes,
    };
  }

  let appliedCount = 0;
  let deferredCount = 0;
  let partial = false;
  const nextOutcomes: ProjectOutcomeEntry[] = [];

  for (const outcome of input.outcomes) {
    if (outcome.status === 'applied') {
      nextOutcomes.push(outcome);
      continue;
    }

    try {
      const result = await applySingleOutcome(tx, input, outcome);
      if (result === 'applied') {
        nextOutcomes.push(markOutcomeApplied(outcome, input));
        appliedCount += 1;
      } else if (result === 'deferred') {
        nextOutcomes.push(outcome);
        deferredCount += 1;
        partial = true;
      } else {
        nextOutcomes.push(outcome);
        partial = true;
      }
    } catch {
      nextOutcomes.push(outcome);
      partial = true;
    }
  }

  const projectRow = await tx.downtimeProject.findFirst({
    where: { id: input.projectId, campaignId: input.campaignId },
  });
  if (projectRow) {
    const fields = rowToFields(projectRow);
    await tx.downtimeProject.update({
      where: { id: input.projectId },
      data: fieldsToPrismaUpdate(
        { ...fields, outcomes: nextOutcomes },
        input.actorUserId,
      ),
    });
  }

  return {
    appliedCount,
    skippedCount: input.outcomes.length - pending.length,
    deferredCount,
    partial,
    outcomes: nextOutcomes,
  };
}

export async function applyProjectOutcomesStandalone(
  input: ApplyProjectOutcomesInput,
): Promise<ApplyProjectOutcomesResult> {
  return prisma.$transaction((tx) => applyProjectOutcomes(tx, input));
}
