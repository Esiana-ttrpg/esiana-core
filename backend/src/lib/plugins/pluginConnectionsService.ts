import type { PluginConnection } from '@prisma/client';
import type { Request } from 'express';
import { prisma } from '../prisma.js';
import { decryptSecretOrDevStore, encryptSecretOrDevStore } from '../crypto/secretBox.js';
import { fetchAuthenticatedRemote, fetchOAuthRemote, type AuthenticatedRemoteFetchOptions } from '../networkFetch.js';
import { getConnectionProvider, type ConnectionOwnerType } from './connectionProviderRegistry.js';
import { requirePluginConnectionInvocation } from './pluginConnectionInvocation.js';
import { isCampaignPluginEnabled } from '../campaignPlugins.js';

type Credential = { accessToken?: string; refreshToken?: string; apiKey?: string; token?: string };
const refreshes = new Map<string, Promise<PluginConnection>>();

class OAuthRefreshError extends Error {
  constructor(message: string, readonly reconnectRequired: boolean) { super(message); }
}

export function isTerminalOAuthRefreshFailure(status: number, errorCode: unknown): boolean {
  return status === 400 && errorCode === 'invalid_grant';
}

async function refreshOAuth(row: PluginConnection, allowedOrigins: string[]): Promise<PluginConnection> {
  const current = refreshes.get(row.id); if (current) return current;
  const operation = (async () => {
    const latest = await prisma.pluginConnection.findUnique({ where: { id: row.id } });
    if (!latest?.credentialEnc || latest.status !== 'connected') throw new OAuthRefreshError('OAuth connection is no longer connected', false);
    if (latest.credentialVersion !== row.credentialVersion) return latest;
    row = latest;
    if (!await isCampaignPluginEnabled(row.campaignId, row.pluginId)) throw new OAuthRefreshError('Plugin is not enabled for this campaign', false);
    const provider = getConnectionProvider(row.pluginId);
    if (!provider || provider.auth.type !== 'oauth2' || !row.credentialEnc) throw new OAuthRefreshError('OAuth connection cannot be refreshed', false);
    const credential = JSON.parse(decryptSecretOrDevStore(row.credentialEnc)) as Credential;
    if (!credential.refreshToken) throw new OAuthRefreshError('OAuth connection requires reconnect', true);
    const client = await prisma.pluginOAuthClient.findUnique({ where: { pluginId: row.pluginId } });
    if (!client) throw new OAuthRefreshError('OAuth client is not configured', false);
    const tokenUrl = new URL(provider.auth.tokenUrl);
    const params = new URLSearchParams({ grant_type: 'refresh_token', refresh_token: credential.refreshToken, client_id: client.clientId });
    let authorization: string | undefined;
    if (provider.auth.clientAuth === 'basic') {
      if (!client.clientSecretEnc) throw new OAuthRefreshError('OAuth client secret is not configured', false);
      authorization = `Basic ${Buffer.from(`${client.clientId}:${decryptSecretOrDevStore(client.clientSecretEnc)}`).toString('base64')}`; params.delete('client_id');
    } else if (provider.auth.clientAuth === 'body' && client.clientSecretEnc) params.set('client_secret', decryptSecretOrDevStore(client.clientSecretEnc));
    const response = await fetchOAuthRemote(tokenUrl, { allowedOrigins, method: 'POST', body: params.toString(), authorization });
    let tokens: { access_token?: unknown; refresh_token?: unknown; expires_in?: unknown; error?: unknown } = {};
    try { tokens = JSON.parse(response.body.toString('utf8')) as typeof tokens; } catch { /* classified below */ }
    if (response.status < 200 || response.status >= 300 || typeof tokens.access_token !== 'string') {
      throw new OAuthRefreshError('OAuth refresh failed', isTerminalOAuthRefreshFailure(response.status, tokens.error));
    }
    const updated = await prisma.pluginConnection.updateMany({ where: { id: row.id, status: 'connected', credentialVersion: row.credentialVersion }, data: { credentialEnc: encryptSecretOrDevStore(JSON.stringify({ accessToken: tokens.access_token, refreshToken: typeof tokens.refresh_token === 'string' ? tokens.refresh_token : credential.refreshToken })), credentialVersion: { increment: 1 }, expiresAt: typeof tokens.expires_in === 'number' ? new Date(Date.now() + Math.max(0, tokens.expires_in - 30) * 1000) : null, lastError: null } });
    const settled = await prisma.pluginConnection.findUnique({ where: { id: row.id } });
    if (updated.count === 0) {
      if (settled?.status === 'connected' && settled.credentialEnc && settled.credentialVersion !== row.credentialVersion) return settled;
      throw new OAuthRefreshError('OAuth connection changed while refreshing', false);
    }
    return settled!;
  })().catch(async (error: unknown) => {
    const refreshError = error instanceof OAuthRefreshError ? error : new OAuthRefreshError('OAuth provider is temporarily unavailable', false);
    if (refreshError.reconnectRequired) {
      const changed = await prisma.pluginConnection.updateMany({ where: { id: row.id, status: 'connected', credentialVersion: row.credentialVersion }, data: { status: 'reconnect_required', lastError: 'OAuth refresh was rejected' } });
      if (changed.count === 0) {
        const latest = await prisma.pluginConnection.findUnique({ where: { id: row.id } });
        if (latest?.status === 'connected' && latest.credentialEnc) return latest;
      }
      throw new Error('OAuth connection requires reconnect');
    }
    await prisma.pluginConnection.updateMany({ where: { id: row.id, status: 'connected', credentialVersion: row.credentialVersion }, data: { lastError: 'OAuth provider is temporarily unavailable' } });
    throw new Error(refreshError.message);
  }).finally(() => refreshes.delete(row.id));
  refreshes.set(row.id, operation); return operation;
}

export interface RedactedPluginConnection {
  id: string; pluginId: string; campaignId: string; ownerType: string; ownerId: string;
  authType: string; status: string; accountLabel: string | null; scopes: string[];
  expiresAt: string | null; lastError: string | null; updatedAt: string;
}

export function redactConnection(row: PluginConnection): RedactedPluginConnection {
  return {
    id: row.id, pluginId: row.pluginId, campaignId: row.campaignId,
    ownerType: row.ownerType, ownerId: row.ownerId, authType: row.authType,
    status: row.status, accountLabel: row.accountLabel,
    scopes: Array.isArray(row.scopes) ? row.scopes.filter((v): v is string => typeof v === 'string') : [],
    expiresAt: row.expiresAt?.toISOString() ?? null, lastError: row.lastError,
    updatedAt: row.updatedAt.toISOString(),
  };
}

export async function listPluginConnections(pluginId: string, campaignId: string, viewerId: string, _isOwner: boolean) {
  const rows = await prisma.pluginConnection.findMany({
    where: { pluginId, campaignId, OR: [{ ownerType: 'campaign' }, { ownerType: 'user', ownerId: viewerId }] },
    orderBy: { updatedAt: 'desc' },
  });
  return rows.map(redactConnection);
}

export async function putStaticConnection(input: {
  pluginId: string; campaignId: string; ownerType: ConnectionOwnerType; ownerId: string;
  value: string; accountLabel?: string;
}): Promise<RedactedPluginConnection> {
  const provider = getConnectionProvider(input.pluginId);
  if (!provider || provider.auth.type === 'oauth2') throw new Error('Provider does not accept a static credential');
  if (!provider.ownership?.includes(input.ownerType)) throw new Error('Provider does not support this owner type');
  const value = input.value.trim();
  if (!value || value.length > 8192) throw new Error('Credential must be between 1 and 8192 characters');
  const credential: Credential = provider.auth.type === 'apiKey' ? { apiKey: value } : { token: value };
  const row = await prisma.pluginConnection.upsert({
    where: { pluginId_campaignId_ownerType_ownerId: { pluginId: input.pluginId, campaignId: input.campaignId, ownerType: input.ownerType, ownerId: input.ownerId } },
    create: { pluginId: input.pluginId, campaignId: input.campaignId, ownerType: input.ownerType, ownerId: input.ownerId, authType: provider.auth.type, status: 'connected', credentialEnc: encryptSecretOrDevStore(JSON.stringify(credential)), accountLabel: input.accountLabel?.trim().slice(0, 160) || null },
    update: { authType: provider.auth.type, status: 'connected', credentialEnc: encryptSecretOrDevStore(JSON.stringify(credential)), credentialVersion: { increment: 1 }, accountLabel: input.accountLabel?.trim().slice(0, 160) || null, expiresAt: null, lastError: null },
  });
  return redactConnection(row);
}

export async function disconnectPluginConnection(id: string, pluginId: string, campaignId: string): Promise<RedactedPluginConnection> {
  const existing = await prisma.pluginConnection.findFirst({ where: { id, pluginId, campaignId } });
  if (!existing) throw new Error('Connection not found');
  await prisma.$transaction([
    prisma.pluginConnectionAuthState.deleteMany({ where: { pluginId, campaignId, OR: [{ connectionId: id }, { ownerType: existing.ownerType, ownerId: existing.ownerId }] } }),
    prisma.pluginConnection.update({ where: { id }, data: { credentialEnc: null, credentialVersion: { increment: 1 }, status: 'disconnected', expiresAt: null, lastError: null } }),
  ]);
  const row = await prisma.pluginConnection.findUniqueOrThrow({ where: { id } });
  return redactConnection(row);
}

export async function revokePluginConnectionBestEffort(id: string, pluginId: string, campaignId: string, allowedOrigins: string[]): Promise<void> {
  const row = await prisma.pluginConnection.findFirst({ where: { id, pluginId, campaignId } });
  const provider = getConnectionProvider(pluginId);
  if (!row?.credentialEnc || !provider || provider.auth.type !== 'oauth2' || !provider.auth.revocationUrl) return;
  try {
    const credential = JSON.parse(decryptSecretOrDevStore(row.credentialEnc)) as Credential;
    const token = credential.refreshToken ?? credential.accessToken; if (!token) return;
    const client = await prisma.pluginOAuthClient.findUnique({ where: { pluginId } }); if (!client) return;
    const params = new URLSearchParams({ token, client_id: client.clientId }); let authorization: string | undefined;
    if (provider.auth.clientAuth === 'basic' && client.clientSecretEnc) { authorization = `Basic ${Buffer.from(`${client.clientId}:${decryptSecretOrDevStore(client.clientSecretEnc)}`).toString('base64')}`; params.delete('client_id'); }
    else if (provider.auth.clientAuth === 'body' && client.clientSecretEnc) params.set('client_secret', decryptSecretOrDevStore(client.clientSecretEnc));
    await fetchOAuthRemote(new URL(provider.auth.revocationUrl), { allowedOrigins, method: 'POST', body: params.toString(), authorization });
  } catch { /* Disconnect is local-authoritative; upstream revocation is best effort. */ }
}

async function selectConnection(pluginId: string, campaignId: string, userId: string, connectionId?: string) {
  if (connectionId) return prisma.pluginConnection.findFirst({ where: { id: connectionId, pluginId, campaignId, status: 'connected', OR: [{ ownerType: 'campaign' }, { ownerType: 'user', ownerId: userId }] } });
  if (userId) {
    const personal = await prisma.pluginConnection.findUnique({ where: { pluginId_campaignId_ownerType_ownerId: { pluginId, campaignId, ownerType: 'user', ownerId: userId } } });
    if (personal?.status === 'connected') return personal;
  }
  return prisma.pluginConnection.findUnique({ where: { pluginId_campaignId_ownerType_ownerId: { pluginId, campaignId, ownerType: 'campaign', ownerId: campaignId } } });
}

export function createConnectionsApi(input: { pluginId: string; campaignId?: string; permissions: string[]; outboundOrigins: string[] }) {
  const assertReady = async (req: Request) => {
    const invocation = requirePluginConnectionInvocation(req);
    const campaignId = input.campaignId ?? invocation.campaignId;
    if (input.campaignId && invocation.campaignId !== input.campaignId) throw new Error('Connection access is outside the campaign jail');
    if (!input.permissions.includes('connections:use') || !input.permissions.includes('network:fetch')) throw new Error(`Plugin "${input.pluginId}" requires connections:use and network:fetch permissions`);
    if (!await isCampaignPluginEnabled(campaignId, input.pluginId)) throw new Error('Plugin is not enabled for this campaign');
    return { campaignId, userId: invocation.userId };
  };
  return {
    async select(req: Request, options: { connectionId?: string } = {}) {
      const invocation = await assertReady(req);
      const row = await selectConnection(input.pluginId, invocation.campaignId, invocation.userId, options.connectionId);
      return row ? redactConnection(row) : null;
    },
    async request(req: Request, url: string, options: AuthenticatedRemoteFetchOptions & { connectionId?: string } ) {
      const invocation = await assertReady(req);
      let row = await selectConnection(input.pluginId, invocation.campaignId, invocation.userId, options.connectionId);
      if (!row?.credentialEnc || row.status !== 'connected') throw new Error('No connected credential is available');
      const provider = getConnectionProvider(input.pluginId);
      if (!provider) throw new Error('Connection provider is not registered');
      if (provider.auth.type === 'oauth2' && row.expiresAt && row.expiresAt <= new Date()) row = await refreshOAuth(row, input.outboundOrigins);
      const send = async (active: PluginConnection) => {
        if (!await isCampaignPluginEnabled(invocation.campaignId, input.pluginId)) throw new Error('Plugin is not enabled for this campaign');
        const credential = JSON.parse(decryptSecretOrDevStore(active.credentialEnc!)) as Credential;
        const injected = provider.auth.type === 'apiKey'
          ? { name: provider.auth.headerName, value: `${provider.auth.prefix ?? ''}${credential.apiKey ?? ''}` }
          : { name: 'Authorization', value: `Bearer ${provider.auth.type === 'oauth2' ? credential.accessToken ?? '' : credential.token ?? ''}` };
        return fetchAuthenticatedRemote(new URL(url), injected, { ...options, allowedOrigins: provider.resourceOrigins });
      };
      let response = await send(row);
      if (response.status === 401 && provider.auth.type === 'oauth2') { row = await refreshOAuth(row, input.outboundOrigins); response = await send(row); }
      return response;
    },
  };
}

export type PluginConnectionsApi = ReturnType<typeof createConnectionsApi>;
