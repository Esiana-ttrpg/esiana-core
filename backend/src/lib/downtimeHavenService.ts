import type { Prisma } from '@prisma/client';
import type { DowntimeHaven } from '@prisma/client';
import type { CampaignMemberRole } from '../types/domain.js';
import { WikiVisibility } from '../types/domain.js';
import { prisma } from './prisma.js';
import { bootstrapDowntimeHavenOnCreate } from './bootstrapDowntimeHavenOnCreate.js';
import { ensureDowntimeHavensFolder } from './ensureDowntimeHavensFolder.js';
import type { ProjectOutcomeEntry } from './projectMetadata.js';
import {
  createHavenActivityEntry,
  createHavenThreatEntry,
  createHavenUpgradeEntry,
  DOWNTIME_HAVEN_SEMANTICS_VERSION,
  isEscalatingThreat,
  parseDowntimeHavenFields,
  type DowntimeHavenDetail,
  type DowntimeHavenFields,
  type DowntimeHavenSummary,
  type HavenLedgerSimulationHints,
  type HavenStatus,
  type ProjectHavenEffectPayload,
} from './havenMetadata.js';
import {
  fieldsToPrismaCreate,
  fieldsToPrismaUpdate,
  rowToFields,
} from './downtimeHavenFields.js';
import { buildWikiPageHref } from './wikiLinkService.js';
import { emitHavenUpkeepLedgerSuggestionIfEligible } from './ledgerSuggestionEmitters.js';
import { canViewWikiPage } from './wikiTree.js';
import { SIMULATION_PROJECT_STATUSES } from './projectMetadata.js';
import {
  applySimulationDeltas,
  mergeHavenSimulationIntoHints,
  mergeHavenSimulationPatch,
  parseHavenSimulationFromHints,
} from '../../../shared/havenSimulation.js';

export { rowToFields, fieldsToPrismaUpdate };

type HavenWithWiki = DowntimeHaven & {
  wikiPage: {
    id: string;
    title: string;
    visibility: string;
    deletedAt: Date | null;
    blocks: unknown;
    metadata: unknown;
    templateType: string;
    workspace: string | null;
    pathKey: string | null;
  };
};

export type CreateDowntimeHavenInput = {
  title: string;
  description?: string | null;
  visibility?: string;
  fields?: Partial<DowntimeHavenFields>;
  blocks?: Array<Record<string, unknown>> | null;
};

export type UpdateDowntimeHavenInput = Partial<DowntimeHavenFields> & {
  title?: string;
  visibility?: string;
  appendActivity?: {
    summary: string;
    tone?: 'neutral' | 'warning' | 'escalation' | null;
    atEpochMinute?: string | null;
  };
  havenSimulation?: Partial<
    Pick<
      import('../../../shared/havenSimulation.js').HavenSimulationState,
      'enabled' | 'pausedReason' | 'axes' | 'lockedAxes'
    >
  >;
  ledgerSimulationHints?: Partial<HavenLedgerSimulationHints>;
};

const havenInclude = {
  wikiPage: {
    select: {
      id: true,
      title: true,
      visibility: true,
      deletedAt: true,
      blocks: true,
      metadata: true,
      featuredImageId: true,
      templateType: true,
      workspace: true,
      pathKey: true,
    },
  },
} as const;

function isWikiPageVisible(
  row: HavenWithWiki,
  role: CampaignMemberRole | null,
): boolean {
  if (row.wikiPage.deletedAt != null) return false;
  return canViewWikiPage(row.wikiPage.visibility, role);
}

async function countActiveProjectsAtHaven(
  campaignId: string,
  havenWikiPageId: string,
): Promise<number> {
  return prisma.downtimeProject.count({
    where: {
      campaignId,
      havenPageId: havenWikiPageId,
      status: { in: [...SIMULATION_PROJECT_STATUSES] },
      wikiPage: { deletedAt: null },
    },
  });
}

async function countEscalatingThreats(fields: DowntimeHavenFields): Promise<number> {
  return fields.threats.filter(isEscalatingThreat).length;
}

export function toDowntimeHavenSummary(
  row: HavenWithWiki,
  campaignHandle: string,
  counts?: { activeProjectCount: number; escalatingThreatCount: number },
): DowntimeHavenSummary {
  const fields = rowToFields(row);
  return {
    id: row.id,
    wikiPageId: row.wikiPageId,
    title: row.wikiPage.title,
    href: buildWikiPageHref(campaignHandle, row.wikiPage),
    havenType: fields.havenType,
    status: fields.status,
    scale: fields.scale,
    ownershipType: fields.ownershipType,
    primaryTheme: fields.primaryTheme,
    discoveryState: fields.discoveryState,
    locationPageId: fields.locationPageId,
    activeProjectCount: counts?.activeProjectCount ?? 0,
    escalatingThreatCount: counts?.escalatingThreatCount ?? 0,
    updatedAt: row.updatedAt.toISOString(),
  };
}

export function toDowntimeHavenDetail(
  row: HavenWithWiki,
  campaignHandle: string,
  counts?: { activeProjectCount: number; escalatingThreatCount: number },
): DowntimeHavenDetail {
  const fields = rowToFields(row);
  const summary = toDowntimeHavenSummary(row, campaignHandle, counts);
  return {
    ...summary,
    establishedAt: fields.establishedAt,
    residentPageIds: fields.residentPageIds,
    factionPageIds: fields.factionPageIds,
    crew: fields.crew,
    upgrades: fields.upgrades,
    threats: fields.threats,
    passiveBenefits: fields.passiveBenefits,
    activityLog: fields.activityLog,
    relatedPageIds: fields.relatedPageIds,
    identityHints: fields.identityHints,
    references: fields.references,
    spaces: fields.spaces,
    simulationHints: fields.simulationHints,
    semanticsVersion: fields.semanticsVersion,
    createdAt: row.createdAt.toISOString(),
  };
}

export async function listDowntimeHavens(
  campaignId: string,
  campaignHandle: string,
  role: CampaignMemberRole | null,
): Promise<DowntimeHavenDetail[]> {
  const rows = await prisma.downtimeHaven.findMany({
    where: {
      campaignId,
      wikiPage: { deletedAt: null },
    },
    include: havenInclude,
    orderBy: { updatedAt: 'desc' },
  });

  const visible = rows.filter((row) => isWikiPageVisible(row, role));
  const results: DowntimeHavenDetail[] = [];

  for (const row of visible) {
    const activeProjectCount = await countActiveProjectsAtHaven(
      campaignId,
      row.wikiPageId,
    );
    const fields = rowToFields(row);
    const escalatingThreatCount = fields.threats.filter(isEscalatingThreat).length;
    results.push(
      toDowntimeHavenDetail(row, campaignHandle, {
        activeProjectCount,
        escalatingThreatCount,
      }),
    );
  }

  return results;
}

export async function getDowntimeHaven(
  campaignId: string,
  campaignHandle: string,
  havenId: string,
  role: CampaignMemberRole | null,
): Promise<DowntimeHavenDetail | null> {
  const row = await prisma.downtimeHaven.findFirst({
    where: { id: havenId, campaignId },
    include: havenInclude,
  });
  if (!row || !isWikiPageVisible(row, role)) return null;

  const activeProjectCount = await countActiveProjectsAtHaven(
    campaignId,
    row.wikiPageId,
  );
  const fields = rowToFields(row);
  const escalatingThreatCount = fields.threats.filter(isEscalatingThreat).length;

  return toDowntimeHavenDetail(row, campaignHandle, {
    activeProjectCount,
    escalatingThreatCount,
  });
}

export async function getDowntimeHavenByWikiPageId(
  campaignId: string,
  campaignHandle: string,
  wikiPageId: string,
  role: CampaignMemberRole | null,
): Promise<(DowntimeHavenDetail & { blocks: unknown }) | null> {
  const row = await prisma.downtimeHaven.findFirst({
    where: { wikiPageId, campaignId },
    include: havenInclude,
  });
  if (!row || !isWikiPageVisible(row, role)) return null;

  const activeProjectCount = await countActiveProjectsAtHaven(
    campaignId,
    row.wikiPageId,
  );
  const fields = rowToFields(row);
  const escalatingThreatCount = fields.threats.filter(isEscalatingThreat).length;

  return {
    ...toDowntimeHavenDetail(row, campaignHandle, {
      activeProjectCount,
      escalatingThreatCount,
    }),
    blocks: row.wikiPage.blocks,
  };
}

export async function createDowntimeHaven(
  campaignId: string,
  campaignHandle: string,
  actorUserId: string,
  input: CreateDowntimeHavenInput,
): Promise<
  | { ok: true; haven: DowntimeHavenDetail }
  | { ok: false; status: number; error: string }
> {
  const bootstrap = bootstrapDowntimeHavenOnCreate({
    title: input.title,
    description: input.description,
    fields: input.fields,
    blocks: input.blocks,
  });
  if (!bootstrap.ok) {
    return bootstrap;
  }

  const havensFolderId = await ensureDowntimeHavensFolder(campaignId);
  if (!havensFolderId) {
    return {
      ok: false,
      status: 404,
      error: 'Downtime Havens folder could not be created.',
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
        parentId: havensFolderId,
        templateType: bootstrap.templateType,
        visibility,
        blocks: bootstrap.blocks as Prisma.InputJsonValue,
      },
      select: { id: true },
    });

    const fields = {
      ...bootstrap.fields,
      establishedAt: bootstrap.fields.establishedAt ?? new Date().toISOString(),
    };

    const havenRow = await tx.downtimeHaven.create({
      data: fieldsToPrismaCreate(fields, campaignId, wikiPage.id, actorUserId),
    });

    const createdRow = await tx.downtimeHaven.findUniqueOrThrow({
      where: { id: havenRow.id },
      include: havenInclude,
    });

    const { syncEntityRelationsForDowntimeHaven } = await import(
      './entityRelationSyncService.js'
    );
    await syncEntityRelationsForDowntimeHaven(tx, campaignId, createdRow);

    return createdRow;
  });

  return {
    ok: true,
    haven: toDowntimeHavenDetail(created, campaignHandle, {
      activeProjectCount: 0,
      escalatingThreatCount: 0,
    }),
  };
}

export async function updateDowntimeHaven(
  campaignId: string,
  campaignHandle: string,
  havenId: string,
  actorUserId: string,
  patch: UpdateDowntimeHavenInput,
): Promise<
  | { ok: true; haven: DowntimeHavenDetail }
  | { ok: false; status: number; error: string }
> {
  const existing = await prisma.downtimeHaven.findFirst({
    where: { id: havenId, campaignId },
    include: {
      wikiPage: {
        select: {
          id: true,
          title: true,
          visibility: true,
          deletedAt: true,
          blocks: true,
          metadata: true,
        },
      },
    },
  });

  if (!existing || existing.wikiPage.deletedAt != null) {
    return { ok: false, status: 404, error: 'Haven not found.' };
  }

  const currentFields = rowToFields(existing);
  const { havenSimulation: simulationPatch, appendActivity, title, visibility, ledgerSimulationHints, ...fieldPatch } =
    patch;

  let nextFields = parseDowntimeHavenFields({
    ...currentFields,
    ...fieldPatch,
    semanticsVersion: DOWNTIME_HAVEN_SEMANTICS_VERSION,
  });

  if (simulationPatch) {
    nextFields = {
      ...nextFields,
      simulationHints: mergeHavenSimulationPatch(
        currentFields.simulationHints,
        simulationPatch,
      ),
    };
  }

  if (ledgerSimulationHints) {
    const hints: Record<string, unknown> = { ...nextFields.simulationHints };
    if (ledgerSimulationHints.ledgerUpkeepSuggestionsEnabled !== undefined) {
      hints.ledgerUpkeepSuggestionsEnabled =
        ledgerSimulationHints.ledgerUpkeepSuggestionsEnabled;
    }
    if (ledgerSimulationHints.upkeepCost !== undefined) {
      hints.upkeepCost = ledgerSimulationHints.upkeepCost;
    }
    if (ledgerSimulationHints.constructionCost !== undefined) {
      hints.constructionCost = ledgerSimulationHints.constructionCost;
    }
    nextFields = { ...nextFields, simulationHints: hints };
  }

  if (appendActivity?.summary?.trim()) {
    nextFields = {
      ...nextFields,
      activityLog: [
        ...nextFields.activityLog,
        createHavenActivityEntry({
          summary: appendActivity.summary,
          origin: 'manual',
          tone: appendActivity.tone ?? null,
          atEpochMinute: appendActivity.atEpochMinute ?? null,
        }),
      ],
    };
  }

  if (title !== undefined && !title.trim()) {
    return { ok: false, status: 400, error: 'Haven title is required.' };
  }

  const updated = await prisma.$transaction(async (tx) => {
    if (title !== undefined || visibility !== undefined) {
      const wikiPatch: Prisma.WikiPageUpdateInput = {};
      if (title !== undefined) {
        wikiPatch.title = title.trim();
      }
      if (visibility !== undefined) {
        wikiPatch.visibility = visibility.trim();
      }
      await tx.wikiPage.update({
        where: { id: existing.wikiPageId },
        data: wikiPatch,
      });
    }

    const updatedRow = await tx.downtimeHaven.update({
      where: { id: havenId },
      data: fieldsToPrismaUpdate(nextFields, actorUserId),
      include: havenInclude,
    });

    if (fieldPatch.status && fieldPatch.status !== currentFields.status) {
      const campaign = await tx.campaign.findUnique({
        where: { id: campaignId },
        select: { currentEpochMinute: true },
      });
      await emitHavenUpkeepLedgerSuggestionIfEligible(tx, {
        campaignId,
        havenWikiPageId: existing.wikiPageId,
        havenTitle: title?.trim() || existing.wikiPage.title,
        previousStatus: currentFields.status,
        nextStatus: nextFields.status,
        simulationHints: nextFields.simulationHints,
        transitionKey: `${currentFields.status}->${nextFields.status}:${campaign?.currentEpochMinute?.toString() ?? 'manual'}`,
        atEpochMinute: (campaign?.currentEpochMinute ?? 0n).toString(),
      });
    }

    const { syncEntityRelationsForDowntimeHaven } = await import(
      './entityRelationSyncService.js'
    );
    await syncEntityRelationsForDowntimeHaven(tx, campaignId, updatedRow);

    return updatedRow;
  });

  const activeProjectCount = await countActiveProjectsAtHaven(
    campaignId,
    updated.wikiPageId,
  );
  const escalatingThreatCount = nextFields.threats.filter(isEscalatingThreat).length;

  return {
    ok: true,
    haven: toDowntimeHavenDetail(updated, campaignHandle, {
      activeProjectCount,
      escalatingThreatCount,
    }),
  };
}

export async function deleteDowntimeHaven(
  campaignId: string,
  havenId: string,
): Promise<{ ok: true } | { ok: false; status: number; error: string }> {
  const existing = await prisma.downtimeHaven.findFirst({
    where: { id: havenId, campaignId },
    select: { id: true, wikiPageId: true },
  });

  if (!existing) {
    return { ok: false, status: 404, error: 'Haven not found.' };
  }

  const activeProjects = await prisma.downtimeProject.count({
    where: {
      campaignId,
      havenPageId: existing.wikiPageId,
      status: { in: [...SIMULATION_PROJECT_STATUSES] },
      wikiPage: { deletedAt: null },
    },
  });

  if (activeProjects > 0) {
    return {
      ok: false,
      status: 409,
      error: 'Cannot delete a haven with active linked projects.',
    };
  }

  await prisma.$transaction(async (tx) => {
    const { clearEntityRelationsForDowntimeHaven } = await import(
      './entityRelationSyncService.js'
    );
    await clearEntityRelationsForDowntimeHaven(tx, campaignId, existing.wikiPageId);
    await tx.downtimeHaven.delete({ where: { id: havenId } });
    await tx.wikiPage.update({
      where: { id: existing.wikiPageId },
      data: { deletedAt: new Date() },
    });
  });

  return { ok: true };
}

export async function countDowntimeHavens(campaignId: string): Promise<number> {
  return prisma.downtimeHaven.count({
    where: {
      campaignId,
      wikiPage: { deletedAt: null },
    },
  });
}

export async function resolveWikiPageTitles(
  campaignId: string,
  pageIds: string[],
): Promise<Map<string, string>> {
  if (pageIds.length === 0) return new Map();
  const pages = await prisma.wikiPage.findMany({
    where: { campaignId, id: { in: pageIds }, deletedAt: null },
    select: { id: true, title: true },
  });
  return new Map(pages.map((page) => [page.id, page.title]));
}

export type HavenThreatPatchInput = {
  campaignId: string;
  havenWikiPageId: string;
  actorUserId: string;
  atEpochMinute: string;
  activitySummary: string;
  origin: 'project_outcome' | 'event_consequence';
  sourceProjectId?: string;
  sourceEventId?: string;
  threat?: {
    label: string;
    severity?: import('../../../shared/havenMetadata.js').HavenThreatSeverity | null;
    description?: string | null;
  };
  upgrade?: {
    label: string;
    description?: string | null;
    establishedByProjectId?: string;
    establishedByProjectTitle?: string;
  };
  status?: HavenStatus;
  simulationDeltas?: ProjectHavenEffectPayload['simulationDeltas'];
};

export async function applyHavenThreatPatch(
  tx: Prisma.TransactionClient,
  input: HavenThreatPatchInput,
): Promise<boolean> {
  const havenRow = await tx.downtimeHaven.findFirst({
    where: { campaignId: input.campaignId, wikiPageId: input.havenWikiPageId },
  });
  if (!havenRow) return false;

  let nextFields = rowToFields(havenRow);

  if (input.status) {
    nextFields = { ...nextFields, status: input.status };
  }

  nextFields = {
    ...nextFields,
    activityLog: [
      ...nextFields.activityLog,
      createHavenActivityEntry({
        summary: input.activitySummary,
        origin: input.origin,
        sourceProjectId: input.sourceProjectId,
        atEpochMinute: input.atEpochMinute,
        tone: input.threat ? 'warning' : input.upgrade ? 'neutral' : null,
      }),
    ],
  };

  if (input.upgrade?.label) {
    nextFields = {
      ...nextFields,
      upgrades: [
        ...nextFields.upgrades,
        createHavenUpgradeEntry({
          label: input.upgrade.label,
          description: input.upgrade.description ?? null,
          establishedAtEpochMinute: input.atEpochMinute,
          establishedByProjectId: input.upgrade.establishedByProjectId,
          establishedByProjectTitle: input.upgrade.establishedByProjectTitle,
        }),
      ],
    };
  }

  if (input.threat?.label) {
    nextFields = {
      ...nextFields,
      threats: [
        ...nextFields.threats,
        createHavenThreatEntry({
          label: input.threat.label,
          severity: input.threat.severity ?? null,
          description: input.threat.description ?? null,
          sinceEpochMinute: input.atEpochMinute,
        }),
      ],
    };
  }

  if (input.simulationDeltas && Object.keys(input.simulationDeltas).length > 0) {
    const simulation = parseHavenSimulationFromHints(nextFields.simulationHints);
    const nextSimulation = applySimulationDeltas(simulation, input.simulationDeltas);
    nextFields = {
      ...nextFields,
      simulationHints: mergeHavenSimulationIntoHints(
        nextFields.simulationHints,
        nextSimulation,
      ),
    };
  }

  await tx.downtimeHaven.update({
    where: { id: havenRow.id },
    data: fieldsToPrismaUpdate(nextFields, input.actorUserId),
  });

  return true;
}

export async function applyHavenProjectOutcome(
  tx: Prisma.TransactionClient,
  input: {
    campaignId: string;
    projectId: string;
    projectTitle: string;
    havenWikiPageId: string;
    actorUserId: string;
    atEpochMinute: string;
    outcome: ProjectOutcomeEntry;
  },
): Promise<boolean> {
  const payload: ProjectHavenEffectPayload | null =
    input.outcome.havenEffect ??
    (input.outcome.description
      ? { activitySummary: input.outcome.description }
      : null);

  if (!payload) return false;

  const activitySummary =
    payload.activitySummary?.trim() ||
    input.outcome.description?.trim() ||
    `Changed by ${input.projectTitle}`;

  return applyHavenThreatPatch(tx, {
    campaignId: input.campaignId,
    havenWikiPageId: input.havenWikiPageId,
    actorUserId: input.actorUserId,
    atEpochMinute: input.atEpochMinute,
    activitySummary,
    origin: 'project_outcome',
    sourceProjectId: input.projectId,
    status: payload.status as HavenStatus | undefined,
    threat: payload.threat,
    upgrade: payload.upgrade
      ? {
          label: payload.upgrade.label,
          description: payload.upgrade.description ?? null,
          establishedByProjectId: input.projectId,
          establishedByProjectTitle: input.projectTitle,
        }
      : undefined,
    simulationDeltas: payload.simulationDeltas,
  });
}
