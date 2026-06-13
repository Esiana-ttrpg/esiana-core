import { Router } from 'express';
import bcrypt from 'bcryptjs';
import {
  type AuthenticatedRequest,
  clearAuthCookie,
  requireAuth,
  setAuthCookie,
  signAuthToken,
} from '../middleware/auth.js';
import { prisma } from '../lib/prisma.js';
import { UserRole } from '@prisma/client';
import { serializeUserIdentity } from '../lib/userDisplay.js';
import {
  bootstrapSystemSettings,
  getOrCreateSystemSettings,
  isEmailAllowedForRegistration,
} from '../lib/systemSettings.js';
import {
  authLoginEmailLimiter,
  authLoginLimiter,
  authRegisterLimiter,
  authPasswordResetLimiter,
  authPasswordResetConsumeLimiter,
} from '../middleware/rateLimit.js';
import { isPasswordAuthEnabled } from '../lib/auth/passwordAuth.js';
import {
  createPasswordResetToken,
  consumePasswordResetToken,
} from '../lib/auth/passwordReset.js';
import {
  buildNotificationEmailHtml,
  isSmtpConfigured,
  sendMail,
} from '../lib/mail/mailSender.js';
import { DEFAULT_GLOBAL_TITLE } from '../lib/systemSettings.js';
import {
  listAuthProviders,
  oidcCallback,
  startOidcAuth,
} from '../controllers/oidcAuthController.js';
import type { NextFunction, Response } from 'express';

export const authRouter = Router();

function requireAuthForLinkMode(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): void {
  if (req.query.mode === 'link') {
    void requireAuth(req, res, next);
    return;
  }
  next();
}

authRouter.get('/providers', listAuthProviders);

authRouter.get(
  '/oidc/:providerId/start',
  requireAuthForLinkMode,
  startOidcAuth,
);

authRouter.get('/oidc/:providerId/callback', oidcCallback);

authRouter.post('/register', authRegisterLimiter, async (req, res) => {
  const { email, password } = req.body as {
    email?: string;
    password?: string;
  };

  if (!email || !password || password.length < 8) {
    res.status(400).json({
      error: 'Email and password (min 8 characters) are required',
    });
    return;
  }

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    res.status(409).json({ error: 'Email already registered' });
    return;
  }

  const existingUserCount = await prisma.user.count();
  const isBootstrapAdmin = existingUserCount === 0;

  if (!isBootstrapAdmin) {
    const systemSettings = await getOrCreateSystemSettings();
    if (!systemSettings.allowRegistrations) {
      res.status(403).json({
        error: 'New account registration is currently disabled on this instance.',
      });
      return;
    }
    if (!isEmailAllowedForRegistration(email, systemSettings.allowedDomains)) {
      res.status(403).json({
        error:
          'Registration is limited to approved email domains for this instance.',
      });
      return;
    }
  }

  const passwordHash = await bcrypt.hash(password, 12);
  const role = isBootstrapAdmin ? UserRole.SYSTEM_ADMIN : UserRole.USER;

  const user = await prisma.user.create({
    data: {
      email,
      passwordHash,
      role,
    },
    select: {
      id: true,
      email: true,
      displayName: true,
      avatarUrl: true,
      role: true,
      passwordHash: true,
    },
  });

  if (role === UserRole.SYSTEM_ADMIN) {
    await bootstrapSystemSettings();
  }

  const token = signAuthToken({ userId: user.id, email: user.email });
  setAuthCookie(res, token);
  res.status(201).json({ user: serializeUserIdentity(user) });
});

authRouter.post('/login', authLoginLimiter, authLoginEmailLimiter, async (req, res) => {
  const { email, password } = req.body as {
    email?: string;
    password?: string;
  };

  if (!email || !password) {
    res.status(400).json({ error: 'Email and password are required' });
    return;
  }

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user || !isPasswordAuthEnabled(user)) {
    res.status(401).json({ error: 'Invalid credentials' });
    return;
  }

  const valid = await bcrypt.compare(password, user.passwordHash!);
  if (!valid) {
    res.status(401).json({ error: 'Invalid credentials' });
    return;
  }

  await prisma.user.update({
    where: { id: user.id },
    data: { lastLogin: new Date() },
  });

  const token = signAuthToken({ userId: user.id, email: user.email });
  setAuthCookie(res, token);
  res.json({
    user: serializeUserIdentity({
      id: user.id,
      email: user.email,
      displayName: user.displayName,
      avatarUrl: user.avatarUrl,
      role: user.role,
      passwordHash: user.passwordHash,
    }),
  });
});

authRouter.post(
  '/forgot-password',
  authPasswordResetLimiter,
  async (req, res) => {
    const { email } = req.body as { email?: string };
    const normalized =
      typeof email === 'string' ? email.trim().toLowerCase() : '';

    if (normalized) {
      const user = await prisma.user.findUnique({
        where: { email: normalized },
        select: { id: true, passwordHash: true },
      });

      if (user && isPasswordAuthEnabled(user) && (await isSmtpConfigured())) {
        const settings = await getOrCreateSystemSettings();
        const appTitle = settings.globalTitle ?? DEFAULT_GLOBAL_TITLE;
        const rawToken = await createPasswordResetToken(user.id);
        const frontendOrigin =
          process.env.FRONTEND_ORIGIN ?? 'http://localhost:5173';
        const resetUrl = `${frontendOrigin.replace(/\/+$/, '')}/reset-password?token=${encodeURIComponent(rawToken)}`;
        const subject = `${appTitle} password reset`;
        const text = `Use this link to reset your password (expires in 1 hour):\n\n${resetUrl}`;
        const html = buildNotificationEmailHtml({
          title: 'Reset your password',
          body: 'Click the button below to choose a new password. This link expires in one hour.',
          linkUrl: resetUrl,
          appTitle,
        });
        await sendMail({ to: normalized, subject, text, html });
      }
    }

    res.json({ ok: true });
  },
);

authRouter.post(
  '/reset-password',
  authPasswordResetConsumeLimiter,
  async (req, res) => {
    const { token, password } = req.body as {
      token?: string;
      password?: string;
    };

    if (!token || !password) {
      res.status(400).json({ error: 'Token and new password are required' });
      return;
    }

    const result = await consumePasswordResetToken(token, password);
    if (!result.ok) {
      res.status(400).json({ error: result.error });
      return;
    }

    res.json({ ok: true });
  },
);

authRouter.post('/logout', (_req, res) => {
  clearAuthCookie(res);
  res.json({ ok: true });
});

authRouter.get('/me', requireAuth, async (req: AuthenticatedRequest, res) => {
  const accounts = await prisma.account.findMany({
    where: { userId: req.user!.id },
    select: { provider: true },
  });
  res.json({
    user: {
      ...req.user,
      linkedProviders: accounts.map((a) => a.provider),
    },
  });
});
