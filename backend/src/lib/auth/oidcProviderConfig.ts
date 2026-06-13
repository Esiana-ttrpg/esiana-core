import * as client from 'openid-client';
import type { IdentityProvider } from '@prisma/client';
import { env } from '../../config/env.js';
import { decryptSecretOrDevStore } from '../crypto/secretBox.js';
import { resolveIssuerUrl } from './providerTemplates.js';

export async function buildOidcClientConfig(
  provider: IdentityProvider,
): Promise<client.Configuration> {
  const issuer = resolveIssuerUrl(provider);
  if (!issuer) {
    throw new Error('Identity provider issuer URL is not configured');
  }
  const clientSecret = decryptSecretOrDevStore(provider.clientSecretEnc);
  return client.discovery(
    new URL(issuer),
    provider.clientId,
    clientSecret,
  );
}

export function buildOidcRedirectUri(providerId: string): string {
  const base = env.backendPublicOrigin.replace(/\/+$/, '');
  return `${base}/api/auth/oidc/${encodeURIComponent(providerId)}/callback`;
}
