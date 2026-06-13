import { randomBytes } from 'node:crypto';
import * as client from 'openid-client';
import type { Response } from 'express';
import { prisma } from '../prisma.js';
import { env } from '../../config/env.js';
import { buildOidcClientConfig, buildOidcRedirectUri } from './oidcProviderConfig.js';
import {
  buildOidcIdentityFromClaims,
  resolveOidcLink,
  resolveOidcLogin,
} from './resolveOidcUser.js';
import { syncGroupsOnLogin } from './oidcGroupSync.js';
import { setAuthCookie, signAuthToken } from '../../middleware/auth.js';

const STATE_TTL_MS = 15 * 60 * 1000;

function safeReturnTo(value: string | undefined): string {
  if (!value?.trim()) return '/';
  const trimmed = value.trim();
  if (!trimmed.startsWith('/') || trimmed.startsWith('//')) return '/';
  return trimmed;
}

function frontendUrl(path: string, params?: Record<string, string>): string {
  const base = env.frontendOrigin.replace(/\/+$/, '');
  const url = new URL(path.startsWith('/') ? path : `/${path}`, base);
  if (params) {
    for (const [key, val] of Object.entries(params)) {
      url.searchParams.set(key, val);
    }
  }
  return url.toString();
}

export async function purgeExpiredOidcStates(): Promise<void> {
  await prisma.oidcAuthState.deleteMany({
    where: { expiresAt: { lt: new Date() } },
  });
}

export async function startOidcFlow(params: {
  providerId: string;
  mode: 'login' | 'link';
  sessionUserId?: string;
  returnTo?: string;
}): Promise<string> {
  await purgeExpiredOidcStates();

  const provider = await prisma.identityProvider.findFirst({
    where: { id: params.providerId, enabled: true },
  });
  if (!provider) {
    throw new Error('Identity provider is not available');
  }

  if (params.mode === 'link' && !params.sessionUserId) {
    throw new Error('Authentication required to link an identity provider');
  }

  const oidcConfig = await buildOidcClientConfig(provider);
  const redirectUri = buildOidcRedirectUri(provider.id);
  const codeVerifier = client.randomPKCECodeVerifier();
  const codeChallenge = await client.calculatePKCECodeChallenge(codeVerifier);
  const state = randomBytes(24).toString('base64url');

  const scopeList = provider.scopes
    .split(/\s+/)
    .map((s) => s.trim())
    .filter(Boolean);

  const authParams: Record<string, string> = {
    redirect_uri: redirectUri,
    scope: scopeList.join(' '),
    code_challenge: codeChallenge,
    code_challenge_method: 'S256',
    state,
  };

  const authUrl = client.buildAuthorizationUrl(oidcConfig, authParams);

  await prisma.oidcAuthState.create({
    data: {
      state,
      providerId: provider.id,
      mode: params.mode,
      userId: params.mode === 'link' ? params.sessionUserId : null,
      codeVerifier,
      returnTo: safeReturnTo(params.returnTo),
      expiresAt: new Date(Date.now() + STATE_TTL_MS),
    },
  });

  return authUrl.href;
}

export async function completeOidcCallback(
  providerId: string,
  callbackUrl: URL,
  res: Response,
): Promise<void> {
  await purgeExpiredOidcStates();

  const stateParam = callbackUrl.searchParams.get('state') ?? '';
  const authState = await prisma.oidcAuthState.findUnique({
    where: { state: stateParam },
  });

  if (!authState || authState.providerId !== providerId) {
    res.redirect(frontendUrl('/', { authError: 'invalid_state' }));
    return;
  }

  if (authState.expiresAt.getTime() <= Date.now()) {
    await prisma.oidcAuthState.delete({ where: { id: authState.id } });
    res.redirect(frontendUrl('/', { authError: 'session_expired' }));
    return;
  }

  const provider = await prisma.identityProvider.findFirst({
    where: { id: providerId, enabled: true },
  });
  if (!provider) {
    res.redirect(frontendUrl('/', { authError: 'provider_unavailable' }));
    return;
  }

  const oidcConfig = await buildOidcClientConfig(provider);
  const redirectUri = buildOidcRedirectUri(provider.id);

  let tokens: client.TokenEndpointResponse & client.TokenEndpointResponseHelpers;
  try {
    tokens = await client.authorizationCodeGrant(oidcConfig, callbackUrl, {
      pkceCodeVerifier: authState.codeVerifier,
      expectedState: stateParam,
    });
  } catch {
    await prisma.oidcAuthState.delete({ where: { id: authState.id } });
    res.redirect(frontendUrl('/', { authError: 'token_exchange_failed' }));
    return;
  }

  await prisma.oidcAuthState.delete({ where: { id: authState.id } });

  const claims = (tokens.claims() ?? {}) as Record<string, unknown>;
  const identity = buildOidcIdentityFromClaims(provider.id, claims);

  if (!identity.sub) {
    res.redirect(frontendUrl('/', { authError: 'missing_subject' }));
    return;
  }

  const returnPath = safeReturnTo(authState.returnTo ?? undefined);

  if (authState.mode === 'link') {
    if (!authState.userId) {
      res.redirect(
        frontendUrl('/settings', { tab: 'account', authError: 'link_failed' }),
      );
      return;
    }
    const linkResult = await resolveOidcLink(authState.userId, identity);
    if (!linkResult.ok) {
      res.redirect(
        frontendUrl('/settings', {
          tab: 'account',
          authError: linkResult.code,
        }),
      );
      return;
    }
    await syncGroupsOnLogin({
      userId: authState.userId,
      accountId: linkResult.accountId,
      provider,
      claims,
    });
    res.redirect(frontendUrl(returnPath || '/settings', { tab: 'account', linked: provider.id }));
    return;
  }

  const loginResult = await resolveOidcLogin(identity);
  if (!loginResult.ok) {
    res.redirect(
      frontendUrl('/', {
        authError: loginResult.code,
      }),
    );
    return;
  }

  await syncGroupsOnLogin({
    userId: loginResult.userId,
    accountId: loginResult.accountId,
    provider,
    claims,
  });

  const user = await prisma.user.findUnique({
    where: { id: loginResult.userId },
    select: {
      id: true,
      email: true,
      displayName: true,
      avatarUrl: true,
      role: true,
      passwordHash: true,
    },
  });

  if (!user) {
    res.redirect(frontendUrl('/', { authError: 'user_missing' }));
    return;
  }

  await prisma.user.update({
    where: { id: user.id },
    data: { lastLogin: new Date() },
  });

  const token = signAuthToken({ userId: user.id, email: user.email });
  setAuthCookie(res, token);

  res.redirect(frontendUrl(returnPath));
}

export async function listEnabledAuthProviders(): Promise<
  Array<{ id: string; displayName: string }>
> {
  const rows = await prisma.identityProvider.findMany({
    where: { enabled: true },
    orderBy: [{ sortOrder: 'asc' }, { displayName: 'asc' }],
    select: { id: true, displayName: true },
  });
  return rows;
}
