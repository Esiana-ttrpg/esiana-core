import type { Response } from 'express';
import type { CampaignScopedRequest } from '../middleware/campaignScope.js';
import { canManageNotebooksFromActor } from '../lib/acl.js';
import { createDowntimePerson, listDowntimePeople, presentDowntimePerson, updateDowntimePerson } from '../lib/downtimePeopleService.js';

export async function listDowntimePeopleHandler(req: CampaignScopedRequest, res: Response) {
  const ctx = req.campaign!;
  const canEdit = canManageNotebooksFromActor(ctx.actor);
  res.json(await listDowntimePeople(ctx.campaignId, ctx.campaignHandle ?? ctx.campaignId, ctx.role, canEdit));
}

export async function getDowntimePersonByCharacterHandler(req: CampaignScopedRequest, res: Response) {
  const ctx = req.campaign!;
  const canEdit = canManageNotebooksFromActor(ctx.actor);
  const payload = await listDowntimePeople(ctx.campaignId, ctx.campaignHandle ?? ctx.campaignId, ctx.role, canEdit);
  const matches = payload.people.filter((person) => person.characterPageId === String(req.params.pageId));
  const person = matches.find((item) => item.status === 'ACTIVE') ?? matches[0] ?? null;
  if (!person) { res.status(404).json({ error: 'Hireling relationship not found.' }); return; }
  res.json({ person, assignmentOptions: payload.assignmentOptions });
}

export async function createDowntimePersonHandler(req: CampaignScopedRequest, res: Response) {
  const ctx = req.campaign!;
  if (!canManageNotebooksFromActor(ctx.actor)) { res.status(403).json({ error: 'Forbidden' }); return; }
  const result = await createDowntimePerson(ctx.campaignId, req.user!.id, req.body ?? {});
  if (!result.ok) { res.status(result.status).json({ error: result.error }); return; }
  res.status(201).json({ person: presentDowntimePerson(result.row, ctx.campaignHandle ?? ctx.campaignId, ctx.role, true) });
}

export async function updateDowntimePersonHandler(req: CampaignScopedRequest, res: Response) {
  const ctx = req.campaign!;
  if (!canManageNotebooksFromActor(ctx.actor)) { res.status(403).json({ error: 'Forbidden' }); return; }
  const result = await updateDowntimePerson(ctx.campaignId, String(req.params.id), req.user!.id, req.body ?? {});
  if (!result.ok) { res.status(result.status).json({ error: result.error }); return; }
  res.json({ person: presentDowntimePerson(result.row, ctx.campaignHandle ?? ctx.campaignId, ctx.role, true) });
}
