import type { Response } from 'express';
import bcrypt from 'bcryptjs';
import type { AuthenticatedRequest } from '../middleware/auth.js';
import { prisma } from '../lib/prisma.js';
import {
  assertCanRemoveSignInMethod,
  userHasPassword,
} from '../lib/auth/accountAuth.js';
import { isPasswordAuthEnabled } from '../lib/auth/passwordAuth.js';
import { listEnabledAuthProviders } from '../lib/auth/oidcFlow.js';
import { paramString } from '../lib/paramString.js';

const MIN_PASSWORD_LENGTH = 8;

export async function listLinkedAccounts(
  req: AuthenticatedRequest,
  res: Response,
): Promise<void> {
  const userId = req.user!.id;
  const [accounts, providers, user] = await Promise.all([
    prisma.account.findMany({
      where: { userId },
      orderBy: { createdAt: 'asc' },
      select: {
        provider: true,
        idpGroups: true,
        groupsSyncedAt: true,
        createdAt: true,
      },
    }),
    prisma.identityProvider.findMany({
      select: { id: true, displayName: true, enabled: true },
    }),
    prisma.user.findUnique({
      where: { id: userId },
      select: { passwordHash: true },
    }),
  ]);

  const providerMap = new Map(
    providers.map((p) => [p.id, { displayName: p.displayName, enabled: p.enabled }]),
  );

  const linked = accounts.map((account) => {
    const meta = providerMap.get(account.provider);
    const groups = Array.isArray(account.idpGroups)
      ? (account.idpGroups as string[])
      : [];
    return {
      providerId: account.provider,
      displayName: meta?.displayName ?? account.provider,
      providerEnabled: meta?.enabled ?? false,
      idpGroups: groups,
      groupsSyncedAt: account.groupsSyncedAt?.toISOString() ?? null,
      linkedAt: account.createdAt.toISOString(),
    };
  });

  const enabledProviders = await listEnabledAuthProviders();
  const linkedIds = new Set(accounts.map((a) => a.provider));
  const linkable = enabledProviders.filter((p) => !linkedIds.has(p.id));

  res.json({
    linked,
    linkable,
    passwordAuthEnabled: user ? isPasswordAuthEnabled(user) : false,
  });
}

export async function unlinkIdentityProvider(
  req: AuthenticatedRequest,
  res: Response,
): Promise<void> {
  const providerId = paramString(req.params.providerId);
  if (!providerId) {
    res.status(400).json({ error: 'Provider id is required' });
    return;
  }

  const guard = await assertCanRemoveSignInMethod(req.user!.id, {
    type: 'federated',
    providerId,
  });
  if (!guard.ok) {
    res.status(400).json({ error: guard.error });
    return;
  }

  await prisma.account.deleteMany({
    where: { userId: req.user!.id, provider: providerId },
  });

  res.json({ ok: true });
}

export async function addPasswordAuth(
  req: AuthenticatedRequest,
  res: Response,
): Promise<void> {
  const { password, confirmPassword } = req.body as {
    password?: string;
    confirmPassword?: string;
  };

  if (!password || password.length < MIN_PASSWORD_LENGTH) {
    res.status(400).json({
      error: `Password must be at least ${MIN_PASSWORD_LENGTH} characters`,
    });
    return;
  }
  if (password !== confirmPassword) {
    res.status(400).json({ error: 'Passwords do not match' });
    return;
  }

  const user = await prisma.user.findUnique({
    where: { id: req.user!.id },
    select: { passwordHash: true },
  });
  if (!user) {
    res.status(404).json({ error: 'User not found' });
    return;
  }
  if (userHasPassword(user)) {
    res.status(400).json({ error: 'Password sign-in is already enabled' });
    return;
  }

  const passwordHash = await bcrypt.hash(password, 12);
  await prisma.user.update({
    where: { id: req.user!.id },
    data: { passwordHash },
  });

  res.json({ ok: true });
}

export async function removePasswordAuth(
  req: AuthenticatedRequest,
  res: Response,
): Promise<void> {
  const user = await prisma.user.findUnique({
    where: { id: req.user!.id },
    select: { passwordHash: true },
  });
  if (!user) {
    res.status(404).json({ error: 'User not found' });
    return;
  }
  if (!userHasPassword(user)) {
    res.status(400).json({ error: 'Password sign-in is not enabled' });
    return;
  }

  const guard = await assertCanRemoveSignInMethod(req.user!.id, {
    type: 'password',
  });
  if (!guard.ok) {
    res.status(400).json({ error: guard.error });
    return;
  }

  await prisma.user.update({
    where: { id: req.user!.id },
    data: { passwordHash: null },
  });

  res.json({ ok: true });
}
