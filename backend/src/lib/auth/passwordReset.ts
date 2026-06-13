import { createHash, randomBytes } from 'node:crypto';
import bcrypt from 'bcryptjs';
import { prisma } from '../prisma.js';

const RESET_TOKEN_TTL_MS = 60 * 60 * 1000;
const MIN_PASSWORD_LENGTH = 8;

function hashResetToken(rawToken: string): string {
  return createHash('sha256').update(rawToken).digest('hex');
}

export async function createPasswordResetToken(userId: string): Promise<string> {
  const rawToken = randomBytes(32).toString('base64url');
  const tokenHash = hashResetToken(rawToken);
  const expiresAt = new Date(Date.now() + RESET_TOKEN_TTL_MS);

  await prisma.$transaction([
    prisma.passwordResetToken.updateMany({
      where: { userId, usedAt: null },
      data: { usedAt: new Date() },
    }),
    prisma.passwordResetToken.create({
      data: {
        userId,
        tokenHash,
        expiresAt,
      },
    }),
  ]);

  return rawToken;
}

export type ConsumePasswordResetResult =
  | { ok: true }
  | { ok: false; error: string };

export async function consumePasswordResetToken(
  rawToken: string,
  newPassword: string,
): Promise<ConsumePasswordResetResult> {
  const trimmed = rawToken.trim();
  if (!trimmed) {
    return { ok: false, error: 'Invalid or expired reset link' };
  }
  if (newPassword.length < MIN_PASSWORD_LENGTH) {
    return {
      ok: false,
      error: `Password must be at least ${MIN_PASSWORD_LENGTH} characters`,
    };
  }

  const tokenHash = hashResetToken(trimmed);
  const row = await prisma.passwordResetToken.findUnique({
    where: { tokenHash },
    select: {
      id: true,
      userId: true,
      expiresAt: true,
      usedAt: true,
    },
  });

  if (!row || row.usedAt || row.expiresAt.getTime() <= Date.now()) {
    return { ok: false, error: 'Invalid or expired reset link' };
  }

  const passwordHash = await bcrypt.hash(newPassword, 12);
  await prisma.$transaction([
    prisma.user.update({
      where: { id: row.userId },
      data: { passwordHash },
    }),
    prisma.passwordResetToken.update({
      where: { id: row.id },
      data: { usedAt: new Date() },
    }),
    prisma.passwordResetToken.updateMany({
      where: {
        userId: row.userId,
        usedAt: null,
        id: { not: row.id },
      },
      data: { usedAt: new Date() },
    }),
  ]);

  return { ok: true };
}
