import { UserRole } from '@prisma/client';
import { prisma } from '../prisma.js';
import {
  bootstrapSystemSettings,
  getOrCreateSystemSettings,
  isEmailAllowedForRegistration,
} from '../systemSettings.js';
import { normalizeEmail } from './oidcClaims.js';

export type OidcIdentity = {
  providerId: string;
  sub: string;
  email: string | null;
};

export type ResolveOidcLoginResult =
  | { ok: true; userId: string; accountId: string; created: boolean }
  | { ok: false; code: 'email_collision' | 'registration_disabled' | 'domain_blocked'; message: string };

export type ResolveOidcLinkResult =
  | { ok: true; accountId: string }
  | {
      ok: false;
      code: 'email_mismatch' | 'sub_in_use';
      message: string;
    };

export async function resolveOidcLogin(
  identity: OidcIdentity,
): Promise<ResolveOidcLoginResult> {
  const existingAccount = await prisma.account.findUnique({
    where: {
      provider_providerAccountId: {
        provider: identity.providerId,
        providerAccountId: identity.sub,
      },
    },
    select: { id: true, userId: true },
  });

  if (existingAccount) {
    return {
      ok: true,
      userId: existingAccount.userId,
      accountId: existingAccount.id,
      created: false,
    };
  }

  const email = identity.email;
  if (email) {
    const userByEmail = await prisma.user.findUnique({
      where: { email },
      select: { id: true },
    });
    if (userByEmail) {
      return {
        ok: false,
        code: 'email_collision',
        message:
          'An account with this email already exists. Sign in with your password, then link this identity provider in Settings.',
      };
    }
  }

  const userCount = await prisma.user.count();
  const isBootstrap = userCount === 0;

  if (!isBootstrap) {
    const settings = await getOrCreateSystemSettings();
    if (!settings.allowRegistrations) {
      return {
        ok: false,
        code: 'registration_disabled',
        message:
          'New account registration is currently disabled on this instance.',
      };
    }
    if (
      email &&
      !isEmailAllowedForRegistration(email, settings.allowedDomains)
    ) {
      return {
        ok: false,
        code: 'domain_blocked',
        message:
          'Registration is limited to approved email domains for this instance.',
      };
    }
  }

  if (!email) {
    return {
      ok: false,
      code: 'email_collision',
      message:
        'This identity provider did not return an email address. Contact your administrator.',
    };
  }

  const role = isBootstrap ? UserRole.SYSTEM_ADMIN : UserRole.USER;

  const user = await prisma.user.create({
    data: {
      email,
      passwordHash: null,
      role,
    },
    select: { id: true },
  });

  if (role === UserRole.SYSTEM_ADMIN) {
    await bootstrapSystemSettings();
  }

  const account = await prisma.account.create({
    data: {
      userId: user.id,
      provider: identity.providerId,
      providerAccountId: identity.sub,
    },
    select: { id: true },
  });

  return {
    ok: true,
    userId: user.id,
    accountId: account.id,
    created: true,
  };
}

export async function resolveOidcLink(
  sessionUserId: string,
  identity: OidcIdentity,
): Promise<ResolveOidcLinkResult> {
  const sessionUser = await prisma.user.findUnique({
    where: { id: sessionUserId },
    select: { email: true },
  });
  if (!sessionUser) {
    return { ok: false, code: 'email_mismatch', message: 'Session user not found' };
  }

  const idpEmail = identity.email;
  if (!idpEmail || idpEmail !== sessionUser.email.trim().toLowerCase()) {
    return {
      ok: false,
      code: 'email_mismatch',
      message:
        'The identity provider email must match your Esiana account email to link.',
    };
  }

  const existingSub = await prisma.account.findUnique({
    where: {
      provider_providerAccountId: {
        provider: identity.providerId,
        providerAccountId: identity.sub,
      },
    },
    select: { userId: true },
  });

  if (existingSub && existingSub.userId !== sessionUserId) {
    return {
      ok: false,
      code: 'sub_in_use',
      message: 'This identity is already linked to another account.',
    };
  }

  const account = await prisma.account.upsert({
    where: {
      provider_providerAccountId: {
        provider: identity.providerId,
        providerAccountId: identity.sub,
      },
    },
    create: {
      userId: sessionUserId,
      provider: identity.providerId,
      providerAccountId: identity.sub,
    },
    update: {
      userId: sessionUserId,
    },
    select: { id: true },
  });

  return { ok: true, accountId: account.id };
}

export function buildOidcIdentityFromClaims(
  providerId: string,
  claims: Record<string, unknown>,
): OidcIdentity {
  const sub =
    typeof claims.sub === 'string'
      ? claims.sub
      : typeof claims.sub === 'number'
        ? String(claims.sub)
        : '';
  const email =
    normalizeEmail(claims.email) ??
    normalizeEmail(claims.preferred_username) ??
    normalizeEmail(claims.upn);
  return { providerId, sub, email };
}
