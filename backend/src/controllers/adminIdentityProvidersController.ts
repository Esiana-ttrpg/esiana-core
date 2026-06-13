import type { Response } from 'express';
import type { AuthenticatedRequest } from '../middleware/auth.js';
import { prisma } from '../lib/prisma.js';
import {
  applyProviderTemplate,
  isProviderTemplate,
  resolveIssuerUrl,
} from '../lib/auth/providerTemplates.js';
import {
  encryptSecretOrDevStore,
  isSecretBoxConfigured,
} from '../lib/crypto/secretBox.js';
import { getOidcCallbackUrlTemplate } from './oidcAuthController.js';
import { paramString } from '../lib/paramString.js';

const ID_SLUG = /^[a-z][a-z0-9-]{0,62}$/;

function serializeProvider(row: {
  id: string;
  template: string;
  enabled: boolean;
  displayName: string;
  issuerUrl: string;
  clientId: string;
  clientSecretEnc: string;
  scopes: string;
  tenantId: string | null;
  groupsClaim: string | null;
  groupRoleMappings: unknown;
  sortOrder: number;
  createdAt: Date;
  updatedAt: Date;
}) {
  return {
    id: row.id,
    template: row.template,
    enabled: row.enabled,
    displayName: row.displayName,
    issuerUrl: row.issuerUrl,
    resolvedIssuerUrl: resolveIssuerUrl(row),
    clientId: row.clientId,
    clientSecretConfigured: Boolean(row.clientSecretEnc?.length),
    scopes: row.scopes,
    tenantId: row.tenantId,
    groupsClaim: row.groupsClaim,
    groupRoleMappings: row.groupRoleMappings ?? {},
    sortOrder: row.sortOrder,
    redirectUri: getOidcCallbackUrlTemplate(row.id),
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

export async function listAdminIdentityProviders(
  _req: AuthenticatedRequest,
  res: Response,
): Promise<void> {
  const rows = await prisma.identityProvider.findMany({
    orderBy: [{ sortOrder: 'asc' }, { displayName: 'asc' }],
  });
  res.json({
    providers: rows.map(serializeProvider),
    secretEncryptionConfigured: isSecretBoxConfigured(),
  });
}

export async function putAdminIdentityProvider(
  req: AuthenticatedRequest,
  res: Response,
): Promise<void> {
  const id = paramString(req.params.providerId).toLowerCase();
  if (!id || !ID_SLUG.test(id)) {
    res.status(400).json({
      error:
        'Provider id must be lowercase alphanumeric with hyphens (e.g. authentik, corp-sso)',
    });
    return;
  }

  const body = req.body as Record<string, unknown>;
  const template =
    typeof body.template === 'string' && isProviderTemplate(body.template)
      ? body.template
      : 'oidc';

  const draft = applyProviderTemplate(template, {
    template,
    displayName:
      typeof body.displayName === 'string' ? body.displayName : undefined,
    issuerUrl: typeof body.issuerUrl === 'string' ? body.issuerUrl : undefined,
    scopes: typeof body.scopes === 'string' ? body.scopes : undefined,
    tenantId: typeof body.tenantId === 'string' ? body.tenantId : undefined,
    groupsClaim:
      body.groupsClaim === null
        ? null
        : typeof body.groupsClaim === 'string'
          ? body.groupsClaim
          : undefined,
  });

  const displayName = draft.displayName?.trim();
  const issuerUrl = draft.issuerUrl?.trim() ?? '';
  const clientId =
    typeof body.clientId === 'string' ? body.clientId.trim() : '';
  const clientSecret =
    typeof body.clientSecret === 'string' ? body.clientSecret : undefined;
  const enabled = body.enabled === true;
  const sortOrder =
    typeof body.sortOrder === 'number' && Number.isFinite(body.sortOrder)
      ? Math.floor(body.sortOrder)
      : 0;

  if (!displayName) {
    res.status(400).json({ error: 'Display name is required' });
    return;
  }
  if (!issuerUrl && template !== 'azure') {
    res.status(400).json({ error: 'Issuer URL is required' });
    return;
  }
  if (template === 'azure' && !issuerUrl && !draft.tenantId?.trim()) {
    res.status(400).json({ error: 'Tenant ID or issuer URL is required for Azure' });
    return;
  }
  if (!clientId) {
    res.status(400).json({ error: 'Client ID is required' });
    return;
  }

  const existing = await prisma.identityProvider.findUnique({ where: { id } });

  let clientSecretEnc = existing?.clientSecretEnc ?? '';
  if (clientSecret?.trim()) {
    clientSecretEnc = encryptSecretOrDevStore(clientSecret.trim());
  } else if (!existing) {
    res.status(400).json({ error: 'Client secret is required for new providers' });
    return;
  }

  const groupRoleMappings =
    body.groupRoleMappings && typeof body.groupRoleMappings === 'object'
      ? body.groupRoleMappings
      : existing?.groupRoleMappings ?? {};

  const data = {
    template,
    enabled,
    displayName,
    issuerUrl: issuerUrl || (draft.issuerUrl ?? ''),
    clientId,
    clientSecretEnc,
    scopes: draft.scopes ?? 'openid profile email',
    tenantId: draft.tenantId?.trim() || null,
    groupsClaim: draft.groupsClaim ?? null,
    groupRoleMappings,
    sortOrder,
  };

  const row = await prisma.identityProvider.upsert({
    where: { id },
    create: { id, ...data },
    update: data,
  });

  res.json({ provider: serializeProvider(row) });
}

export async function deleteAdminIdentityProvider(
  req: AuthenticatedRequest,
  res: Response,
): Promise<void> {
  const id = paramString(req.params.providerId);
  if (!id) {
    res.status(400).json({ error: 'Provider id is required' });
    return;
  }

  const linked = await prisma.account.count({ where: { provider: id } });
  if (linked > 0) {
    res.status(409).json({
      error:
        'Cannot delete a provider with linked accounts. Disable it instead, or remove linked accounts first.',
    });
    return;
  }

  await prisma.identityProvider.delete({ where: { id } }).catch(() => null);
  res.json({ ok: true });
}
