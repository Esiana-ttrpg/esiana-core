import { createHash, randomBytes } from 'node:crypto';
import type { Response } from 'express';
import type { AuthenticatedRequest } from '../middleware/auth.js';
import { env } from '../config/env.js';
import { prisma } from '../lib/prisma.js';
import { decryptSecretOrDevStore, encryptSecretOrDevStore } from '../lib/crypto/secretBox.js';
import { getConnectionProvider } from '../lib/plugins/connectionProviderRegistry.js';
import { fetchOAuthRemote } from '../lib/networkFetch.js';
import { getPluginManifest } from '../plugins/pluginManager.js';
import { UserRoles } from '../types/domain.js';

const hash = (value: string) => createHash('sha256').update(value).digest('base64url');
const callbackUri = () => `${env.backendPublicOrigin.replace(/\/$/, '')}/api/plugin-connections/oauth/callback`;
export function safePluginReturnTo(value: unknown): string {
  if (typeof value !== 'string' || value.length > 1024 || !value.startsWith('/') || value.startsWith('//') || value.includes('\\')) return '/';
  try { const base = new URL(env.frontendOrigin); const resolved = new URL(value, base); return resolved.origin === base.origin ? `${resolved.pathname}${resolved.search}${resolved.hash}` : '/'; } catch { return '/'; }
}
export async function startAdminPluginOAuth(req: AuthenticatedRequest, res: Response): Promise<void> {
  const pluginId = String(req.params.pluginId ?? ''); const provider = getConnectionProvider(pluginId);
  if (!provider || provider.auth.type !== 'oauth2') { res.status(404).json({ error: 'OAuth provider not found' }); return; }
  const client = await prisma.pluginOAuthClient.findUnique({ where: { pluginId } });
  if (!client) { res.status(409).json({ error: 'OAuth client is not configured' }); return; }
  const manifest = getPluginManifest(pluginId); const authorizationUrl = new URL(provider.auth.authorizationUrl);
  if (!manifest?.outboundOrigins?.includes(authorizationUrl.origin)) { res.status(409).json({ error: 'OAuth authorization origin is not declared by the plugin' }); return; }
  const state = randomBytes(32).toString('base64url'); const verifier = randomBytes(48).toString('base64url');
  const existing = await prisma.pluginConnection.upsert({ where: { pluginId }, create: { pluginId, authType: 'oauth2', status: 'disconnected' }, update: {} });
  await prisma.pluginConnectionAuthState.deleteMany({ where: { pluginId } });
  await prisma.pluginConnectionAuthState.create({ data: { stateHash: hash(state), pluginId, initiatorId: req.user!.id, connectionVersion: existing.credentialVersion, codeVerifier: encryptSecretOrDevStore(verifier), returnTo: safePluginReturnTo((req.body as { returnTo?: unknown }).returnTo), expiresAt: new Date(Date.now() + 10 * 60_000) } });
  authorizationUrl.searchParams.set('response_type', 'code'); authorizationUrl.searchParams.set('client_id', client.clientId); authorizationUrl.searchParams.set('redirect_uri', callbackUri()); authorizationUrl.searchParams.set('scope', provider.auth.scopes.join(' ')); authorizationUrl.searchParams.set('state', state); authorizationUrl.searchParams.set('code_challenge', hash(verifier)); authorizationUrl.searchParams.set('code_challenge_method', 'S256');
  res.json({ authorizationUrl: authorizationUrl.toString() });
}
export async function pluginOAuthCallback(req: AuthenticatedRequest, res: Response): Promise<void> {
  const state = typeof req.query.state === 'string' ? req.query.state : ''; const code = typeof req.query.code === 'string' ? req.query.code : '';
  const authState = state ? await prisma.pluginConnectionAuthState.findUnique({ where: { stateHash: hash(state) } }) : null;
  if (!authState || authState.expiresAt <= new Date() || authState.initiatorId !== req.user!.id || req.user!.role !== UserRoles.SYSTEM_ADMIN || !code) { res.status(400).send('Invalid or expired OAuth connection state'); return; }
  await prisma.pluginConnectionAuthState.delete({ where: { id: authState.id } });
  const provider = getConnectionProvider(authState.pluginId); const client = await prisma.pluginOAuthClient.findUnique({ where: { pluginId: authState.pluginId } }); const manifest = getPluginManifest(authState.pluginId);
  if (!provider || provider.auth.type !== 'oauth2' || !client || !manifest) { res.status(409).send('OAuth provider is unavailable'); return; }
  const params = new URLSearchParams({ grant_type: 'authorization_code', code, redirect_uri: callbackUri(), client_id: client.clientId, code_verifier: decryptSecretOrDevStore(authState.codeVerifier) }); let authorization: string | undefined;
  if (provider.auth.clientAuth === 'basic') { if (!client.clientSecretEnc) { res.status(409).send('OAuth client secret is not configured'); return; } authorization = `Basic ${Buffer.from(`${client.clientId}:${decryptSecretOrDevStore(client.clientSecretEnc)}`).toString('base64')}`; params.delete('client_id'); }
  else if (provider.auth.clientAuth === 'body' && client.clientSecretEnc) params.set('client_secret', decryptSecretOrDevStore(client.clientSecretEnc));
  try {
    const response = await fetchOAuthRemote(new URL(provider.auth.tokenUrl), { allowedOrigins: manifest.outboundOrigins ?? [], method: 'POST', body: params.toString(), authorization });
    const tokens = JSON.parse(response.body.toString('utf8')) as { access_token?: unknown; refresh_token?: unknown; expires_in?: unknown; scope?: unknown };
    if (response.status < 200 || response.status >= 300 || typeof tokens.access_token !== 'string') throw new Error('token exchange rejected');
    const credentialEnc = encryptSecretOrDevStore(JSON.stringify({ accessToken: tokens.access_token, refreshToken: typeof tokens.refresh_token === 'string' ? tokens.refresh_token : undefined }));
    const changed = await prisma.pluginConnection.updateMany({ where: { pluginId: authState.pluginId, credentialVersion: authState.connectionVersion ?? 0 }, data: { authType: 'oauth2', status: 'connected', credentialEnc, credentialVersion: { increment: 1 }, expiresAt: typeof tokens.expires_in === 'number' ? new Date(Date.now() + Math.max(0, tokens.expires_in - 30) * 1000) : null, scopes: typeof tokens.scope === 'string' ? tokens.scope.split(/\s+/) : provider.auth.scopes, lastError: null } });
    if (!changed.count) { res.status(409).send('OAuth connection changed while authorization was in progress'); return; }
    res.redirect(new URL(safePluginReturnTo(authState.returnTo), env.frontendOrigin).toString());
  } catch { res.status(502).send('OAuth token exchange failed'); }
}
