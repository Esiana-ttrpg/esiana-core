import type { Response } from 'express';
import type { CampaignScopedRequest } from '../middleware/campaignScope.js';
import { canManageNotebooksFromActor } from '../lib/acl.js';
import {
  createDowntimeProject,
  deleteDowntimeProject,
  getDowntimeProject,
  getDowntimeProjectByWikiPageId,
  listDowntimeProjects,
  updateDowntimeProject,
} from '../lib/downtimeProjectService.js';
import { buildProjectOverviewPayload } from '../lib/buildDowntimePresentation.js';
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
    ctx.role,
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
    ctx.role,
  );

  if (!project) {
    res.status(404).json({ error: 'Project not found.' });
    return;
  }

  res.json({ project });
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
    ctx.role,
  );

  if (!project) {
    res.status(404).json({ error: 'Project not found.' });
    return;
  }

  const { wikiMetadata: _meta, blocks: _blocks, ...detail } = project;
  res.json({ project: detail });
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
    ctx.role,
  );

  if (!projectRow) {
    res.status(404).json({ error: 'Project not found.' });
    return;
  }

  const withBlocks = await getDowntimeProjectByWikiPageId(
    ctx.campaignId,
    campaignHandle,
    projectRow.wikiPageId,
    ctx.role,
  );

  if (!withBlocks) {
    res.status(404).json({ error: 'Project not found.' });
    return;
  }

  const { wikiMetadata, blocks, ...project } = withBlocks;

  const overview = await buildProjectOverviewPayload({
    project,
    wikiMetadata,
    blocks,
    campaignId: ctx.campaignId,
    campaignHandle,
    role: ctx.role,
  });

  res.json({ overview });
}

export async function createDowntimeProjectHandler(
  req: CampaignScopedRequest,
  res: Response,
): Promise<void> {
  const ctx = req.campaign!;
  if (!canManageNotebooksFromActor(ctx.actor)) {
    res.status(403).json({ error: 'Forbidden' });
    return;
  }

  const body = req.body ?? {};
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
  if (!canManageNotebooksFromActor(ctx.actor)) {
    res.status(403).json({ error: 'Forbidden' });
    return;
  }

  const projectId = String(req.params.id);
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
  if (!canManageNotebooksFromActor(ctx.actor)) {
    res.status(403).json({ error: 'Forbidden' });
    return;
  }

  const projectId = String(req.params.id);
  const result = await deleteDowntimeProject(ctx.campaignId, projectId);

  if (!result.ok) {
    res.status(result.status).json({ error: result.error });
    return;
  }

  res.status(204).send();
}
