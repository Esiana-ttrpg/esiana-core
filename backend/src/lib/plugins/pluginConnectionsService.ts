import type { PluginConnection } from '@prisma/client';
import type { Request } from 'express';
import { prisma } from '../prisma.js';
import { decryptSecretOrDevStore, encryptSecretOrDevStore } from '../crypto/secretBox.js';
import { fetchAuthenticatedRemote, fetchOAuthRemote, type AuthenticatedRemoteFetchOptions } from '../networkFetch.js';
import { isCampaignPluginEnabled } from '../campaignPlugins.js';
import { getConnectionProvider } from './connectionProviderRegistry.js';
import { requirePluginConnectionInvocation } from './pluginConnectionInvocation.js';

type Credential = { accessToken?: string; refreshToken?: string; apiKey?: string; token?: string };
const refreshes = new Map<string, Promise<PluginConnection>>();
class OAuthRefreshError extends Error { constructor(message: string, readonly reconnectRequired: boolean) { super(message); } }
export const isTerminalOAuthRefreshFailure = (status: number, code: unknown) => status === 400 && code === 'invalid_grant';

async function refreshOAuth(row: PluginConnection, campaignId: string, allowedOrigins: string[]): Promise<PluginConnection> {
  const active = refreshes.get(row.pluginId); if (active) return active;
  const generation = row.credentialVersion;
  const operation = (async () => {
    const latest = await prisma.pluginConnection.findUnique({ where: { pluginId: row.pluginId } });
    if (!latest?.credentialEnc || latest.status !== 'connected') throw new OAuthRefreshError('OAuth connection is no longer connected', false);
    if (latest.credentialVersion !== generation) return latest;
    if (!await isCampaignPluginEnabled(campaignId, row.pluginId)) throw new OAuthRefreshError('Plugin is not enabled for this campaign', false);
    const provider = getConnectionProvider(row.pluginId);
    if (!provider || provider.auth.type !== 'oauth2') throw new OAuthRefreshError('OAuth connection cannot be refreshed', false);
    const credential = JSON.parse(decryptSecretOrDevStore(latest.credentialEnc)) as Credential;
    if (!credential.refreshToken) throw new OAuthRefreshError('OAuth connection requires reconnect', true);
    const client = await prisma.pluginOAuthClient.findUnique({ where: { pluginId: row.pluginId } });
    if (!client) throw new OAuthRefreshError('OAuth client is not configured', false);
    const params = new URLSearchParams({ grant_type: 'refresh_token', refresh_token: credential.refreshToken, client_id: client.clientId });
    let authorization: string | undefined;
    if (provider.auth.clientAuth === 'basic') {
      if (!client.clientSecretEnc) throw new OAuthRefreshError('OAuth client secret is not configured', false);
      authorization = `Basic ${Buffer.from(`${client.clientId}:${decryptSecretOrDevStore(client.clientSecretEnc)}`).toString('base64')}`; params.delete('client_id');
    } else if (provider.auth.clientAuth === 'body' && client.clientSecretEnc) params.set('client_secret', decryptSecretOrDevStore(client.clientSecretEnc));
    const response = await fetchOAuthRemote(new URL(provider.auth.tokenUrl), { allowedOrigins, method: 'POST', body: params.toString(), authorization });
    let tokens: { access_token?: unknown; refresh_token?: unknown; expires_in?: unknown; error?: unknown } = {};
    try { tokens = JSON.parse(response.body.toString('utf8')) as typeof tokens; } catch { /* classified below */ }
    if (response.status < 200 || response.status >= 300 || typeof tokens.access_token !== 'string') throw new OAuthRefreshError('OAuth refresh failed', isTerminalOAuthRefreshFailure(response.status, tokens.error));
    const changed = await prisma.pluginConnection.updateMany({ where: { pluginId: row.pluginId, status: 'connected', credentialVersion: generation }, data: { credentialEnc: encryptSecretOrDevStore(JSON.stringify({ accessToken: tokens.access_token, refreshToken: typeof tokens.refresh_token === 'string' ? tokens.refresh_token : credential.refreshToken })), credentialVersion: { increment: 1 }, expiresAt: typeof tokens.expires_in === 'number' ? new Date(Date.now() + Math.max(0, tokens.expires_in - 30) * 1000) : null, lastError: null } });
    const settled = await prisma.pluginConnection.findUnique({ where: { pluginId: row.pluginId } });
    if (!changed.count) {
      if (settled?.status === 'connected' && settled.credentialEnc && settled.credentialVersion !== generation) return settled;
      throw new OAuthRefreshError('OAuth connection changed while refreshing', false);
    }
    return settled!;
  })().catch(async (error: unknown) => {
    const failure = error instanceof OAuthRefreshError ? error : new OAuthRefreshError('OAuth provider is temporarily unavailable', false);
    if (failure.reconnectRequired) {
      const changed = await prisma.pluginConnection.updateMany({ where: { pluginId: row.pluginId, status: 'connected', credentialVersion: generation }, data: { status: 'reconnect_required', lastError: 'OAuth refresh was rejected' } });
      if (!changed.count) { const latest = await prisma.pluginConnection.findUnique({ where: { pluginId: row.pluginId } }); if (latest?.status === 'connected' && latest.credentialEnc) return latest; }
      throw new Error('OAuth connection requires reconnect');
    }
    await prisma.pluginConnection.updateMany({ where: { pluginId: row.pluginId, status: 'connected', credentialVersion: generation }, data: { lastError: 'OAuth provider is temporarily unavailable' } });
    throw new Error(failure.message);
  }).finally(() => refreshes.delete(row.pluginId));
  refreshes.set(row.pluginId, operation); return operation;
}

export interface RedactedPluginConnection { pluginId: string; authType: string; status: string; accountLabel: string | null; scopes: string[]; expiresAt: string | null; lastError: string | null; updatedAt: string }
export function redactConnection(row: PluginConnection): RedactedPluginConnection { return { pluginId: row.pluginId, authType: row.authType, status: row.status, accountLabel: row.accountLabel, scopes: Array.isArray(row.scopes) ? row.scopes.filter((v): v is string => typeof v === 'string') : [], expiresAt: row.expiresAt?.toISOString() ?? null, lastError: row.lastError, updatedAt: row.updatedAt.toISOString() }; }
export async function getPluginConnection(pluginId: string) { const row = await prisma.pluginConnection.findUnique({ where: { pluginId } }); return row ? redactConnection(row) : null; }

export async function putStaticConnection(input: { pluginId: string; value: string; accountLabel?: string }): Promise<RedactedPluginConnection> {
  const provider = getConnectionProvider(input.pluginId);
  if (!provider || provider.auth.type === 'oauth2') throw new Error('Provider does not accept a static credential');
  const value = input.value.trim(); if (!value || value.length > 8192) throw new Error('Credential must be between 1 and 8192 characters');
  const credential: Credential = provider.auth.type === 'apiKey' ? { apiKey: value } : { token: value };
  const encrypted = encryptSecretOrDevStore(JSON.stringify(credential));
  const row = await prisma.pluginConnection.upsert({ where: { pluginId: input.pluginId }, create: { pluginId: input.pluginId, authType: provider.auth.type, status: 'connected', credentialEnc: encrypted, credentialVersion: 1, accountLabel: input.accountLabel?.trim().slice(0, 160) || null }, update: { authType: provider.auth.type, status: 'connected', credentialEnc: encrypted, credentialVersion: { increment: 1 }, accountLabel: input.accountLabel?.trim().slice(0, 160) || null, expiresAt: null, lastError: null } });
  return redactConnection(row);
}

export async function disconnectPluginConnection(pluginId: string): Promise<RedactedPluginConnection> {
  if (!await prisma.pluginConnection.findUnique({ where: { pluginId } })) throw new Error('Connection not found');
  await prisma.$transaction([prisma.pluginConnectionAuthState.deleteMany({ where: { pluginId } }), prisma.pluginConnection.update({ where: { pluginId }, data: { credentialEnc: null, credentialVersion: { increment: 1 }, status: 'disconnected', expiresAt: null, lastError: null } })]);
  return redactConnection(await prisma.pluginConnection.findUniqueOrThrow({ where: { pluginId } }));
}

export async function revokePluginConnectionBestEffort(pluginId: string, allowedOrigins: string[]): Promise<void> {
  const row = await prisma.pluginConnection.findUnique({ where: { pluginId } }); const provider = getConnectionProvider(pluginId);
  if (!row?.credentialEnc || !provider || provider.auth.type !== 'oauth2' || !provider.auth.revocationUrl) return;
  try {
    const credential = JSON.parse(decryptSecretOrDevStore(row.credentialEnc)) as Credential; const token = credential.refreshToken ?? credential.accessToken; if (!token) return;
    const client = await prisma.pluginOAuthClient.findUnique({ where: { pluginId } }); if (!client) return;
    const params = new URLSearchParams({ token, client_id: client.clientId }); let authorization: string | undefined;
    if (provider.auth.clientAuth === 'basic' && client.clientSecretEnc) { authorization = `Basic ${Buffer.from(`${client.clientId}:${decryptSecretOrDevStore(client.clientSecretEnc)}`).toString('base64')}`; params.delete('client_id'); }
    else if (provider.auth.clientAuth === 'body' && client.clientSecretEnc) params.set('client_secret', decryptSecretOrDevStore(client.clientSecretEnc));
    await fetchOAuthRemote(new URL(provider.auth.revocationUrl), { allowedOrigins, method: 'POST', body: params.toString(), authorization });
  } catch { /* Local disconnect remains authoritative. */ }
}

export function createConnectionsApi(input: { pluginId: string; campaignId?: string; permissions: string[]; outboundOrigins: string[] }) {
  const assertReady = async (req: Request) => { const invocation = requirePluginConnectionInvocation(req); const campaignId = input.campaignId ?? invocation.campaignId; if (input.campaignId && invocation.campaignId !== input.campaignId) throw new Error('Connection access is outside the campaign jail'); if (!input.permissions.includes('connections:use') || !input.permissions.includes('network:fetch')) throw new Error(`Plugin "${input.pluginId}" requires connections:use and network:fetch permissions`); if (!await isCampaignPluginEnabled(campaignId, input.pluginId)) throw new Error('Plugin is not enabled for this campaign'); return campaignId; };
  return {
    async select(req: Request) { await assertReady(req); const row = await prisma.pluginConnection.findUnique({ where: { pluginId: input.pluginId } }); return row ? redactConnection(row) : null; },
    async request(req: Request, url: string, options: AuthenticatedRemoteFetchOptions) {
      const campaignId = await assertReady(req); let row = await prisma.pluginConnection.findUnique({ where: { pluginId: input.pluginId } });
      if (!row?.credentialEnc || row.status !== 'connected') throw new Error('No connected credential is available');
      const provider = getConnectionProvider(input.pluginId); if (!provider) throw new Error('Connection provider is not registered');
      if (provider.auth.type === 'oauth2' && row.expiresAt && row.expiresAt <= new Date()) row = await refreshOAuth(row, campaignId, input.outboundOrigins);
      const send = async (activeRow: PluginConnection) => { if (!await isCampaignPluginEnabled(campaignId, input.pluginId)) throw new Error('Plugin is not enabled for this campaign'); const credential = JSON.parse(decryptSecretOrDevStore(activeRow.credentialEnc!)) as Credential; const injected = provider.auth.type === 'apiKey' ? { name: provider.auth.headerName, value: `${provider.auth.prefix ?? ''}${credential.apiKey ?? ''}` } : { name: 'Authorization', value: `Bearer ${provider.auth.type === 'oauth2' ? credential.accessToken ?? '' : credential.token ?? ''}` }; return fetchAuthenticatedRemote(new URL(url), injected, { ...options, allowedOrigins: provider.resourceOrigins }); };
      let response = await send(row); if (response.status === 401 && provider.auth.type === 'oauth2') { row = await refreshOAuth(row, campaignId, input.outboundOrigins); response = await send(row); } return response;
    },
  };
}
export type PluginConnectionsApi = ReturnType<typeof createConnectionsApi>;
