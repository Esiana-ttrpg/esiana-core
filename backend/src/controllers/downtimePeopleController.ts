import type { Response } from 'express';
import type { CampaignScopedRequest } from '../middleware/campaignScope.js';
import {
  canCreateDowntimeResource,
  canEditDowntimePerson,
  canManageDowntime,
  loadCharacterPageOwnership,
  loadPersonCharacterOwnership,
} from '../lib/downtimeAuthorization.js';
import {
  createDowntimePerson,
  listDowntimePeople,
  presentDowntimePerson,
  updateDowntimePerson,
} from '../lib/downtimePeopleService.js';
import { prisma } from '../lib/prisma.js';
import { canAssignDowntimePerson } from '../lib/downtimeAuthorization.js';


export async function listDowntimePeopleHandler(
  req: CampaignScopedRequest,
  res: Response,
) {
  const ctx = req.campaign!;
  const canEditAny = canManageDowntime(ctx.actor);
  const payload = await listDowntimePeople(
    ctx.campaignId,
    ctx.campaignHandle ?? ctx.campaignId,
    ctx,
    canEditAny,
  );
  res.json(payload);
}

export async function getDowntimePersonByCharacterHandler(
  req: CampaignScopedRequest,
  res: Response,
) {
  const ctx = req.campaign!;
  const canEditAny = canManageDowntime(ctx.actor);
  const payload = await listDowntimePeople(
    ctx.campaignId,
    ctx.campaignHandle ?? ctx.campaignId,
    ctx,
    canEditAny,
  );
  const matches = payload.people.filter(
    (person) => person.characterPageId === String(req.params.pageId),
  );
  const person =
    matches.find((item) => item.status === 'ACTIVE') ?? matches[0] ?? null;
  if (!person) {
    res.status(404).json({ error: 'Hireling relationship not found.' });
    return;
  }
  res.json({
    person,
    assignmentOptions: payload.assignmentOptions,
  });
}

export async function createDowntimePersonHandler(
  req: CampaignScopedRequest,
  res: Response,
) {
  const ctx = req.campaign!;
  if (!canCreateDowntimeResource(ctx.actor)) {
    res.status(403).json({ error: 'Forbidden' });
    return;
  }
  const body = (req.body ?? {}) as Record<string, unknown>;
  const characterPageId =
    typeof body.characterPageId === 'string' ? body.characterPageId.trim().slice(0, 100) : '';
  if (characterPageId) {
    const ownership = await loadCharacterPageOwnership(
      ctx.campaignId,
      characterPageId,
    );
    if (!ownership) {
      res.status(404).json({ error: 'Character page not found.' });
      return;
    }
    if (!canEditDowntimePerson(ctx.actor, ownership)) {
      res.status(403).json({ error: 'Forbidden' });
      return;
    }
  }

  if (!(await canAssignDowntimePerson(ctx.actor, ctx.campaignId, body))) {
    res.status(403).json({ error: 'Forbidden: assignment not permitted' });
    return;
  }

  const result = await createDowntimePerson(
    ctx.campaignId,
    req.user!.id,
    body,
  );
  if (!result.ok) {
    res.status(result.status).json({ error: result.error });
    return;
  }
  res.status(201).json({
    person: presentDowntimePerson(
      result.row,
      ctx.campaignHandle ?? ctx.campaignId,
      ctx,
      true,
    ),
  });
}

export async function updateDowntimePersonHandler(
  req: CampaignScopedRequest,
  res: Response,
) {
  const ctx = req.campaign!;
  const personId = String(req.params.id);
  const ownership = await loadPersonCharacterOwnership(
    ctx.campaignId,
    personId,
  );
  if (!ownership) {
    res.status(404).json({ error: 'Hireling relationship not found.' });
    return;
  }
  if (!canEditDowntimePerson(ctx.actor, ownership)) {
    res.status(403).json({ error: 'Forbidden' });
    return;
  }
  const current = await prisma.downtimePersonRelationship.findFirst({
    where: { id: personId, campaignId: ctx.campaignId },
    select: { havenId: true, projectId: true },
  });
  if (!current || !(await canAssignDowntimePerson(ctx.actor, ctx.campaignId, req.body ?? {}, current))) {
    res.status(403).json({ error: 'Forbidden: assignment not permitted' });
    return;
  }
  const result = await updateDowntimePerson(
    ctx.campaignId,
    personId,
    req.user!.id,
    req.body ?? {},
  );
  if (!result.ok) {
    res.status(result.status).json({ error: result.error });
    return;
  }
  res.json({
    person: presentDowntimePerson(
      result.row,
      ctx.campaignHandle ?? ctx.campaignId,
      ctx,
      true,
    ),
  });
}
