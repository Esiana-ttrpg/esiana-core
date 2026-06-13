import type { Response } from 'express';
import { prisma } from '../lib/prisma.js';
import type { CampaignScopedRequest } from '../middleware/campaignScope.js';

function serializeCategory(row: {
  id: string;
  campaignId: string;
  name: string;
  color: string | null;
  createdAt: Date;
  updatedAt: Date;
}) {
  return {
    id: row.id,
    campaignId: row.campaignId,
    name: row.name,
    color: row.color,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

export async function listCalendarEventCategories(
  req: CampaignScopedRequest,
  res: Response,
): Promise<void> {
  const campaignId = req.campaign!.campaignId;
  const categories = await prisma.calendarEventCategory.findMany({
    where: { campaignId },
    orderBy: [{ name: 'asc' }],
  });
  res.json({ categories: categories.map(serializeCategory) });
}

export async function createCalendarEventCategory(
  req: CampaignScopedRequest,
  res: Response,
): Promise<void> {
  const campaignId = req.campaign!.campaignId;
  const body = (req.body ?? {}) as Record<string, unknown>;
  const name = typeof body.name === 'string' ? body.name.trim() : '';
  if (!name) {
    res.status(400).json({ error: 'name is required' });
    return;
  }

  const color =
    typeof body.color === 'string' && body.color.trim() ? body.color.trim() : null;
  const created = await prisma.calendarEventCategory.create({
    data: { campaignId, name, color },
  });
  res.status(201).json({ category: serializeCategory(created) });
}

export async function updateCalendarEventCategory(
  req: CampaignScopedRequest,
  res: Response,
): Promise<void> {
  const campaignId = req.campaign!.campaignId;
  const categoryId = String(req.params.categoryId ?? '');
  if (!categoryId) {
    res.status(400).json({ error: 'categoryId is required' });
    return;
  }
  const existing = await prisma.calendarEventCategory.findFirst({
    where: { id: categoryId, campaignId },
  });
  if (!existing) {
    res.status(404).json({ error: 'Category not found' });
    return;
  }
  const body = (req.body ?? {}) as Record<string, unknown>;
  const name =
    body.name === undefined
      ? existing.name
      : typeof body.name === 'string' && body.name.trim()
        ? body.name.trim()
        : '';
  if (!name) {
    res.status(400).json({ error: 'name cannot be empty' });
    return;
  }
  const color =
    body.color === undefined
      ? existing.color
      : typeof body.color === 'string' && body.color.trim()
        ? body.color.trim()
        : null;

  const updated = await prisma.calendarEventCategory.update({
    where: { id: categoryId },
    data: { name, color },
  });
  res.json({ category: serializeCategory(updated) });
}

export async function deleteCalendarEventCategory(
  req: CampaignScopedRequest,
  res: Response,
): Promise<void> {
  const campaignId = req.campaign!.campaignId;
  const categoryId = String(req.params.categoryId ?? '');
  if (!categoryId) {
    res.status(400).json({ error: 'categoryId is required' });
    return;
  }
  const existing = await prisma.calendarEventCategory.findFirst({
    where: { id: categoryId, campaignId },
    select: { id: true },
  });
  if (!existing) {
    res.status(404).json({ error: 'Category not found' });
    return;
  }

  await prisma.calendarEvent.updateMany({
    where: { categoryId },
    data: { categoryId: null },
  });
  await prisma.calendarEventCategory.delete({ where: { id: categoryId } });
  res.json({ ok: true });
}
