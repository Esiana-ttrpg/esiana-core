import type { Response } from 'express';
import type { CampaignScopedRequest } from '../middleware/campaignScope.js';
import {
  canCreateDowntimeResource,
  canChangeDowntimeVisibility,
  canManageDowntime,
  canDeleteDowntimeResource,
  canEditDowntimeResource,
  loadProjectWikiOwnership,
} from '../lib/downtimeAuthorization.js';
import {
  createDowntimeProject,
  deleteDowntimeProject,
  getDowntimeProject,
  getDowntimeProjectByWikiPageId,
  listDowntimeProjects,
  updateDowntimeProject,
} from '../lib/downtimeProjectService.js';
import { prisma } from '../lib/prisma.js';
import { isDeepStrictEqual } from 'node:util';
import { parseDowntimeProjectFields } from '../../../shared/projectMetadata.js';
import { buildProjectOverviewPayload } from '../lib/buildDowntimePresentation.js';
import { listDowntimePeople } from '../lib/downtimePeopleService.js';
import {
  normalizeProjectStatus,
  type ProjectStatus,
} from '../lib/projectMetadata.js';

export async function listDowntimeProjectsHandler(
  req: CampaignScopedRequest,
  res: Response,
): Promise<void> {
  const ctx = req.campaign!;
  const campaignHandle = ctx.campaignHandle ?? ctx.campaignId;

  const statusRaw = req.query.status;
  const status =
    typeof statusRaw === 'string' && statusRaw.trim()
      ? normalizeProjectStatus(statusRaw)
      : undefined;

  const havenPageId =
    typeof req.query.havenPageId === 'string' && req.query.havenPageId.trim()
      ? req.query.havenPageId.trim()
      : undefined;

  const includeTerminal = req.query.includeTerminal === 'true';

  const projects = await listDowntimeProjects(
    ctx.campaignId,
    campaignHandle,
    ctx,
    { status: status as ProjectStatus | undefined, havenPageId, includeTerminal },
  );

  res.json({ projects });
}

export async function getDowntimeProjectHandler(
  req: CampaignScopedRequest,
  res: Response,
): Promise<void> {
  const ctx = req.campaign!;
  const campaignHandle = ctx.campaignHandle ?? ctx.campaignId;
  const projectId = String(req.params.id);

  const project = await getDowntimeProject(
    ctx.campaignId,
    campaignHandle,
    projectId,
    ctx,
  );

  if (!project) {
    res.status(404).json({ error: 'Project not found.' });
    return;
  }

  const ownership = await loadProjectWikiOwnership(ctx.campaignId, project.id);
  res.json({
    project,
    canDelete: ownership ? canDeleteDowntimeResource(ctx.actor, ownership) : false,
    canEdit: ownership
      ? canEditDowntimeResource(ctx.actor, ownership)
      : false,
  });
}

export async function getDowntimeProjectByWikiPageHandler(
  req: CampaignScopedRequest,
  res: Response,
): Promise<void> {
  const ctx = req.campaign!;
  const campaignHandle = ctx.campaignHandle ?? ctx.campaignId;
  const wikiPageId = String(req.params.wikiPageId);

  const project = await getDowntimeProjectByWikiPageId(
    ctx.campaignId,
    campaignHandle,
    wikiPageId,
    ctx,
  );

  if (!project) {
    res.status(404).json({ error: 'Project not found.' });
    return;
  }

  const { wikiMetadata: _meta, blocks: _blocks, ...detail } = project;
  const ownership = await loadProjectWikiOwnership(ctx.campaignId, detail.id);
  res.json({
    project: detail,
    canDelete: ownership ? canDeleteDowntimeResource(ctx.actor, ownership) : false,
    canEdit: ownership
      ? canEditDowntimeResource(ctx.actor, ownership)
      : false,
  });
}

export async function getDowntimeProjectOverviewHandler(
  req: CampaignScopedRequest,
  res: Response,
): Promise<void> {
  const ctx = req.campaign!;
  const campaignHandle = ctx.campaignHandle ?? ctx.campaignId;
  const projectId = String(req.params.id);

  const projectRow = await getDowntimeProject(
    ctx.campaignId,
    campaignHandle,
    projectId,
    ctx,
  );

  if (!projectRow) {
    res.status(404).json({ error: 'Project not found.' });
    return;
  }

  const withBlocks = await getDowntimeProjectByWikiPageId(
    ctx.campaignId,
    campaignHandle,
    projectRow.wikiPageId,
    ctx,
  );

  if (!withBlocks) {
    res.status(404).json({ error: 'Project not found.' });
    return;
  }

  const { wikiMetadata, blocks, ...project } = withBlocks;

  const people = await listDowntimePeople(ctx.campaignId, campaignHandle, ctx, false);
  const overview = await buildProjectOverviewPayload({
    project,
    wikiMetadata,
    blocks,
    campaignId: ctx.campaignId,
    campaignHandle,
    role: ctx.role,
    viewer: ctx,
    assignedPeople: people.people.filter((person) => person.status === 'ACTIVE' && person.assignment?.kind === 'project' && person.assignment.id === projectId),
  });

  res.json({ overview });
}

export async function createDowntimeProjectHandler(
  req: CampaignScopedRequest,
  res: Response,
): Promise<void> {
  const ctx = req.campaign!;
  if (!canCreateDowntimeResource(ctx.actor)) {
    res.status(403).json({ error: 'Forbidden' });
    return;
  }

  const body = req.body ?? {};
  if (!canChangeDowntimeVisibility(ctx.actor, 'PARTY', body.visibility)) {
    res.status(403).json({ error: 'Forbidden: visibility change not permitted' });
    return;
  }
  if (body.ownerType === 'PARTY' && !ctx.partyId) {
    res.status(400).json({ error: 'PARTY ownership requires a default campaign party.' });
    return;
  }
  const title = typeof body.title === 'string' ? body.title : '';

  const constraints = Array.isArray(body.constraints)
    ? body.constraints
        .filter(
          (entry: unknown) =>
            entry &&
            typeof entry === 'object' &&
            typeof (entry as { label?: unknown }).label === 'string',
        )
        .map((entry: unknown) => {
          const record = entry as { label: string; kind?: unknown };
          const kind =
            record.kind === 'obstacle' || record.kind === 'requirement'
              ? record.kind
              : 'requirement';
          return { label: record.label.trim(), kind };
        })
        .filter((entry: { label: string; kind: 'requirement' | 'obstacle' }) => entry.label.length > 0)
    : undefined;

  if (!canManageDowntime(ctx.actor) && parseDowntimeProjectFields(body.fields).outcomes.length > 0) {
    res.status(403).json({ error: 'Forbidden: automated world effects require downtime.manage' });
    return;
  }

  const result = await createDowntimeProject(
    ctx.campaignId,
    ctx.campaignHandle ?? ctx.campaignId,
    req.user!.id,
    {
      title,
      visibility: typeof body.visibility === 'string' ? body.visibility : undefined,
      operationBrief:
        typeof body.operationBrief === 'string' ? body.operationBrief : undefined,
      stakes: typeof body.stakes === 'string' ? body.stakes : undefined,
      constraints,
      operationPosture:
        typeof body.operationPosture === 'string' ? body.operationPosture : undefined,
      fields: typeof body.fields === 'object' && body.fields ? body.fields : undefined,
      blocks: Array.isArray(body.blocks) ? body.blocks : undefined,
      creatorRole: ctx.role,
      defaultPartyId: ctx.partyId ?? null,
      requestedOwnerType:
        typeof body.ownerType === 'string' ? body.ownerType : undefined,
    },
  );

  if (!result.ok) {
    res.status(result.status).json({ error: result.error });
    return;
  }

  res.status(201).json({ project: result.project });
}

export async function updateDowntimeProjectHandler(
  req: CampaignScopedRequest,
  res: Response,
): Promise<void> {
  const ctx = req.campaign!;
  const projectId = String(req.params.id);
  const ownership = await loadProjectWikiOwnership(ctx.campaignId, projectId);
  if (!ownership) {
    res.status(404).json({ error: 'Project not found.' });
    return;
  }
  if (!canEditDowntimeResource(ctx.actor, ownership)) {
    res.status(403).json({ error: 'Forbidden' });
    return;
  }

  const body = req.body ?? {};

  const patch: Record<string, unknown> = {};
  if (typeof body.title === 'string') patch.title = body.title;
  if (typeof body.visibility === 'string') patch.visibility = body.visibility;
  if (typeof body.operationPosture === 'string' || body.operationPosture === null) {
    patch.operationPosture = body.operationPosture;
  }
  if (typeof body.fields === 'object' && body.fields) {
    Object.assign(patch, body.fields);
  } else {
    const directKeys = [
      'status',
      'projectType',
      'priority',
      'durationTotalMinutes',
      'durationElapsedMinutes',
      'startedAtEpochMinute',
      'completedAtEpochMinute',
      'targetCompletionEpochMinute',
      'ownerPageId',
      'havenPageId',
      'relatedPageIds',
      'resources',
      'blockers',
      'outcomes',
      'risks',
    ] as const;
    for (const key of directKeys) {
      if (body[key] !== undefined) patch[key] = body[key];
    }
  }

  if (!canChangeDowntimeVisibility(ctx.actor, ownership.visibility, patch.visibility)) {
    res.status(403).json({ error: 'Forbidden: visibility change not permitted' });
    return;
  }

  if (!canManageDowntime(ctx.actor)) {
    const current = await prisma.downtimeProject.findFirst({
      where: { id: projectId, campaignId: ctx.campaignId }, select: { outcomes: true },
    });
    const existingOutcomes = parseDowntimeProjectFields({ outcomes: current?.outcomes }).outcomes;
    const nextOutcomes = patch.outcomes === undefined ? existingOutcomes :
      parseDowntimeProjectFields({ outcomes: patch.outcomes }).outcomes;
    if (!isDeepStrictEqual(existingOutcomes, nextOutcomes) ||
        (patch.status === 'COMPLETED' && nextOutcomes.length > 0)) {
      res.status(403).json({ error: 'Forbidden: automated world effects require downtime.manage' });
      return;
    }
  }

  const result = await updateDowntimeProject(
    ctx.campaignId,
    ctx.campaignHandle ?? ctx.campaignId,
    projectId,
    req.user!.id,
    patch,
  );

  if (!result.ok) {
    res.status(result.status).json({ error: result.error });
    return;
  }

  res.json({ project: result.project });
}

export async function deleteDowntimeProjectHandler(
  req: CampaignScopedRequest,
  res: Response,
): Promise<void> {
  const ctx = req.campaign!;
  const projectId = String(req.params.id);
  const ownership = await loadProjectWikiOwnership(ctx.campaignId, projectId);
  if (!ownership) {
    res.status(404).json({ error: 'Project not found.' });
    return;
  }
  if (!canDeleteDowntimeResource(ctx.actor, ownership)) {
    res.status(403).json({ error: 'Forbidden' });
    return;
  }

  const result = await deleteDowntimeProject(ctx.campaignId, projectId);

  if (!result.ok) {
    res.status(result.status).json({ error: result.error });
    return;
  }

  res.status(204).send();
}
