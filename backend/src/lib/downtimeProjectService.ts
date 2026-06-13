import type { DowntimeProject, Prisma } from '@prisma/client';
import type { CampaignMemberRole } from '../types/domain.js';
import { WikiVisibility } from '../types/domain.js';
import { prisma } from './prisma.js';
import { bootstrapDowntimeProjectOnCreate } from './bootstrapDowntimeProjectOnCreate.js';
import { ensureDowntimeProjectsFolder } from './ensureDowntimeProjectsFolder.js';
import {
  bigintToDto,
  compareProjectSummariesByPriority,
  isTerminalProjectStatus,
  isValidProjectStatusTransition,
  normalizeOperationPosture,
  parseDowntimeProjectFields,
  parseOperationPostureFromWikiMetadata,
  SIMULATION_PROJECT_STATUSES,
  DOWNTIME_OPERATION_POSTURE_METADATA_KEY,
  type DowntimeProjectDetail,
  type DowntimeProjectFields,
  type DowntimeProjectSummary,
  type ProjectStatus,
} from './projectMetadata.js';
import { applyProjectOutcomes } from './projectOutcomeService.js';
import { emitProjectCompletionLedgerSuggestions } from './ledgerSuggestionEmitters.js';
import { fieldsToPrismaUpdate, rowToFields } from './downtimeProjectFields.js';
import { buildWikiPageHref } from './wikiLinkService.js';
import { canViewWikiPage } from './wikiTree.js';

export { rowToFields, fieldsToPrismaUpdate };

type ProjectWithWiki = DowntimeProject & {
  wikiPage: {
    id: string;
    title: string;
    visibility: string;
    deletedAt: Date | null;
    metadata: unknown;
    templateType: string;
    workspace: string | null;
    pathKey: string | null;
  };
};

export type ListDowntimeProjectsOptions = {
  status?: ProjectStatus;
  havenPageId?: string;
  includeTerminal?: boolean;
};

export type CreateDowntimeProjectInput = {
  title: string;
  visibility?: string;
  operationBrief?: string | null;
  stakes?: string | null;
  constraints?: Array<{ label: string; kind: 'requirement' | 'obstacle' }>;
  operationPosture?: string | null;
  fields?: Partial<DowntimeProjectFields>;
  blocks?: Array<Record<string, unknown>> | null;
};

export type UpdateDowntimeProjectInput = Partial<DowntimeProjectFields> & {
  title?: string;
  visibility?: string;
  operationPosture?: string | null;
};

function fieldsToPrismaData(
  fields: DowntimeProjectFields,
  updatedByUserId?: string,
): Prisma.DowntimeProjectUncheckedUpdateInput {
  return fieldsToPrismaUpdate(fields, updatedByUserId);
}

export function toDowntimeProjectSummary(
  row: ProjectWithWiki,
  campaignHandle: string,
): DowntimeProjectSummary {
  return {
    id: row.id,
    wikiPageId: row.wikiPageId,
    title: row.wikiPage.title,
    href: buildWikiPageHref(campaignHandle, row.wikiPage),
    projectType: row.projectType as DowntimeProjectSummary['projectType'],
    status: row.status as ProjectStatus,
    priority: (row.priority as DowntimeProjectSummary['priority']) ?? null,
    progressPercent: row.progressPercent,
    durationTotalMinutes: bigintToDto(row.durationTotalMinutes) ?? '0',
    durationElapsedMinutes: bigintToDto(row.durationElapsedMinutes) ?? '0',
    stalledDurationMinutes: bigintToDto(row.stalledDurationMinutes) ?? '0',
    startedAtEpochMinute: bigintToDto(row.startedAtEpochMinute),
    completedAtEpochMinute: bigintToDto(row.completedAtEpochMinute),
    ownerPageId: row.ownerPageId,
    havenPageId: row.havenPageId,
    updatedAt: row.updatedAt.toISOString(),
  };
}

export function toDowntimeProjectDetail(
  row: ProjectWithWiki,
  campaignHandle: string,
): DowntimeProjectDetail {
  const fields = rowToFields(row);
  const summary = toDowntimeProjectSummary(row, campaignHandle);
  return {
    ...summary,
    targetCompletionEpochMinute: bigintToDto(row.targetCompletionEpochMinute),
    relatedPageIds: fields.relatedPageIds,
    resources: fields.resources,
    blockers: fields.blockers,
    outcomes: fields.outcomes,
    risks: fields.risks,
    semanticsVersion: row.semanticsVersion,
    createdAt: row.createdAt.toISOString(),
    operationPosture: parseOperationPostureFromWikiMetadata(row.wikiPage.metadata),
  };
}

function isWikiPageVisible(
  row: ProjectWithWiki,
  role: CampaignMemberRole | null,
): boolean {
  if (row.wikiPage.deletedAt != null) return false;
  return canViewWikiPage(row.wikiPage.visibility, role);
}

const projectInclude = {
  wikiPage: {
    select: {
      id: true,
      title: true,
      visibility: true,
      deletedAt: true,
      metadata: true,
      templateType: true,
      workspace: true,
      pathKey: true,
    },
  },
} as const;

const projectIncludeWithBlocks = {
  wikiPage: {
    select: {
      id: true,
      title: true,
      visibility: true,
      deletedAt: true,
      metadata: true,
      blocks: true,
      templateType: true,
      workspace: true,
      pathKey: true,
    },
  },
} as const;

function buildListWhere(
  campaignId: string,
  options: ListDowntimeProjectsOptions,
): Prisma.DowntimeProjectWhereInput {
  const where: Prisma.DowntimeProjectWhereInput = {
    campaignId,
    wikiPage: { deletedAt: null },
  };

  if (options.status) {
    where.status = options.status;
  } else if (!options.includeTerminal) {
    where.status = { in: [...SIMULATION_PROJECT_STATUSES] };
  }

  if (options.havenPageId) {
    where.havenPageId = options.havenPageId;
  }

  return where;
}

export async function listDowntimeProjectDetails(
  campaignId: string,
  campaignHandle: string,
  role: CampaignMemberRole | null,
  options: ListDowntimeProjectsOptions = {},
): Promise<Array<{ project: DowntimeProjectDetail; wikiMetadata: unknown }>> {
  const rows = await prisma.downtimeProject.findMany({
    where: buildListWhere(campaignId, options),
    include: projectInclude,
    orderBy: { updatedAt: 'desc' },
  });

  return rows
    .filter((row) => isWikiPageVisible(row, role))
    .map((row) => ({
      project: toDowntimeProjectDetail(row, campaignHandle),
      wikiMetadata: row.wikiPage.metadata,
    }))
    .sort((a, b) => compareProjectSummariesByPriority(a.project, b.project));
}

export async function listDowntimeProjects(
  campaignId: string,
  campaignHandle: string,
  role: CampaignMemberRole | null,
  options: ListDowntimeProjectsOptions = {},
): Promise<DowntimeProjectSummary[]> {
  const rows = await prisma.downtimeProject.findMany({
    where: buildListWhere(campaignId, options),
    include: projectInclude,
    orderBy: { updatedAt: 'desc' },
  });

  return rows
    .filter((row) => isWikiPageVisible(row, role))
    .map((row) => toDowntimeProjectSummary(row, campaignHandle))
    .sort(compareProjectSummariesByPriority);
}

/** Hook-internal: scans simulation projects regardless of wiki visibility. */
export async function listDowntimeProjectsForSimulation(
  campaignId: string,
  db: Prisma.TransactionClient | typeof prisma = prisma,
): Promise<DowntimeProject[]> {
  return db.downtimeProject.findMany({
    where: {
      campaignId,
      status: { in: [...SIMULATION_PROJECT_STATUSES] },
      wikiPage: { deletedAt: null },
    },
    orderBy: { updatedAt: 'asc' },
  });
}

export async function getDowntimeProject(
  campaignId: string,
  campaignHandle: string,
  projectId: string,
  role: CampaignMemberRole | null,
): Promise<DowntimeProjectDetail | null> {
  const row = await prisma.downtimeProject.findFirst({
    where: { id: projectId, campaignId },
    include: projectInclude,
  });
  if (!row || !isWikiPageVisible(row, role)) return null;
  return toDowntimeProjectDetail(row, campaignHandle);
}

export async function getDowntimeProjectByWikiPageId(
  campaignId: string,
  campaignHandle: string,
  wikiPageId: string,
  role: CampaignMemberRole | null,
): Promise<(DowntimeProjectDetail & { wikiMetadata: unknown; blocks: unknown }) | null> {
  const row = await prisma.downtimeProject.findFirst({
    where: { wikiPageId, campaignId },
    include: projectIncludeWithBlocks,
  });
  if (!row || !isWikiPageVisible(row, role)) return null;
  return {
    ...toDowntimeProjectDetail(row, campaignHandle),
    wikiMetadata: row.wikiPage.metadata,
    blocks: row.wikiPage.blocks,
  };
}

async function resolveCurrentEpochMinute(campaignId: string): Promise<bigint> {
  const campaign = await prisma.campaign.findUnique({
    where: { id: campaignId },
    select: { currentEpochMinute: true },
  });
  return campaign?.currentEpochMinute ?? 0n;
}

function applyStatusSideEffects(
  current: DowntimeProjectFields,
  nextStatus: ProjectStatus,
  currentEpochMinute: bigint,
): DowntimeProjectFields {
  const next = { ...current, status: nextStatus };

  if (nextStatus === 'ACTIVE' && next.startedAtEpochMinute == null) {
    next.startedAtEpochMinute = currentEpochMinute;
  }

  if (
    (nextStatus === 'COMPLETED' || nextStatus === 'FAILED') &&
    next.completedAtEpochMinute == null
  ) {
    next.completedAtEpochMinute = currentEpochMinute;
  }

  return next;
}

export async function createDowntimeProject(
  campaignId: string,
  campaignHandle: string,
  actorUserId: string,
  input: CreateDowntimeProjectInput,
): Promise<
  | { ok: true; project: DowntimeProjectDetail }
  | { ok: false; status: number; error: string }
> {
  const bootstrap = bootstrapDowntimeProjectOnCreate({
    title: input.title,
    operationBrief: input.operationBrief,
    stakes: input.stakes,
    constraints: input.constraints,
    operationPosture: normalizeOperationPosture(input.operationPosture),
    fields: input.fields,
    blocks: input.blocks,
  });
  if (!bootstrap.ok) {
    return bootstrap;
  }

  const projectsFolderId = await ensureDowntimeProjectsFolder(campaignId);
  if (!projectsFolderId) {
    return {
      ok: false,
      status: 404,
      error: 'Downtime Projects folder could not be created.',
    };
  }

  const visibility =
    typeof input.visibility === 'string' && input.visibility.trim()
      ? input.visibility.trim()
      : WikiVisibility.PARTY;

  const created = await prisma.$transaction(async (tx) => {
    const wikiPage = await tx.wikiPage.create({
      data: {
        campaignId,
        title: bootstrap.title,
        parentId: projectsFolderId,
        templateType: bootstrap.templateType,
        visibility,
        blocks: bootstrap.blocks as Prisma.InputJsonValue,
        metadata:
          Object.keys(bootstrap.wikiMetadata).length > 0
            ? (bootstrap.wikiMetadata as Prisma.InputJsonValue)
            : undefined,
      },
      select: { id: true },
    });

    const fieldData = fieldsToPrismaData(bootstrap.fields, actorUserId);
    const projectRow = await tx.downtimeProject.create({
      data: {
        campaignId,
        wikiPageId: wikiPage.id,
        ownerPageId: (fieldData.ownerPageId ?? null) as string | null,
        havenPageId: (fieldData.havenPageId ?? null) as string | null,
        projectType: fieldData.projectType as string,
        status: fieldData.status as string,
        priority: fieldData.priority as string | null,
        progressPercent: fieldData.progressPercent as number,
        durationTotalMinutes: fieldData.durationTotalMinutes as bigint,
        durationElapsedMinutes: fieldData.durationElapsedMinutes as bigint,
        stalledDurationMinutes: (fieldData.stalledDurationMinutes as bigint) ?? 0n,
        startedAtEpochMinute: fieldData.startedAtEpochMinute as bigint | null,
        completedAtEpochMinute: fieldData.completedAtEpochMinute as bigint | null,
        targetCompletionEpochMinute: fieldData.targetCompletionEpochMinute as bigint | null,
        relatedPageIds: fieldData.relatedPageIds,
        resources: fieldData.resources,
        blockers: fieldData.blockers,
        outcomes: fieldData.outcomes,
        risks: fieldData.risks,
        semanticsVersion: fieldData.semanticsVersion as string,
        updatedByUserId: actorUserId,
      },
    });

    const project = await tx.downtimeProject.findUniqueOrThrow({
      where: { id: projectRow.id },
      include: projectInclude,
    });

    return project;
  });

  return {
    ok: true,
    project: toDowntimeProjectDetail(created, campaignHandle),
  };
}

export async function updateDowntimeProject(
  campaignId: string,
  campaignHandle: string,
  projectId: string,
  actorUserId: string,
  patch: UpdateDowntimeProjectInput,
): Promise<
  | { ok: true; project: DowntimeProjectDetail }
  | { ok: false; status: number; error: string }
> {
  const existing = await prisma.downtimeProject.findFirst({
    where: { id: projectId, campaignId },
    include: {
      wikiPage: {
        select: {
          id: true,
          title: true,
          visibility: true,
          deletedAt: true,
        },
      },
    },
  });

  if (!existing || existing.wikiPage.deletedAt != null) {
    return { ok: false, status: 404, error: 'Project not found.' };
  }

  const currentFields = rowToFields(existing);

  if (isTerminalProjectStatus(currentFields.status)) {
    const hasSimulationPatch =
      patch.status !== undefined ||
      patch.projectType !== undefined ||
      patch.priority !== undefined ||
      patch.durationTotalMinutes !== undefined ||
      patch.durationElapsedMinutes !== undefined ||
      patch.stalledDurationMinutes !== undefined ||
      patch.startedAtEpochMinute !== undefined ||
      patch.completedAtEpochMinute !== undefined ||
      patch.targetCompletionEpochMinute !== undefined ||
      patch.ownerPageId !== undefined ||
      patch.havenPageId !== undefined ||
      patch.relatedPageIds !== undefined ||
      patch.resources !== undefined ||
      patch.blockers !== undefined ||
      patch.outcomes !== undefined ||
      patch.risks !== undefined ||
      patch.progressPercent !== undefined;

    if (hasSimulationPatch) {
      return {
        ok: false,
        status: 409,
        error: 'Terminal projects cannot be modified. Edit the wiki page for narrative notes.',
      };
    }
  }

  let nextFields = parseDowntimeProjectFields({
    ...currentFields,
    ...patch,
    semanticsVersion: currentFields.semanticsVersion,
  });

  if (patch.status !== undefined && patch.status !== currentFields.status) {
    if (!isValidProjectStatusTransition(currentFields.status, patch.status)) {
      return {
        ok: false,
        status: 400,
        error: `Invalid status transition from ${currentFields.status} to ${patch.status}.`,
      };
    }
    const epoch = await resolveCurrentEpochMinute(campaignId);
    nextFields = applyStatusSideEffects(nextFields, patch.status, epoch);
  }

  if (patch.title !== undefined && !patch.title.trim()) {
    return { ok: false, status: 400, error: 'Project title is required.' };
  }

  const transitioningToCompleted =
    patch.status === 'COMPLETED' && currentFields.status !== 'COMPLETED';

  const updated = await prisma.$transaction(async (tx) => {
    if (
      patch.title !== undefined ||
      patch.visibility !== undefined ||
      patch.operationPosture !== undefined
    ) {
      const wikiPatch: Prisma.WikiPageUpdateInput = {};
      if (patch.title !== undefined) {
        wikiPatch.title = patch.title.trim();
      }
      if (patch.visibility !== undefined) {
        wikiPatch.visibility = patch.visibility.trim();
      }
      if (patch.operationPosture !== undefined) {
        const existingWiki = await tx.wikiPage.findUnique({
          where: { id: existing.wikiPageId },
          select: { metadata: true },
        });
        const metadata =
          existingWiki?.metadata && typeof existingWiki.metadata === 'object'
            ? { ...(existingWiki.metadata as Record<string, unknown>) }
            : {};
        const posture = normalizeOperationPosture(patch.operationPosture);
        if (posture) {
          metadata[DOWNTIME_OPERATION_POSTURE_METADATA_KEY] = posture;
        } else {
          delete metadata[DOWNTIME_OPERATION_POSTURE_METADATA_KEY];
        }
        wikiPatch.metadata = metadata as Prisma.InputJsonValue;
      }
      await tx.wikiPage.update({
        where: { id: existing.wikiPageId },
        data: wikiPatch,
      });
    }

    const projectRow = await tx.downtimeProject.update({
      where: { id: projectId },
      data: fieldsToPrismaData(nextFields, actorUserId),
      include: projectInclude,
    });

    if (transitioningToCompleted) {
      const epoch = await resolveCurrentEpochMinute(campaignId);
      const applicationRunId = `manual-complete:${projectId}:${epoch.toString()}`;
      const outcomeResult = await applyProjectOutcomes(tx, {
        campaignId,
        projectId,
        wikiPageId: existing.wikiPageId,
        outcomes: nextFields.outcomes,
        actorUserId,
        atEpochMinute: epoch.toString(),
        applicationSource: 'manual_patch',
        applicationRunId,
      });
      await emitProjectCompletionLedgerSuggestions(tx, {
        campaignId,
        projectId,
        projectTitle: patch.title?.trim() || existing.wikiPage.title,
        havenPageId: nextFields.havenPageId,
        resources: nextFields.resources,
        outcomes: outcomeResult.outcomes,
        atEpochMinute: epoch.toString(),
        applicationRunId,
      });
      const refreshed = await tx.downtimeProject.findUniqueOrThrow({
        where: { id: projectId },
        include: projectInclude,
      });
      return refreshed;
    }

    return projectRow;
  });

  return {
    ok: true,
    project: toDowntimeProjectDetail(updated, campaignHandle),
  };
}

export async function deleteDowntimeProject(
  campaignId: string,
  projectId: string,
): Promise<{ ok: true } | { ok: false; status: number; error: string }> {
  const existing = await prisma.downtimeProject.findFirst({
    where: { id: projectId, campaignId },
    select: { id: true, status: true, wikiPageId: true },
  });

  if (!existing) {
    return { ok: false, status: 404, error: 'Project not found.' };
  }

  if (existing.status !== 'PLANNED') {
    return {
      ok: false,
      status: 409,
      error:
        'Only PLANNED projects can be deleted. Use status ABANDONED to retain world history.',
    };
  }

  await prisma.$transaction(async (tx) => {
    await tx.downtimeProject.delete({ where: { id: projectId } });
    await tx.wikiPage.update({
      where: { id: existing.wikiPageId },
      data: { deletedAt: new Date() },
    });
  });

  return { ok: true };
}

export async function countActiveDowntimeProjects(campaignId: string): Promise<number> {
  return prisma.downtimeProject.count({
    where: {
      campaignId,
      status: { in: ['ACTIVE', 'PAUSED', 'SUSPENDED'] },
      wikiPage: { deletedAt: null },
    },
  });
}
