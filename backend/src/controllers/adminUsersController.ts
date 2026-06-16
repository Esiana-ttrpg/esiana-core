import { UserRoles } from '../types/domain.js';
import type { Response } from 'express';
import type { AuthenticatedRequest } from '../middleware/auth.js';
import { prisma } from '../lib/prisma.js';

const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 10;
const MAX_LIMIT = 50;

function parsePositiveInt(value: unknown, fallback: number): number {
  if (typeof value === 'string' && /^\d+$/.test(value)) {
    const parsed = Number.parseInt(value, 10);
    return parsed > 0 ? parsed : fallback;
  }
  if (typeof value === 'number' && Number.isInteger(value) && value > 0) {
    return value;
  }
  return fallback;
}

export async function listAdminUsers(
  req: AuthenticatedRequest,
  res: Response,
): Promise<void> {
  const page = parsePositiveInt(req.query.page, DEFAULT_PAGE);
  const limit = Math.min(parsePositiveInt(req.query.limit, DEFAULT_LIMIT), MAX_LIMIT);
  const skip = (page - 1) * limit;

  const [totalCount, rows] = await Promise.all([
    prisma.user.count(),
    prisma.user.findMany({
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        email: true,
        displayName: true,
        role: true,
        createdAt: true,
        lastLogin: true,
        _count: {
          select: { campaignMembers: true },
        },
      },
    }),
  ]);

  const totalPages = Math.max(1, Math.ceil(totalCount / limit));

  res.json({
    users: rows.map((row) => ({
      id: row.id,
      email: row.email,
      displayName: row.displayName,
      role: row.role,
      createdAt: row.createdAt.toISOString(),
      lastLogin: row.lastLogin?.toISOString() ?? null,
      campaignCount: row._count.campaignMembers,
    })),
    pagination: {
      currentPage: page,
      totalPages,
      totalCount,
      limit,
    },
  });
}

export async function patchAdminUserRole(
  req: AuthenticatedRequest,
  res: Response,
): Promise<void> {
  const userId = req.params.userId;
  if (!userId || typeof userId !== 'string') {
    res.status(400).json({ error: 'User id is required' });
    return;
  }

  const body = req.body as { role?: unknown };
  const role =
    body.role === UserRoles.USER || body.role === UserRoles.SYSTEM_ADMIN
      ? body.role
      : null;

  if (!role) {
    res.status(400).json({ error: 'role must be USER or SYSTEM_ADMIN' });
    return;
  }

  if (req.user?.id === userId && role === UserRoles.USER) {
    res.status(400).json({
      error: 'You cannot remove your own system administrator privileges',
    });
    return;
  }

  const existing = await prisma.user.findUnique({ where: { id: userId } });
  if (!existing) {
    res.status(404).json({ error: 'User not found' });
    return;
  }

  const updated = await prisma.user.update({
    where: { id: userId },
    data: { role },
    select: {
      id: true,
      email: true,
      displayName: true,
      role: true,
      createdAt: true,
      lastLogin: true,
      _count: { select: { campaignMembers: true } },
    },
  });

  res.json({
    user: {
      id: updated.id,
      email: updated.email,
      displayName: updated.displayName,
      role: updated.role,
      createdAt: updated.createdAt.toISOString(),
      lastLogin: updated.lastLogin?.toISOString() ?? null,
      campaignCount: updated._count.campaignMembers,
    },
  });
}

export async function deleteAdminUser(
  req: AuthenticatedRequest,
  res: Response,
): Promise<void> {
  const userId = req.params.userId;
  if (!userId || typeof userId !== 'string') {
    res.status(400).json({ error: 'User id is required' });
    return;
  }

  if (req.user?.id === userId) {
    res.status(400).json({ error: 'You cannot delete your own account from this panel' });
    return;
  }

  const existing = await prisma.user.findUnique({ where: { id: userId } });
  if (!existing) {
    res.status(404).json({ error: 'User not found' });
    return;
  }

  await prisma.user.delete({ where: { id: userId } });
  res.json({ ok: true });
}
